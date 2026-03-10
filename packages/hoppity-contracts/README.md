# Hoppity Contracts

Domain-centric messaging contracts for hoppity topology generation.

Define your messaging contracts with Zod schemas, then let `hoppity-contracts` derive deterministic RabbitMQ topology — exchanges, queues, bindings, publications, and subscriptions — from those contracts. No more hand-wiring AMQP artifact names.

## Installation

```bash
npm install @apogeelabs/hoppity-contracts
```

**Peer dependencies:** `rascal@^20.1.1`, `zod@^3.22.0`

## Core Concepts

The package provides three main APIs that compose together:

1. **`defineDomain`** — Wrap Zod schemas into typed contracts (events, commands, RPCs)
2. **`buildServiceTopology`** — Declare what a service publishes/subscribes/handles and get a Rascal topology
3. **`withOutboundExchange`** — Hoppity middleware that inserts a per-service fanout exchange for tapping/auditing

## Usage

### Defining Domain Contracts

```typescript
import { defineDomain } from "@apogeelabs/hoppity-contracts";
import { z } from "zod";

const DonatedInventory = defineDomain("donated_inventory", {
    events: {
        created: z.object({ id: z.string(), quantity: z.number() }),
        retired: z.object({ id: z.string(), reason: z.string() }),
    },
    commands: {
        reserveItem: z.object({ itemId: z.string(), quantity: z.number() }),
    },
    rpc: {
        getQuote: {
            request: z.object({ itemId: z.string() }),
            response: z.object({ price: z.number(), currency: z.string() }),
        },
    },
});
```

Each contract carries derived RabbitMQ metadata:

| Contract                                | Exchange                | Routing Key                              |
| --------------------------------------- | ----------------------- | ---------------------------------------- |
| `DonatedInventory.events.created`       | `donated_inventory`     | `donated_inventory.event.created`        |
| `DonatedInventory.commands.reserveItem` | `donated_inventory`     | `donated_inventory.command.reserve_item` |
| `DonatedInventory.rpc.getQuote`         | `donated_inventory_rpc` | `donated_inventory.rpc.get_quote`        |

Events and commands share a domain exchange. RPCs get their own `{domain}_rpc` exchange. CamelCase operation names are converted to snake_case in routing keys.

### Building Service Topology

```typescript
import { buildServiceTopology } from "@apogeelabs/hoppity-contracts";
import { BrokerConfig } from "rascal";

const baseTopology: BrokerConfig = {
    vhosts: {
        "/": {
            connection: { url: "amqp://localhost" },
        },
    },
};

const topology = buildServiceTopology(baseTopology, "warehouse", t => {
    t.publishesEvent(DonatedInventory.events.created)
        .subscribesToEvent(DonatedInventory.events.retired)
        .handlesCommand(DonatedInventory.commands.reserveItem, {
            queueType: "quorum",
            redeliveries: { limit: 3 },
        })
        .respondsToRpc(DonatedInventory.rpc.getQuote);
});
```

The builder callback declares what the service does, and the function materializes it into Rascal topology artifacts:

| Declaration         | Creates                                       |
| ------------------- | --------------------------------------------- |
| `publishesEvent`    | Exchange + publication                        |
| `subscribesToEvent` | Exchange + queue + binding + subscription     |
| `sendsCommand`      | Exchange + publication                        |
| `handlesCommand`    | Exchange + queue + binding + subscription     |
| `callsRpc`          | RPC exchange + publication                    |
| `respondsToRpc`     | RPC exchange + queue + binding + subscription |

**Naming convention** — all artifact names are deterministic:

- Queues: `{service}_{domain}_{opType}_{opName}` (e.g. `warehouse_donated_inventory_command_reserve_item`)
- Publications: `{domain}_{opType}_{opName}` (e.g. `donated_inventory_event_created`)
- Subscriptions: `{domain}_{opType}_{opName}`
- Bindings: `{queueName}_binding`

### Handler Options

Both `subscribesToEvent`, `handlesCommand`, and `respondsToRpc` accept an optional options object:

```typescript
{
    queueType?: "quorum" | "classic";   // default: "quorum"
    redeliveries?: { limit: number };   // default: { limit: 5 }
    deadLetter?: {
        exchange: string;
        routingKey?: string;
    };
}
```

### Outbound Exchange Middleware

`withOutboundExchange` is a hoppity middleware that inserts a per-service fanout exchange in front of all publications. Useful for message tapping, audit trails, replay, or metrics — without touching domain exchange topology.

```typescript
import hoppity from "@apogeelabs/hoppity";
import { buildServiceTopology, withOutboundExchange } from "@apogeelabs/hoppity-contracts";

const topology = buildServiceTopology(baseTopology, "warehouse", t => {
    t.publishesEvent(DonatedInventory.events.created);
});

const broker = await hoppity.withTopology(topology).use(withOutboundExchange("warehouse")).build();
```

This creates a `warehouse_outbound` fanout exchange, rewrites all publications to target it, and adds exchange-to-exchange bindings so messages still reach domain exchanges. Subscriptions are untouched — it's publisher-side only.

The outbound exchange name is stored in `context.data.outboundExchange` for downstream middleware.

## API Reference

### Functions

| Function               | Signature                                                                                                      | Description                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `defineDomain`         | `(domainName: string, definition: DomainDefinitionInput) => DomainDefinition`                                  | Create typed contracts from Zod schemas                             |
| `buildServiceTopology` | `(topology: BrokerConfig, serviceName: string, configure: (builder: TopologyBuilder) => void) => BrokerConfig` | Materialize service declarations into Rascal topology               |
| `withOutboundExchange` | `(serviceName: string) => MiddlewareFunction`                                                                  | Hoppity middleware that adds a per-service outbound fanout exchange |

### Types

| Type                    | Description                                                             |
| ----------------------- | ----------------------------------------------------------------------- |
| `EventContract`         | Contract for a domain event (something that happened)                   |
| `CommandContract`       | Contract for a domain command (an instruction to do something)          |
| `RpcContract`           | Contract for a request/response operation                               |
| `DomainDefinition`      | Return type of `defineDomain` — groups contracts by operation type      |
| `DomainDefinitionInput` | Input shape for `defineDomain`                                          |
| `TopologyBuilder`       | Builder interface inside the `buildServiceTopology` callback            |
| `HandlerOptions`        | Queue/redelivery/dead-letter configuration for subscribers and handlers |
| `SubscriptionOptions`   | Alias for `HandlerOptions`                                              |

## Dependencies

- `@apogeelabs/hoppity` — Core middleware pipeline
- `rascal` (peer) — RabbitMQ AMQP broker library
- `zod` (peer) — Schema validation

## License

ISC

---
