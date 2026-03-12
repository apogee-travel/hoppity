# Hoppity Basic Pub/Sub Example

The simplest hoppity example -- a publisher sends messages to an exchange, a subscriber consumes them from a queue. No contracts, no RPC, no delayed publish. This example uses the raw topology escape hatch and manual Rascal subscription wiring to demonstrate the lowest-level way to use hoppity.

## What This Demonstrates

- `hoppity.service(name, { topology })` -- the raw topology escape hatch (no contract-driven derivation)
- `logger` in `ServiceConfig` -- injecting a custom logger directly
- Manual `broker.subscribe()` -- wiring subscription handlers directly via Rascal's API
- Rascal topology configuration (exchanges, queues, bindings, publications, subscriptions)
- Separate publisher/subscriber topologies -- each service declares only what it needs
- Graceful shutdown with `broker.shutdown()`

## What This Does NOT Demonstrate

- `defineDomain` / contracts -- see the [bookstore example](../bookstore/) for that
- `onEvent`, `onCommand`, `onRpc` handler declarations
- Automatic topology derivation from handlers and publishes
- RPC or command patterns

## Prerequisites

- Node.js 22+
- pnpm
- Docker (for RabbitMQ)

## Quick Start

```bash
# Start RabbitMQ
docker compose up -d

# Copy environment template (optional -- defaults work out of the box)
cp env.example .env

# Install dependencies (from repo root)
pnpm install

# Start both services with hot reloading
pnpm dev:both
```

Start the subscriber first so the queue exists before the publisher sends messages. The `dev:both` script handles this via `concurrently`.

## Expected Output

When running, you should see output like:

```
[Subscriber] Starting...
[Subscriber] Broker created successfully
[Subscriber] Running. Waiting for messages. Press Ctrl+C to stop
[Publisher] Starting...
[Publisher] Broker created successfully
[Publisher] Sent message #1: Hello from publisher (#1)
[Publisher] Running. Press Ctrl+C to stop
[Subscriber] Received message: { id: 1, text: 'Hello from publisher (#1)', ... }
[Publisher] Sent message #2: Hello from publisher (#2)
[Subscriber] Received message: { id: 2, text: 'Hello from publisher (#2)', ... }
```

Messages publish every 3 seconds by default (configurable via `PUBLISH_INTERVAL`).

## What to Look For in the Code

1. **Raw topology escape hatch** (`src/publisher/messaging/broker.ts`, `src/subscriber/messaging/broker.ts`) -- both services use `hoppity.service(name, { connection, topology })` with no `handlers` or `publishes` arrays. The topology is a hand-written Rascal `BrokerConfig` passed directly. This is the path for services that don't use hoppity's contract-driven API.

2. **Topology separation** (`src/publisher/messaging/topology.ts` vs `src/subscriber/messaging/topology.ts`) -- the publisher only declares the exchange and publication; the subscriber declares the exchange, queue, binding, and subscription. Both declare the same exchange because RabbitMQ declarations are idempotent.

3. **Manual subscription wiring** (`src/subscriber/messaging/broker.ts`) -- after `.build()` resolves, the subscriber calls `broker.subscribe("on_event")` and wires the message handler via Rascal's `sub.on("message", ...)` API. This is the manual equivalent of what hoppity's `onEvent`/`onCommand`/`onRpc` handlers do automatically in the contract-driven path.

4. **Message handler** (`src/subscriber/messaging/handlers/messageHandler.ts`) -- receives the raw AMQP message, parsed content (Rascal handles JSON deserialization), and an `ackOrNack` callback. This is a Rascal-level handler, not a hoppity contract handler.

5. **Logger config** -- `logger` is passed in `ServiceConfig` so hoppity internals and all middleware log through the custom logger from the start.

## Architecture

```
Publisher                  RabbitMQ                Subscriber
    |                         |                        |
    |-- publish to "events" ->|                        |
    |   (routing key:         |                        |
    |    event.created)       |                        |
    |                         |-- route to event_queue->|
    |                         |   (binding: event.#)   |-- messageHandler()
    |                         |                        |-- ackOrNack()
```

## Project Structure

```
src/
├── config.ts                      # Environment configuration
├── logger.ts                      # Custom Logger implementation
├── publisher/
│   ├── index.ts                   # Publisher entry point
│   └── messaging/
│       ├── topology.ts            # Exchange + publication (raw Rascal BrokerConfig)
│       └── broker.ts              # hoppity.service() with raw topology
└── subscriber/
    ├── index.ts                   # Subscriber entry point
    └── messaging/
        ├── topology.ts            # Exchange + queue + binding + subscription (raw Rascal BrokerConfig)
        ├── broker.ts              # hoppity.service() with raw topology + manual subscribe()
        └── handlers/
            └── messageHandler.ts  # Rascal-level message handler
```

## Configuration

| Variable           | Default     | Description           |
| ------------------ | ----------- | --------------------- |
| `RABBITMQ_HOST`    | `localhost` | RabbitMQ host         |
| `RABBITMQ_PORT`    | `5672`      | RabbitMQ port         |
| `RABBITMQ_USER`    | `guest`     | RabbitMQ username     |
| `RABBITMQ_PASS`    | `guest`     | RabbitMQ password     |
| `RABBITMQ_VHOST`   | `/`         | RabbitMQ virtual host |
| `PUBLISH_INTERVAL` | `3000`      | Publish interval (ms) |

## Available Scripts

| Script                  | Description                            |
| ----------------------- | -------------------------------------- |
| `pnpm start:publisher`  | Start publisher with tsx               |
| `pnpm start:subscriber` | Start subscriber with tsx              |
| `pnpm dev`              | Start both services with tsx           |
| `pnpm dev:publisher`    | Start publisher with hot reloading     |
| `pnpm dev:subscriber`   | Start subscriber with hot reloading    |
| `pnpm dev:both`         | Start both services with hot reloading |
| `pnpm build`            | Build TypeScript                       |
| `pnpm clean`            | Clean build artifacts                  |

## RabbitMQ Management

- **URL**: http://localhost:15672
- **Credentials**: guest / guest
- Check the **Queues** tab to see `event_queue` and its message rate
- Check the **Exchanges** tab to see the `events` exchange
