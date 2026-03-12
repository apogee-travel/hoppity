# @apogeelabs/hoppity

Contract-driven RabbitMQ topology builder for Node.js microservices, built on Rascal.

Declare your domain contracts, wire up handlers, and let Hoppity derive the entire RabbitMQ topology automatically. No manual topology files. No Rascal config by hand.

## Installation

```bash
pnpm add @apogeelabs/hoppity
# or
npm install @apogeelabs/hoppity
```

Requires Node >= 22.

## Quick Start

```typescript
import { z } from "zod";
import hoppity, { defineDomain, onEvent, onCommand } from "@apogeelabs/hoppity";
import { withCustomLogger } from "@apogeelabs/hoppity-logger";

// 1. Define your domain contracts
const OrdersDomain = defineDomain("orders", {
    events: {
        orderCreated: z.object({ orderId: z.string(), total: z.number() }),
    },
    commands: {
        cancelOrder: z.object({ orderId: z.string() }),
    },
});

// 2. Wire up handlers
const handleOrderCreated = onEvent(
    OrdersDomain.events.orderCreated,
    async (content, { broker }) => {
        console.log("New order:", content.orderId);
    }
);

const handleCancelOrder = onCommand(
    OrdersDomain.commands.cancelOrder,
    async ({ orderId }, { broker }) => {
        await cancelOrder(orderId);
    }
);

// 3. Build the service
const broker = await hoppity
    .service("order-service", {
        connection: { url: "amqp://localhost" },
        handlers: [handleOrderCreated, handleCancelOrder],
        publishes: [OrdersDomain.events.orderCreated],
    })
    .use(withCustomLogger({ logger })) // optional middleware
    .build();

// 4. Use the broker
await broker.publishEvent(OrdersDomain.events.orderCreated, {
    orderId: "ord-123",
    total: 49.99,
});

await broker.shutdown();
```

## Features

- **Contract-driven topology** — `defineDomain` + handlers = all exchanges, queues, bindings, publications, and subscriptions derived automatically
- **Type-safe handlers** — `onEvent`, `onCommand`, `onRpc` infer content types from Zod schemas at compile time
- **RPC built in** — `broker.request()` / `broker.cancelRequest()` with correlation IDs, timeouts, and typed responses
- **Middleware pipeline** — Cross-cutting concerns (logging, custom topology) via composable middleware
- **Interceptors** — Per-message wrappers for telemetry, tracing, metrics, and header injection
- **Schema validation** — Optional inbound/outbound Zod validation on every message
- **Escape hatch** — Pass raw Rascal `BrokerConfig` via `topology` in `ServiceConfig` for anything that can't be derived

## API

### Entry Point

```typescript
import hoppity from "@apogeelabs/hoppity";

const builder = hoppity.service("my-service", config);
const broker = await builder.use(middleware).build();
```

### ServiceConfig

```typescript
interface ServiceConfig {
    connection: ConnectionConfig;
    handlers?: HandlerDeclaration[];
    publishes?: (EventContract | CommandContract | RpcContract)[];
    interceptors?: Interceptor[]; // per-message wrappers for telemetry, tracing, metrics
    topology?: BrokerConfig; // raw Rascal config — merged as base
    instanceId?: string; // auto-generated UUID if omitted
    defaultTimeout?: number; // RPC timeout in ms (default 30_000)
    validateInbound?: boolean; // default true
    validateOutbound?: boolean; // default false
}
```

### ServiceBroker

Returned by `.build()`. Extends Rascal's `BrokerAsPromised` with:

- `publishEvent(contract, message, overrides?)` — publish a domain event
- `sendCommand(contract, message, overrides?)` — send a domain command
- `request(contract, message, overrides?)` — make an RPC call
- `cancelRequest(correlationId)` — cancel a pending RPC request

## Interceptors

Interceptors wrap handler execution (inbound) and publish calls (outbound) on every message. They're the right place for telemetry, tracing, metrics, and header injection — anything that needs to observe or modify message processing at runtime.

```typescript
interface Interceptor {
    name: string;
    inbound?: InboundWrapper; // wraps event, command, and RPC handler execution
    outbound?: OutboundWrapper; // wraps publishEvent, sendCommand, and request calls
}
```

Either field is optional — an interceptor can be inbound-only, outbound-only, or both.

### Example: handler timing

```typescript
import hoppity, { Interceptor } from "@apogeelabs/hoppity";

const withHandlerTiming: Interceptor = {
    name: "handler-timing",
    inbound: (handler, meta) => async (payload, ctx) => {
        const start = performance.now();
        try {
            return await handler(payload, ctx);
        } finally {
            console.log(`${meta.contract._name} took ${performance.now() - start}ms`);
        }
    },
};

const broker = await hoppity
    .service("order-service", {
        connection: { url: process.env.RABBITMQ_URL },
        handlers: [handleOrderCreated],
        publishes: [OrdersDomain.events.orderCreated],
        interceptors: [withHandlerTiming],
    })
    .build();
```

### Composition

For `interceptors: [A, B]`, the call chain is `A → B → handler → B → A`. The first interceptor in the array is the outermost wrapper.

Inbound wrappers receive `InboundMetadata` — the contract, operation kind (`"event" | "command" | "rpc"`), service name, and AMQP message headers. Outbound wrappers receive `OutboundMetadata` — the contract, kind, and service name.

### Interceptors vs. middleware

|          | Middleware (`.use()`)                | Interceptors                       |
| -------- | ------------------------------------ | ---------------------------------- |
| When     | Before broker creation               | During message processing          |
| What     | Modifies topology, lifecycle hooks   | Wraps handler/publish execution    |
| Scope    | Service-level setup                  | Per-message                        |
| Examples | Custom logger, topology augmentation | Tracing, metrics, header injection |

## Interceptor Packages

[`@apogeelabs/hoppity-open-telemetry`](../hoppity-open-telemetry) provides production-ready `withTracing` and `withMetrics` interceptors built on `@opentelemetry/api`. Both are dual-use: pass them directly as values for default configuration, or call them as factories to supply a custom tracer/meter name or histogram buckets. `withTracing` handles W3C context propagation across service boundaries automatically — trace context is injected into AMQP headers on publish and extracted on receive, so spans link up without any extra plumbing.

## Middleware Packages

- [`@apogeelabs/hoppity-logger`](../hoppity-logger) — inject a custom logger (Winston, Pino, etc.)

## Documentation

- [`ReadMe.LLM`](../../ReadMe.LLM) — complete API reference with all type signatures
- [`llms-usage.md`](./llms-usage.md) — LLM code generation guide for this package

## License

ISC
