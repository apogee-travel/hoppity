# Hoppity Basic Pub/Sub Example -- LLM Usage Guide

Reference for LLMs generating code that uses hoppity's raw topology escape hatch for basic publish/subscribe messaging.

## Pattern: Raw Topology Pub/Sub

This example demonstrates the lowest-level hoppity path -- hand-written Rascal topology, no contracts, no handler declarations. One service publishes messages to a topic exchange, another consumes them from a bound queue using manual `broker.subscribe()`.

This is the escape hatch for services that don't use `defineDomain` contracts. For the contract-driven approach (recommended for most services), see the [bookstore example](../bookstore/).

## Packages Used

```typescript
import hoppity from "@apogeelabs/hoppity"; // Core builder
import { BrokerConfig, BrokerAsPromised } from "rascal"; // Underlying broker types
```

No other hoppity packages are needed. This example does not use `defineDomain`, `onEvent`, `onCommand`, `onRpc`, or any contract-driven APIs.

## Full Code Flow

### 1. Define Configuration

```typescript
// Environment-driven config with sensible defaults
export const config = {
    rabbitmq: {
        host: process.env.RABBITMQ_HOST || "localhost",
        port: parseInt(process.env.RABBITMQ_PORT || "5672", 10),
        user: process.env.RABBITMQ_USER || "guest",
        pass: process.env.RABBITMQ_PASS || "guest",
        vhost: process.env.RABBITMQ_VHOST || "/",
        get url() {
            return `amqp://${this.user}:${this.pass}@${this.host}:${this.port}${this.vhost}`;
        },
    },
} as const;
```

### 2. Define Publisher Topology

The publisher only needs the exchange and a publication. No queues, no bindings.

```typescript
import { BrokerConfig } from "rascal";

const publisherTopology: BrokerConfig = {
    vhosts: {
        [config.rabbitmq.vhost]: {
            connection: {
                url: config.rabbitmq.url,
                options: { heartbeat: 10 },
                retry: { factor: 2, min: 1000, max: 5000 },
            },
            exchanges: {
                events: {
                    type: "topic",
                    options: { durable: true },
                },
            },
            publications: {
                send_event: {
                    exchange: "events",
                    routingKey: "event.created",
                },
            },
        },
    },
};
```

### 3. Define Subscriber Topology

The subscriber declares the full topology: exchange (idempotent), queue, binding, and subscription.

```typescript
const subscriberTopology: BrokerConfig = {
    vhosts: {
        [config.rabbitmq.vhost]: {
            connection: {
                url: config.rabbitmq.url,
                options: { heartbeat: 10 },
                retry: { factor: 2, min: 1000, max: 5000 },
            },
            exchanges: {
                events: {
                    type: "topic",
                    options: { durable: true },
                },
            },
            queues: {
                event_queue: {
                    options: { durable: true },
                },
            },
            bindings: {
                event_binding: {
                    source: "events",
                    destination: "event_queue",
                    destinationType: "queue",
                    bindingKey: "event.#", // Topic wildcard: matches event.created, event.updated, etc.
                },
            },
            subscriptions: {
                on_event: {
                    queue: "event_queue",
                },
            },
        },
    },
};
```

### 4. Build Publisher Broker

The publisher uses `hoppity.service()` with the raw topology escape hatch -- no `handlers` or `publishes` arrays.

```typescript
import hoppity from "@apogeelabs/hoppity";
import { BrokerAsPromised } from "rascal";

const broker: BrokerAsPromised = await hoppity
    .service("basic-pubsub-publisher", {
        connection: { url: "unused" }, // Connection is in the topology
        topology: publisherTopology,
        logger,
    })
    .build();

// Publish a message (publication name must match topology)
await broker.publish("send_event", { id: 1, text: "hello" });
```

Note: when passing a complete `BrokerConfig` as `topology`, the connection inside the topology takes precedence. The `connection` field in `ServiceConfig` is still required by the type, but its value is unused.

### 5. Build Subscriber Broker and Wire Subscription

The subscriber also uses the raw topology escape hatch, then manually subscribes via Rascal's `broker.subscribe()` API.

```typescript
const broker: BrokerAsPromised = await hoppity
    .service("basic-pubsub-subscriber", {
        connection: { url: "unused" },
        topology: subscriberTopology,
        logger,
    })
    .build();

// Wire subscription manually -- Rascal-level handler
const sub = await broker.subscribe("on_event");
sub.on("message", (message, content, ackOrNack) => {
    console.log("Received:", content);
    ackOrNack(); // Acknowledge the message
});
```

The handler signature is Rascal's native `(message, content, ackOrNack)` -- not a hoppity contract handler. `content` is the parsed message body (Rascal handles JSON deserialization). Call `ackOrNack()` with no args to acknowledge, or `ackOrNack(new Error("..."))` to reject.

### 6. Graceful Shutdown

```typescript
const shutdown = async () => {
    await broker.shutdown();
    process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
```

## Key Configuration Decisions

| Decision             | Choice              | Why                                                                                            |
| -------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Exchange type        | `topic`             | Allows routing key pattern matching (`event.#` matches `event.created`, `event.updated`, etc.) |
| Exchange durable     | `true`              | Survives RabbitMQ restarts                                                                     |
| Queue durable        | `true`              | Messages survive restarts (with persistent delivery mode)                                      |
| Binding key          | `event.#`           | `#` matches zero or more dot-separated words -- catches all `event.*` messages                 |
| Connection heartbeat | `10` seconds        | Detects dead connections faster than the default                                               |
| Connection retry     | exponential backoff | Handles transient RabbitMQ unavailability                                                      |

## Custom Logger

Pass `logger` directly in `ServiceConfig`. It takes effect before the build pipeline starts — no middleware ordering concerns.

## Name Mapping

These names must be consistent across the codebase:

| Name                            | Defined in          | Used in                             |
| ------------------------------- | ------------------- | ----------------------------------- |
| `"events"` (exchange)           | Both topologies     | Binding source                      |
| `"event_queue"` (queue)         | Subscriber topology | Binding destination, subscription   |
| `"send_event"` (publication)    | Publisher topology  | `broker.publish("send_event", ...)` |
| `"on_event"` (subscription)     | Subscriber topology | `broker.subscribe("on_event")`      |
| `"event.created"` (routing key) | Publisher topology  | Matched by binding key `"event.#"`  |

## Adapting for Other Use Cases

### Multiple event types on the same exchange

Add more publications (publisher) and subscriptions (subscriber):

```typescript
// Publisher topology additions
publications: {
    send_user_created: { exchange: "events", routingKey: "user.created" },
    send_user_deleted: { exchange: "events", routingKey: "user.deleted" },
    send_order_placed: { exchange: "events", routingKey: "order.placed" },
}

// Subscriber topology additions
queues: {
    user_queue: { options: { durable: true } },
    order_queue: { options: { durable: true } },
}
bindings: {
    user_binding: { source: "events", destination: "user_queue", destinationType: "queue", bindingKey: "user.#" },
    order_binding: { source: "events", destination: "order_queue", destinationType: "queue", bindingKey: "order.#" },
}
subscriptions: {
    on_user_event: { queue: "user_queue" },
    on_order_event: { queue: "order_queue" },
}

// Wire each subscription manually
const userSub = await broker.subscribe("on_user_event");
userSub.on("message", (msg, content, ackOrNack) => { handleUser(content); ackOrNack(); });
const orderSub = await broker.subscribe("on_order_event");
orderSub.on("message", (msg, content, ackOrNack) => { handleOrder(content); ackOrNack(); });
```

### Direct exchange (exact routing key match)

Change exchange type and use exact routing keys:

```typescript
exchanges: {
    commands: { type: "direct", options: { durable: true } },
}
bindings: {
    process_order_binding: {
        source: "commands",
        destination: "process_order_queue",
        destinationType: "queue",
        bindingKey: "process.order",    // Exact match only, no wildcards
    },
}
```

### Fanout exchange (broadcast to all bound queues)

```typescript
exchanges: {
    notifications: { type: "fanout", options: { durable: true } },
}
bindings: {
    // No bindingKey needed -- fanout ignores it
    notify_email: { source: "notifications", destination: "email_queue", destinationType: "queue" },
    notify_sms: { source: "notifications", destination: "sms_queue", destinationType: "queue" },
}
```

### Custom logger (Pino example)

```typescript
import pino from "pino";
import { Logger } from "@apogeelabs/hoppity";

const pinoInstance = pino();

const logger: Logger = {
    silly: (msg, ...args) => pinoInstance.trace(args[0] ?? {}, msg),
    debug: (msg, ...args) => pinoInstance.debug(args[0] ?? {}, msg),
    info: (msg, ...args) => pinoInstance.info(args[0] ?? {}, msg),
    warn: (msg, ...args) => pinoInstance.warn(args[0] ?? {}, msg),
    error: (msg, ...args) => pinoInstance.error(args[0] ?? {}, msg),
    critical: (msg, ...args) => pinoInstance.fatal(args[0] ?? {}, msg),
};
```

## Gotchas

- Subscription names in `broker.subscribe("on_event")` must **exactly match** subscription names in the topology. `"event"` will not match `"on_event"`.
- The publisher does **not** need to declare queues or bindings. Only the subscriber side needs those.
- Both sides should declare the same exchange with the same configuration. RabbitMQ will error if they declare the same exchange with **different** settings.
- `ackOrNack()` with no arguments acknowledges the message. Call `ackOrNack(new Error("..."))` to reject.
- When using the raw topology escape hatch, hoppity does not derive any topology. You are responsible for the complete Rascal `BrokerConfig`. This is intentional -- for the automatic path, use `defineDomain` contracts with `handlers` and `publishes` in `ServiceConfig`.
