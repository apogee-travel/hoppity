# @apogeelabs/hoppity-contracts — LLM Usage Guide

Domain-centric messaging contracts for hoppity topology generation. Define events, commands, and RPC operations with Zod schemas, then derive deterministic RabbitMQ topology from those contracts.

## Imports

```typescript
import {
    defineDomain,
    buildServiceTopology,
    withOutboundExchange,
} from "@apogeelabs/hoppity-contracts";

import type {
    EventContract,
    CommandContract,
    RpcContract,
    DomainDefinition,
    DomainDefinitionInput,
    EventsDefinition,
    CommandsDefinition,
    RpcDefinition,
    EventContracts,
    CommandContracts,
    RpcContracts,
    HandlerOptions,
    SubscriptionOptions,
    TopologyBuilder,
} from "@apogeelabs/hoppity-contracts";
```

## Function Signatures

### defineDomain

```typescript
function defineDomain<
    TDomain extends string,
    TEvents extends EventsDefinition,
    TCommands extends CommandsDefinition,
    TRpc extends RpcDefinition,
>(
    domainName: TDomain,
    definition: DomainDefinitionInput<TEvents, TCommands, TRpc>
): DomainDefinition<TDomain, TEvents, TCommands, TRpc>;
```

Creates typed contract objects from Zod schemas. Contracts are pure data — they carry metadata and derived topology properties but have no RabbitMQ knowledge.

### buildServiceTopology

```typescript
function buildServiceTopology(
    initialTopology: BrokerConfig,
    serviceName: string,
    configure: (builder: TopologyBuilder) => void
): BrokerConfig;
```

Materializes service role declarations into Rascal topology. The initial topology is `structuredClone`d — never mutated.

### withOutboundExchange

```typescript
const withOutboundExchange: (serviceName: string) => MiddlewareFunction;
```

Hoppity middleware that inserts a per-service fanout exchange. Rewrites all publications to target the outbound, adds exchange-to-exchange bindings to domain exchanges. Publisher-side only — subscriptions are untouched.

## Type Signatures

```typescript
// Contract types — all carry derived RabbitMQ metadata
interface EventContract<TDomain, TName, TSchema extends ZodTypeAny> {
    _type: "event";
    _domain: TDomain;
    _name: TName;
    schema: TSchema;
    exchange: string; // Domain exchange name
    routingKey: string; // Topic routing key
    publicationName: string; // Rascal publication name
    subscriptionName: string; // Rascal subscription name
}

interface CommandContract<TDomain, TName, TSchema extends ZodTypeAny> {
    _type: "command";
    _domain: TDomain;
    _name: TName;
    schema: TSchema;
    exchange: string;
    routingKey: string;
    publicationName: string;
    subscriptionName: string;
}

interface RpcContract<TDomain, TName, TRequest extends ZodTypeAny, TResponse extends ZodTypeAny> {
    _type: "rpc";
    _domain: TDomain;
    _name: TName;
    requestSchema: TRequest;
    responseSchema: TResponse;
    exchange: string; // {domain}_rpc
    routingKey: string;
    publicationName: string;
    subscriptionName: string;
}

// Input types
type EventsDefinition = Record<string, ZodTypeAny>;
type CommandsDefinition = Record<string, ZodTypeAny>;
type RpcDefinition = Record<string, { request: ZodTypeAny; response: ZodTypeAny }>;

interface DomainDefinitionInput<TEvents, TCommands, TRpc> {
    events?: TEvents;
    commands?: TCommands;
    rpc?: TRpc;
}

// Output type
interface DomainDefinition<TDomain, TEvents, TCommands, TRpc> {
    domain: TDomain;
    events: EventContracts<TDomain, TEvents>;
    commands: CommandContracts<TDomain, TCommands>;
    rpc: RpcContracts<TDomain, TRpc>;
}

// Queue/subscription options
interface HandlerOptions {
    queueType?: "quorum" | "classic"; // default: "quorum"
    redeliveries?: { limit: number }; // default: { limit: 5 }
    deadLetter?: { exchange: string; routingKey?: string };
}
type SubscriptionOptions = HandlerOptions;

// Builder interface (inside buildServiceTopology callback)
interface TopologyBuilder {
    publishesEvent(contract: EventContract): TopologyBuilder;
    subscribesToEvent(contract: EventContract, options?: SubscriptionOptions): TopologyBuilder;
    sendsCommand(contract: CommandContract): TopologyBuilder;
    handlesCommand(contract: CommandContract, options?: HandlerOptions): TopologyBuilder;
    callsRpc(contract: RpcContract): TopologyBuilder;
    respondsToRpc(contract: RpcContract, options?: HandlerOptions): TopologyBuilder;
}
```

## Naming Convention

All artifact names are mechanically derived — never hand-coded:

| Artifact     | Pattern                                        | Example                                             |
| ------------ | ---------------------------------------------- | --------------------------------------------------- |
| Exchange     | `{domain}` (events/commands) or `{domain}_rpc` | `donated_inventory`, `donated_inventory_rpc`        |
| Routing key  | `{domain}.{opType}.{snake_name}`               | `donated_inventory.event.created`                   |
| Publication  | `{domain}_{opType}_{snake_name}`               | `donated_inventory_event_created`                   |
| Subscription | `{domain}_{opType}_{snake_name}`               | `donated_inventory_event_created`                   |
| Queue        | `{service}_{domain}_{opType}_{snake_name}`     | `warehouse_donated_inventory_event_created`         |
| Binding      | `{queueName}_binding`                          | `warehouse_donated_inventory_event_created_binding` |

CamelCase operation names are automatically converted to snake_case.

## Usage Examples

### Define a domain and build topology

```typescript
import { defineDomain, buildServiceTopology } from "@apogeelabs/hoppity-contracts";
import { z } from "zod";

const Inventory = defineDomain("inventory", {
    events: {
        created: z.object({ id: z.string(), quantity: z.number() }),
    },
    commands: {
        reserve: z.object({ itemId: z.string(), qty: z.number() }),
    },
    rpc: {
        getPrice: {
            request: z.object({ itemId: z.string() }),
            response: z.object({ price: z.number() }),
        },
    },
});

const topology = buildServiceTopology(baseConfig, "warehouse", t => {
    t.publishesEvent(Inventory.events.created)
        .handlesCommand(Inventory.commands.reserve)
        .respondsToRpc(Inventory.rpc.getPrice);
});
```

### With outbound exchange middleware

```typescript
import hoppity from "@apogeelabs/hoppity";
import { buildServiceTopology, withOutboundExchange } from "@apogeelabs/hoppity-contracts";

const topology = buildServiceTopology(baseConfig, "warehouse", t => {
    t.publishesEvent(Inventory.events.created);
});

const broker = await hoppity.withTopology(topology).use(withOutboundExchange("warehouse")).build();
```

## How It Works

1. `defineDomain(name, schemas)` creates contract objects with derived RabbitMQ metadata (exchange names, routing keys, publication/subscription names). Contracts are pure data with no side effects.

2. `buildServiceTopology(config, service, callback)` clones the initial topology, runs the builder callback to accumulate declarations, then materializes them into Rascal topology artifacts (exchanges, queues, bindings, publications, subscriptions).

3. `withOutboundExchange(service)` is a hoppity middleware that rewrites publications to target a fanout exchange, with exchange-to-exchange bindings forwarding to domain exchanges.

## Gotchas

- ⚠️ **Events and commands share a domain exchange** — only RPC gets a separate `{domain}_rpc` exchange.
- ⚠️ **`callsRpc` does NOT create a reply queue** — that's handled by `@apogeelabs/hoppity-rpc`'s `withRpcSupport` middleware.
- ⚠️ **Queue names include the service name** — two services subscribing to the same event get separate queues (competing consumers within a service, independent delivery across services).
- ⚠️ **`buildServiceTopology` clones the input** — don't rely on reference equality between input and output.
- ⚠️ **`withOutboundExchange` is publisher-side only** — subscriptions and inbound queue bindings are untouched.
