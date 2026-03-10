# Hoppity Operations

Typed runtime broker operations for hoppity-contracts — contract objects in, type-safe publish/subscribe/RPC out. No more stringly-typed publication names or untyped handlers.

Define your domain contracts with `hoppity-contracts`, declare what your service listens for, and get a broker with typed methods for everything it sends. Inbound handlers are validated against contract schemas by default. Outbound methods resolve publication names from the contract object. RPC correlation, timeouts, and reply management are built in.

## Features

- **Contract-only API** — no string fallback. Contract objects are the sole interface for all operations
- **Typed inbound handlers** — `onEvent`, `onCommand`, `onRpc` helpers infer handler parameter types from contract schemas
- **Typed outbound methods** — `publishEvent()`, `sendCommand()`, `request()` resolve publication names and infer payload types from contracts
- **Auto-ack/nack** — event and command handlers auto-ack on success, auto-nack (without requeue) on error
- **Inbound validation by default** — zod schema validation on all incoming payloads, catching schema drift at the trust boundary
- **Optional outbound validation** — opt-in runtime validation for defense-in-depth
- **RPC with correlation management** — automatic correlation IDs, configurable timeouts, request cancellation
- **Wire-compatible with hoppity-rpc** — same `RpcRequest`/`RpcResponse` envelope format for interoperability

## Installation

```bash
pnpm add @apogeelabs/hoppity-operations
# or
npm install @apogeelabs/hoppity-operations
```

**Peer dependencies:** `rascal@^20.1.1`, `zod@^3.22.0`

## Quick Start

```typescript
import { defineDomain, buildServiceTopology } from "@apogeelabs/hoppity-contracts";
import hoppity from "@apogeelabs/hoppity";
import { withOperations, onEvent, onCommand, onRpc } from "@apogeelabs/hoppity-operations";
import type { OperationsBroker } from "@apogeelabs/hoppity-operations";
import { z } from "zod";

// 1. Define domain contracts
const Inventory = defineDomain("inventory", {
    events: {
        reserved: z.object({ itemId: z.string(), quantity: z.number() }),
    },
    commands: {
        reserve: z.object({ itemId: z.string(), quantity: z.number() }),
    },
    rpc: {
        checkAvailability: {
            request: z.object({ itemId: z.string() }),
            response: z.object({ available: z.boolean(), quantity: z.number() }),
        },
    },
});

const Order = defineDomain("order", {
    events: {
        placed: z.object({ orderId: z.string(), items: z.array(z.string()) }),
    },
});

// 2. Build topology from contracts
const baseTopology = {
    vhosts: {
        "/": {
            connection: { url: "amqp://localhost" },
        },
    },
};

const topology = buildServiceTopology(baseTopology, "warehouse", t => {
    t.publishesEvent(Inventory.events.reserved);
    t.subscribesToEvent(Order.events.placed);
    t.handlesCommand(Inventory.commands.reserve);
    t.respondsToRpc(Inventory.rpc.checkAvailability);
});

// 3. Wire operations middleware with typed handlers
const broker = (await hoppity
    .withTopology(topology)
    .use(
        withOperations({
            serviceName: "warehouse",
            instanceId: crypto.randomUUID(),
            handlers: [
                onEvent(Order.events.placed, async (content, { broker }) => {
                    // content is typed as { orderId: string; items: string[] }
                    console.log("Order placed:", content.orderId);
                }),
                onCommand(Inventory.commands.reserve, async (content, { broker }) => {
                    // content is typed as { itemId: string; quantity: number }
                    await reserveInventory(content.itemId, content.quantity);
                }),
                onRpc(Inventory.rpc.checkAvailability, async (request, { broker }) => {
                    // request typed as { itemId: string }
                    // return type enforced as { available: boolean; quantity: number }
                    const stock = await getStock(request.itemId);
                    return { available: stock > 0, quantity: stock };
                }),
            ],
        })
    )
    .build()) as OperationsBroker;

// 4. Use typed outbound methods
await broker.publishEvent(Inventory.events.reserved, {
    itemId: "abc-123",
    quantity: 5,
});
```

### RPC Client

A separate service making typed RPC calls:

```typescript
const topology = buildServiceTopology(baseTopology, "api-gateway", t => {
    t.callsRpc(Inventory.rpc.checkAvailability);
});

const broker = (await hoppity
    .withTopology(topology)
    .use(
        withOperations({
            serviceName: "api-gateway",
            instanceId: crypto.randomUUID(),
            handlers: [],
        })
    )
    .build()) as OperationsBroker;

// Typed request — payload and response types inferred from contract
const result = await broker.request(Inventory.rpc.checkAvailability, {
    itemId: "abc-123",
});
console.log(result.available, result.quantity);

// Cancel a pending request
const correlationId = "..."; // from your tracking logic
broker.cancelRequest(correlationId);
```

## API Reference

### `withOperations(options)`

Creates a hoppity middleware that wires contract-based operations into the broker.

**Topology phase:** Adds RPC reply infrastructure (reply queue, subscription, `rpc_reply` publication) when any `onRpc` handler is present.

**onBrokerCreated phase:** Subscribes all declared handlers and extends the broker with typed outbound methods.

#### Options

| Option             | Type                   | Required | Default | Description                                         |
| ------------------ | ---------------------- | -------- | ------- | --------------------------------------------------- |
| `serviceName`      | `string`               | ✅       | -       | Service name (used for reply queue naming)          |
| `instanceId`       | `string`               | ✅       | -       | Unique identifier for this service instance         |
| `handlers`         | `HandlerDeclaration[]` | ✅       | -       | Array of `onEvent`/`onCommand`/`onRpc` declarations |
| `defaultTimeout`   | `number`               | ❌       | `30000` | Default RPC request timeout in milliseconds         |
| `validateInbound`  | `boolean`              | ❌       | `true`  | Validate inbound payloads against contract schemas  |
| `validateOutbound` | `boolean`              | ❌       | `false` | Validate outbound payloads against contract schemas |

### Handler Declaration Helpers

#### `onEvent(contract, handler)`

Declares a typed event handler. The handler's `content` parameter type is inferred from the contract's schema.

```typescript
onEvent(Order.events.placed, async (content, { broker }) => {
    // content: { orderId: string; items: string[] }
});
```

#### `onCommand(contract, handler)`

Declares a typed command handler. Same inference behavior as `onEvent`.

```typescript
onCommand(Inventory.commands.reserve, async (content, { broker }) => {
    // content: { itemId: string; quantity: number }
});
```

#### `onRpc(contract, handler)`

Declares a typed RPC handler. Both request and response types are inferred from the contract. The handler must return a Promise resolving to the response schema's type.

```typescript
onRpc(Inventory.rpc.checkAvailability, async (request, { broker }) => {
    // request: { itemId: string }
    // must return: { available: boolean; quantity: number }
    return { available: true, quantity: 42 };
});
```

All three helpers receive a `HandlerContext` as their second argument:

```typescript
interface HandlerContext {
    broker: OperationsBroker;
}
```

### `OperationsBroker` Methods

The middleware extends `BrokerAsPromised` with the following methods. Cast the builder result to access them: `build() as OperationsBroker`.

#### `broker.publishEvent(contract, message, overrides?)`

Publishes a typed event. Resolves the publication name from the contract.

- `contract` — An `EventContract` from `defineDomain`
- `message` — Payload matching the contract's schema (type-checked)
- `overrides?` — Optional Rascal `PublicationConfig` overrides
- Returns `Promise<void>`

#### `broker.sendCommand(contract, message, overrides?)`

Sends a typed command. Same pattern as `publishEvent`.

- `contract` — A `CommandContract` from `defineDomain`
- `message` — Payload matching the contract's schema (type-checked)
- `overrides?` — Optional Rascal `PublicationConfig` overrides
- Returns `Promise<void>`

#### `broker.request(contract, message, overrides?)`

Makes a typed RPC request. Publishes an `RpcRequest` envelope and returns a promise that resolves when the matching `RpcResponse` arrives on the reply queue.

- `contract` — An `RpcContract` from `defineDomain`
- `message` — Request payload matching the contract's request schema
- `overrides?` — Optional Rascal `PublicationConfig` overrides
- Returns `Promise<z.infer<TRes>>` — response typed from the contract's response schema

#### `broker.cancelRequest(correlationId)`

Cancels a pending RPC request.

- `correlationId` (`string`) — The correlation ID of the request to cancel
- Returns `boolean` — `true` if the request was found and cancelled

### RPC Wire Format

The RPC envelope format is identical to `hoppity-rpc` for interoperability:

```typescript
interface RpcRequest {
    correlationId: string;
    rpcName: string; // "{domain}.{operationName}"
    payload: any;
    replyTo: string; // reply queue name
    headers?: Record<string, any>;
}

interface RpcResponse {
    correlationId: string;
    payload?: any;
    error?: {
        code: string; // RpcErrorCode value
        message: string;
        details?: any;
    };
}
```

### RPC Error Codes

```typescript
const RpcErrorCode = {
    HANDLER_ERROR: "RPC_HANDLER_ERROR",
    TIMEOUT: "RPC_TIMEOUT",
    CANCELLED: "RPC_CANCELLED",
} as const;
```

## Key Design Decisions

### Contract objects are the only API

There is no string fallback. If you want stringly-typed operations, use `hoppity-rpc` and `hoppity-subscriptions`. This package exists to enforce the typed contract model — half-measures defeat the purpose.

### Auto-ack/nack for event and command handlers

Handlers auto-ack on success and auto-nack (without requeue) on error. The nack dead-letters rather than requeues, preventing infinite loops on deterministic errors. If you need manual ack control (e.g., defer ack until a downstream write confirms), use `hoppity-subscriptions` for that specific handler.

### Inbound validation on by default

Inbound messages come from other services — they're the trust boundary. Contract schema validation catches schema drift, version mismatches, and bugs in the publishing service. The per-message cost of zod parsing is negligible for typical message volumes. Disable with `validateInbound: false` for hot paths if needed.

### Outbound validation off by default

Outbound payloads are already type-checked at compile time. Runtime validation adds cost with less marginal value. Enable with `validateOutbound: true` for defense-in-depth.

### Handlers declared upfront in middleware config

All inbound handlers must be known at middleware construction time. Subscription wiring happens in `onBrokerCreated`, avoiding async registration issues. Dynamic handler registration is not supported — use `hoppity-subscriptions` for that edge case.

### Independent of hoppity-rpc

This package implements its own RPC correlation/reply mechanics, adapted from `hoppity-rpc`. No dependency on `hoppity-rpc` — no shared inbound queue, no string-based API, no `rpc_requests` exchange pulled in. The correlation manager is ~50 lines and stable.

## Composing with Other Middleware

`withOutboundExchange` from `hoppity-contracts` composes naturally:

```typescript
const broker = await hoppity
    .withTopology(topology)
    .use(withOutboundExchange("warehouse"))
    .use(withOperations({ serviceName: "warehouse", instanceId: "1", handlers: [...] }))
    .build() as OperationsBroker;
```

The outbound exchange rewrites publications at the topology level. `publishEvent`, `sendCommand`, and `request` publish to publication names, which Rascal resolves against the (potentially rewritten) topology. No special integration needed.

## Dependencies

- `@apogeelabs/hoppity` — Core middleware pipeline
- `@apogeelabs/hoppity-contracts` — Domain contracts and topology generation
- `rascal` (peer) — RabbitMQ AMQP broker library
- `zod` (peer) — Schema validation and type inference

## License

ISC

---
