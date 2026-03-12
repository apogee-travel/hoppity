# Bookstore Example -- LLM Usage Guide

Reference for LLMs generating code that follows the patterns demonstrated in this example. Covers the multi-service architecture, full code flow, key configuration decisions, and how to adapt the patterns for new services.

## What This Example Demonstrates

A multi-service bookstore using hoppity's contract-driven API:

- **`defineDomain`** -- shared, typed domain contracts as the single source of truth
- **`onRpc`, `onCommand`, `onEvent`** -- typed handler declarations that drive automatic topology derivation
- **`hoppity.service().use().build()`** -- the ServiceBuilder API
- **`ServiceBroker`** -- typed outbound methods: `broker.request()`, `broker.sendCommand()`, `broker.publishEvent()`
- **`logger` in `ServiceConfig`** -- tagged loggers injected directly, active before any middleware
- **Handler context** -- publishing events from inside handlers via `context.broker`

All three messaging patterns are shown: **RPC** (request/response), **commands** (fire-and-forget), and **events** (broadcast notifications).

## Architecture Overview

```
bookstore-contracts (shared types -- imported by all three)
       |
  ┌────┴────┐              ┌─────────────┐
  │  order  │──(events)───>│   catalog   │
  │ service │              │   service   │
  └────┬────┘              └─────────────┘
       │                          ^
       │  RPC + commands          │ getStockLevels RPC
       │                          │
       └────────────┐             │
                    v             │
              ┌──────────────────────┐
              │        runner        │
              │  (RPC caller +       │
              │   command sender)    │
              └──────────────────────┘
```

### Service Roles

| Service         | Role                                  | Operations                                                                                                                        |
| --------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| order-service   | Owns order lifecycle                  | Responds to `createOrder` RPC, `getOrderSummary` RPC, `cancelOrder` command; publishes `orderCreated` and `orderCancelled` events |
| catalog-service | Reacts to order events, exposes stock | Subscribes to `orderCreated` and `orderCancelled` events; responds to `getStockLevels` RPC                                        |
| runner          | Orchestrates the demo flow            | Calls RPCs, sends commands (no inbound handlers)                                                                                  |

## Code Flow

### 1. Define Domain Contracts (`bookstore-contracts`)

Each domain is defined once with `defineDomain()` and shared across all services:

```typescript
// packages/bookstore-contracts/src/orders.ts
import { defineDomain } from "@apogeelabs/hoppity";
import { z } from "zod";

const orderItemSchema = z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
});

const resolvedOrderItemSchema = z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number(),
    lineTotal: z.number(),
});

const orderResponseSchema = z.object({
    orderId: z.string(),
    items: z.array(resolvedOrderItemSchema),
    total: z.number(),
    status: z.enum(["active", "cancelled"]),
});

export const OrdersDomain = defineDomain("orders", {
    events: {
        orderCreated: z.object({
            orderId: z.string(),
            items: z.array(resolvedOrderItemSchema),
            total: z.number(),
        }),
        orderCancelled: z.object({
            orderId: z.string(),
            items: z.array(resolvedOrderItemSchema),
        }),
    },
    commands: {
        cancelOrder: z.object({ orderId: z.string() }),
    },
    rpc: {
        createOrder: {
            request: z.object({ items: z.array(orderItemSchema) }),
            response: orderResponseSchema,
        },
        getOrderSummary: {
            request: z.object({ orderId: z.string() }),
            response: orderResponseSchema,
        },
    },
});
```

```typescript
// packages/bookstore-contracts/src/catalog.ts
import { defineDomain } from "@apogeelabs/hoppity";
import { z } from "zod";

export const CatalogDomain = defineDomain("catalog", {
    rpc: {
        getStockLevels: {
            request: z.object({}),
            response: z.object({
                products: z.array(
                    z.object({
                        productId: z.string(),
                        productName: z.string(),
                        unitPrice: z.number(),
                        stock: z.number().int(),
                    })
                ),
            }),
        },
    },
});
```

The `defineDomain` call produces typed contract objects. Each contract carries its routing key, queue name, exchange name, publication name, subscription name, and Zod schema -- no string literals needed downstream.

### 2. Declare Handlers

Handlers are created with `onRpc`, `onCommand`, or `onEvent`. Each takes a contract, a handler function, and optional `HandlerOptions`.

```typescript
// order-service/src/messaging/handlers/createOrder.ts
import { onRpc } from "@apogeelabs/hoppity";
import { OrdersDomain } from "@bookstore/contracts";

export const createOrderHandler = onRpc(
    OrdersDomain.rpc.createOrder,
    async (request, { broker }) => {
        const order = createOrder(request.items);

        // Publish event from inside the handler via context.broker
        await broker.publishEvent(OrdersDomain.events.orderCreated, {
            orderId: order.orderId,
            items: order.items,
            total: order.total,
        });

        return order; // Return type matches the RPC response schema
    }
);
```

```typescript
// order-service/src/messaging/handlers/cancelOrder.ts
import { onCommand } from "@apogeelabs/hoppity";
import { OrdersDomain } from "@bookstore/contracts";

export const cancelOrderHandler = onCommand(
    OrdersDomain.commands.cancelOrder,
    async (content, { broker }) => {
        const order = cancelOrder(content.orderId);
        if (!order) return;

        await broker.publishEvent(OrdersDomain.events.orderCancelled, {
            orderId: order.orderId,
            items: order.items,
        });
    }
);
```

```typescript
// catalog-service/src/messaging/handlers/onOrderCreated.ts
import { onEvent } from "@apogeelabs/hoppity";
import { OrdersDomain } from "@bookstore/contracts";

export const onOrderCreatedHandler = onEvent(
    OrdersDomain.events.orderCreated,
    async (content, _context) => {
        for (const item of content.items) {
            decrementStock(item.productId, item.quantity);
        }
    }
);
```

```typescript
// catalog-service/src/messaging/handlers/getStockLevels.ts
import { onRpc } from "@apogeelabs/hoppity";
import { CatalogDomain } from "@bookstore/contracts";

export const getStockLevelsHandler = onRpc(
    CatalogDomain.rpc.getStockLevels,
    async (_request, _context) => {
        return { products: getAllProducts() };
    }
);
```

### 3. Build Service Brokers

Each service passes its handlers and published contracts to `hoppity.service()`. The ServiceBuilder derives all topology automatically.

```typescript
// order-service/src/messaging/broker.ts
import hoppity, { ServiceBroker } from "@apogeelabs/hoppity";
import { OrdersDomain } from "@bookstore/contracts";

const broker: ServiceBroker = await hoppity
    .service("order-service", {
        connection: {
            url: config.rabbitmq.url,
            vhost: config.rabbitmq.vhost,
            options: { heartbeat: 10 },
            retry: { factor: 2, min: 1000, max: 5000 },
        },
        handlers: [createOrderHandler, getOrderSummaryHandler, cancelOrderHandler],
        publishes: [OrdersDomain.events.orderCreated, OrdersDomain.events.orderCancelled],
        logger,
    })
    .build();
```

```typescript
// catalog-service/src/messaging/broker.ts
// No publishes needed -- catalog-service only handles inbound messages
const broker: ServiceBroker = await hoppity
    .service("catalog-service", {
        connection: {
            url: config.rabbitmq.url,
            vhost: config.rabbitmq.vhost,
            options: { heartbeat: 10 },
            retry: { factor: 2, min: 1000, max: 5000 },
        },
        handlers: [onOrderCreatedHandler, onOrderCancelledHandler, getStockLevelsHandler],
        logger,
    })
    .build();
```

```typescript
// runner/src/messaging/broker.ts
// No handlers -- runner only calls RPCs and sends commands.
// Listing contracts in publishes tells hoppity to set up reply queue infrastructure.
const broker: ServiceBroker = await hoppity
    .service("runner", {
        connection: {
            url: config.rabbitmq.url,
            vhost: config.rabbitmq.vhost,
            options: { heartbeat: 10 },
            retry: { factor: 2, min: 1000, max: 5000 },
        },
        publishes: [
            OrdersDomain.rpc.createOrder,
            OrdersDomain.rpc.getOrderSummary,
            OrdersDomain.commands.cancelOrder,
            CatalogDomain.rpc.getStockLevels,
        ],
        logger,
    })
    .build();
```

### 4. Use Typed Broker Methods

The `ServiceBroker` returned by `.build()` has typed outbound methods:

```typescript
// RPC -- request/response, TypeScript enforces payload and return types
const order = await broker.request(OrdersDomain.rpc.createOrder, {
    items: [{ productId: "widget-1", quantity: 3 }],
});
// order: { orderId: string, items: ResolvedOrderItem[], total: number, status: "active" | "cancelled" }

// RPC query
const summary = await broker.request(OrdersDomain.rpc.getOrderSummary, { orderId });

// Command -- fire-and-forget
await broker.sendCommand(OrdersDomain.commands.cancelOrder, { orderId });

// Event -- broadcast (published inside a handler via context.broker)
await broker.publishEvent(OrdersDomain.events.orderCreated, { orderId, items, total });
```

## Key Configuration Decisions

### Custom Logger

Pass `logger` directly in `ServiceConfig`. It takes effect before the build pipeline starts -- no middleware ordering concerns.

### Why the Runner Lists Contracts in `publishes`

The runner has no `handlers` -- it only sends messages outbound. Listing RPC contracts in `publishes` tells hoppity's topology derivation to create the reply queue infrastructure (exchange, queue, binding, subscription) so that `broker.request()` works. Listing command contracts creates the publication configuration for `broker.sendCommand()`.

### Handler Context Broker

Inside `onRpc` and `onCommand` handlers, the second argument provides `{ broker }` -- a broker instance with `publishEvent`, `sendCommand`, and `request` methods. This is how the `createOrder` handler publishes `orderCreated` as a side effect of creating the order.

### Singleton Broker Pattern

Each service uses a `getBroker()` factory that caches the broker instance. Multiple calls return the same broker -- no double initialization.

## Adapting This Pattern

### Adding a New Service

1. Define its domain contracts in `bookstore-contracts` (or a new shared package) using `defineDomain`
2. Create handler files using `onEvent`, `onCommand`, or `onRpc`
3. Create a `broker.ts` passing handlers and publishes to `hoppity.service().build()`
4. No topology files needed -- everything is derived from the declarations

### Adding a New Operation to an Existing Domain

1. Add the operation to the `defineDomain` call in the contracts package
2. Create the handler (using `onEvent`, `onCommand`, or `onRpc`) in the service that handles it
3. Add the handler to the `handlers` array in the service's `hoppity.service()` config
4. If the service publishes the operation's contract outbound, add it to the `publishes` array
5. Callers gain typed methods automatically -- `broker.request(NewDomain.rpc.newOp, payload)`

### Adding a New Event Subscriber

1. Import the event contract from the shared contracts package
2. Create an `onEvent` handler
3. Add it to the service's `handlers` array in `hoppity.service()` config

### Operation Type Decision Guide

| Need data back from the target? | Multiple services should react? | Use                                                         |
| ------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| Yes                             | No                              | **RPC** -- `onRpc` handler + `broker.request()`             |
| No                              | No                              | **Command** -- `onCommand` handler + `broker.sendCommand()` |
| N/A                             | Yes                             | **Event** -- `onEvent` handler + `broker.publishEvent()`    |

## File Structure Reference

```
examples/bookstore/
├── packages/
│   ├── bookstore-contracts/
│   │   └── src/
│   │       ├── index.ts          # Barrel export for OrdersDomain + CatalogDomain
│   │       ├── orders.ts         # Orders domain (events, commands, RPCs)
│   │       └── catalog.ts        # Catalog domain (getStockLevels RPC)
│   ├── order-service/
│   │   └── src/
│   │       ├── index.ts          # Service entry point
│   │       ├── config.ts         # RabbitMQ connection config
│   │       ├── logger.ts         # Tagged console logger for ServiceConfig.logger
│   │       ├── store.ts          # In-memory order store
│   │       └── messaging/
│   │           ├── broker.ts     # hoppity.service() + singleton
│   │           └── handlers/
│   │               ├── createOrder.ts      # onRpc handler
│   │               ├── getOrderSummary.ts  # onRpc handler
│   │               └── cancelOrder.ts      # onCommand handler
│   └── catalog-service/
│       └── src/
│           ├── index.ts          # Service entry point
│           ├── config.ts         # RabbitMQ connection config
│           ├── logger.ts         # Tagged console logger for ServiceConfig.logger
│           ├── store.ts          # In-memory product catalog + stock
│           └── messaging/
│               ├── broker.ts     # hoppity.service() + singleton
│               └── handlers/
│                   ├── onOrderCreated.ts    # onEvent handler
│                   ├── onOrderCancelled.ts  # onEvent handler
│                   └── getStockLevels.ts    # onRpc handler
└── runner/
    └── src/
        ├── index.ts              # Demo orchestration script
        ├── config.ts             # RabbitMQ config + service paths
        ├── logger.ts             # Tagged console logger for ServiceConfig.logger
        ├── output.ts             # TUI formatting helpers
        ├── processManager.ts     # Child process spawning
        └── messaging/
            └── broker.ts         # hoppity.service() + singleton (publishes only, no handlers)
```
