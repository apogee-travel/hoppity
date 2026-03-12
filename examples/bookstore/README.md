# Bookstore Example

A multi-service demo showing how hoppity's contract-driven API works in a realistic microservice architecture. Three services, two domains, all three messaging patterns (RPC, commands, events), zero topology files.

## What This Demonstrates

- `defineDomain` -- shared domain contracts as the single source of truth across services
- `onRpc`, `onCommand`, `onEvent` -- typed handler declarations that drive automatic topology derivation
- `hoppity.service(name, config).use(middleware).build()` -- the ServiceBuilder API
- `ServiceBroker` with typed outbound methods: `broker.request()`, `broker.sendCommand()`, `broker.publishEvent()`
- `logger` in `ServiceConfig` -- injecting a tagged logger directly
- RPC-only callers -- the runner has no inbound handlers, only outbound calls
- Handler context -- publishing events from inside RPC and command handlers via `context.broker`

## What This Does NOT Demonstrate

- Error handling, retries, or dead-letter queues
- Persistence (state is in-memory, gone on restart)
- Horizontal scaling or competing consumers
- Production-grade security or configuration management

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for RabbitMQ)

## How to Run

```bash
# From the repo root -- start RabbitMQ
docker compose up -d

# Install all workspace dependencies (from repo root)
pnpm install

# Run the demo (from this directory or via filter)
pnpm --filter @bookstore/runner start
```

The runner spawns `order-service` and `catalog-service` as child processes, waits for both to connect, then executes the scripted demo flow. You'll see TUI output tracing each step.

## Package Structure

```
examples/bookstore/
├── packages/
│   ├── bookstore-contracts/   # Shared domain types (Orders + Catalog)
│   ├── order-service/         # Owns the orders domain -- RPC, commands, events
│   └── catalog-service/       # Reacts to order events, exposes stock RPC
└── runner/                    # Spawns both services and drives the demo flow
```

**Why contracts live in their own package**: Services must agree on message shapes without importing each other. `bookstore-contracts` is a dependency of all three service packages -- changes to event schemas are immediately visible across the codebase, and TypeScript enforces the contract at compile time.

**Why `workspace:*`**: All cross-package references use pnpm workspace dependencies. No npm publishing required. The version is always whatever is currently in the repo.

## Architecture

```
bookstore-contracts
       |
   (imported by)
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

The runner is an RPC-only caller -- it lists RPC and command contracts in its `publishes` array (no `handlers`), which causes hoppity to set up reply queue infrastructure automatically so `broker.request()` works.

## How Each Service is Built

### order-service

Declares handlers for `createOrder` (RPC), `getOrderSummary` (RPC), and `cancelOrder` (command). Declares `orderCreated` and `orderCancelled` as published events. All topology -- exchanges, queues, bindings, publications, subscriptions -- is derived automatically from these declarations.

```typescript
const broker = await hoppity
    .service("order-service", {
        connection: { url, vhost, options, retry },
        handlers: [createOrderHandler, getOrderSummaryHandler, cancelOrderHandler],
        publishes: [OrdersDomain.events.orderCreated, OrdersDomain.events.orderCancelled],
        logger,
    })
    .build();
```

### catalog-service

Handles `orderCreated` and `orderCancelled` events (adjusts stock) and the `getStockLevels` RPC. No published events -- catalog-service only reacts.

```typescript
const broker = await hoppity
    .service("catalog-service", {
        connection: { url, vhost, options, retry },
        handlers: [onOrderCreatedHandler, onOrderCancelledHandler, getStockLevelsHandler],
        logger,
    })
    .build();
```

### runner

No handlers -- only outbound calls. Lists every contract it calls in `publishes`.

```typescript
const broker = await hoppity
    .service("runner", {
        connection: { url, vhost, options, retry },
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

## The Demo Flow

### Set 1 -- Create & Query (Steps 1-3)

**Step 1: `createOrder` (RPC)**
The runner sends a `createOrder` RPC to order-service with a list of items. Order-service creates the order, publishes an `orderCreated` event, and returns the full order object. The runner displays the created order.

Why RPC here: the runner needs the assigned `orderId` back. If this were a command, there'd be no return value.

**Step 2: `orderCreated` event processing**
After the RPC, the runner pauses to allow catalog-service time to process the `orderCreated` event and decrement stock. Then it queries stock levels via `getStockLevels` RPC to display before/after changes.

**Step 3: `getOrderSummary` (RPC)**
The runner queries order-service for the order's current state and displays it.

### Set 2 -- Cancel & Query (Steps 4-6)

**Step 4: `cancelOrder` (Command)**
The runner sends a `cancelOrder` command to order-service. No response comes back -- commands are fire-and-forget. Order-service marks the order cancelled and publishes `orderCancelled`.

Why a command here: the caller doesn't need anything back. It's an instruction, not a query.

**Step 5: `orderCancelled` event processing**
Same pause pattern as step 2. Catalog-service receives the event and restores stock for the cancelled order's items. The `orderCancelled` event payload includes the order items so catalog-service doesn't need to maintain its own order history.

**Step 6: Stock restoration + order state (RPC)**
The runner queries stock levels and order summary one final time to confirm the cancellation is reflected in both services.

## Operation Type Guide

| Operation         | Type    | Reason                                                                       |
| ----------------- | ------- | ---------------------------------------------------------------------------- |
| `createOrder`     | RPC     | Caller needs the created order (with assigned ID) back                       |
| `getOrderSummary` | RPC     | Caller needs the current order state                                         |
| `getStockLevels`  | RPC     | Caller needs current inventory data                                          |
| `cancelOrder`     | Command | Instruction to act -- no data needed in return                               |
| `orderCreated`    | Event   | Notification that something happened -- catalog-service reacts independently |
| `orderCancelled`  | Event   | Same -- catalog-service restores stock without being directly called         |

## Key Teaching Points

**`defineDomain` produces typed contracts shared across services.**
Both services import `OrdersDomain` and `CatalogDomain` from `@bookstore/contracts`. The routing key, queue name, exchange name, and Zod schema for each operation are all derived from the domain definition -- no string literals scattered across services.

**Handlers + publishes ARE the topology.**
Each service passes `handlers` and `publishes` to `hoppity.service()`. The ServiceBuilder derives all exchanges, queues, bindings, publications, and subscriptions automatically. No `topology.ts` files exist.

**`ServiceBroker` has typed outbound methods.**
The broker returned by `.build()` has typed methods: `broker.request(OrdersDomain.rpc.createOrder, payload)`, `broker.sendCommand(OrdersDomain.commands.cancelOrder, payload)`, `broker.publishEvent(OrdersDomain.events.orderCreated, payload)`. TypeScript enforces the payload and return types at the call site.

**Handler context provides a broker for outbound operations.**
Inside an `onRpc` or `onCommand` handler, the second argument is `{ broker }`. The handler can use `broker.publishEvent()` or `broker.sendCommand()` to trigger side effects -- e.g., the `createOrder` RPC handler publishes `orderCreated` after creating the order.

**Logger is passed in `ServiceConfig`, not as middleware.**
It's available before the build pipeline starts — no ordering concerns.

## Configuration

| Variable         | Default     | Description   |
| ---------------- | ----------- | ------------- |
| `RABBITMQ_HOST`  | `localhost` | RabbitMQ host |
| `RABBITMQ_PORT`  | `5672`      | AMQP port     |
| `RABBITMQ_USER`  | `guest`     | Username      |
| `RABBITMQ_PASS`  | `guest`     | Password      |
| `RABBITMQ_VHOST` | `/`         | Virtual host  |

Copy `examples/bookstore/.env` and edit as needed. Defaults work out of the box with the repo's `docker compose` setup.

## RabbitMQ Management UI

After `docker compose up -d`, the management UI is at http://localhost:15672 (guest/guest).

Exchanges to look at:

- `orders` -- the shared topic exchange for order events and commands
- `orders_rpc` -- the RPC exchange for `createOrder` and `getOrderSummary`
- `catalog_rpc` -- the RPC exchange for `getStockLevels`

Queues to look at:

- `order-service_orders_rpc_create_order` -- order-service's queue for createOrder RPC requests
- `catalog-service_orders_event_order_created` -- catalog-service's queue for orderCreated events
- `runner_*_reply` -- the runner's ephemeral RPC reply queue (gone after the demo)
