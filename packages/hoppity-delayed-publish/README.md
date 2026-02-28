# Hoppity Delayed Publish 🕐

A hoppity extension that provides delayed publish functionality for RabbitMQ messaging using TTL (Time-To-Live) and dead letter exchanges.

## Features

- **Delayed Publishing**: Schedule messages to be published at a future time using RabbitMQ TTL
- **Automatic Retry Logic**: Built-in retry mechanism for failed re-publishes with configurable max retries
- **Error Handling**: Dedicated error queue for messages that exceed retry limits
- **Hoppity Integration**: Seamlessly integrates with the hoppity middleware pipeline
- **Type Safety**: Full TypeScript support with proper type definitions
- **Service Isolation**: Queue naming based on service name and instance ID to prevent conflicts

## Installation

```bash
npm install @apogeelabs/hoppity-delayed-publish
```

## Usage

```typescript
import hoppity from "@apogeelabs/hoppity";
import { withDelayedPublish } from "@apogeelabs/hoppity-delayed-publish";
import { randomUUID } from "crypto";

// Create broker with delayed publish support
const broker = await hoppity
    .withTopology(baseTopology)
    .use(
        withDelayedPublish({
            serviceName: "my-service",
            instanceId: randomUUID(),
            defaultDelay: 30000, // 30 seconds
        })
    )
    .build();

// Publish a message with a delay
await broker.delayedPublish(
    "my-exchange-publication",
    { message: "This will be published in 5 seconds" },
    undefined, // optional publication overrides
    5000 // 5 seconds delay
);
```

## API Reference

### `withDelayedPublish(options)`

Middleware function that adds delayed publish capabilities to your hoppity broker.

#### Options

- `serviceName` (required): The name of the service (used for queue naming)
- `instanceId` (required): Unique instance identifier (used for queue naming)
- `defaultDelay` (optional): Default delay in milliseconds when no delay is specified (default: 30000)
- `maxRetries` (optional): Max retry attempts when re-publish fails (default: 5)
- `retryDelay` (optional): Delay in ms between retry attempts (default: 1000)
- `durable` (optional): Whether queues and messages survive broker restarts (default: true)

### `broker.delayedPublish(publication, message, overrides?, delay?)`

Publishes a message with a delay before it gets re-published to the original destination.

#### Parameters

- `publication` (string): The original publication name to use when re-publishing
- `message` (any): The message to publish
- `overrides` (optional): Publication configuration overrides
- `delay` (optional): Delay in milliseconds (uses defaultDelay if not specified)

#### Returns

Promise that resolves when the message is published to the wait queue.

## How It Works

The delayed publish functionality uses RabbitMQ's TTL (Time-To-Live) feature with dead letter exchanges:

1. **Wait Queue**: Messages are initially published to a wait queue with TTL set to the desired delay
2. **Dead Letter Exchange**: When messages expire, they are automatically moved to a ready queue
3. **Ready Queue**: A subscription processes expired messages and re-publishes them to their original destination
4. **Error Handling**: Failed re-publishes are retried up to 5 times, then sent to an error queue

### Topology Changes

The middleware automatically adds the following infrastructure to your topology:

```typescript
// Base topology (minimal example)
const baseTopology = {
    vhosts: {
        "/": {
            connection: {
                hostname: "localhost",
                port: 5672,
                user: "guest",
                password: "guest",
            },
        },
    },
};

// After applying withDelayedPublish({ serviceName: "my-service", instanceId: "instance-1" })
// The topology becomes:
const modifiedTopology = {
    vhosts: {
        "/": {
            connection: {
                hostname: "localhost",
                port: 5672,
                user: "guest",
                password: "guest",
            },
            queues: {
                "my-service_wait": {
                    options: {
                        durable: true,
                        autoDelete: false,
                        arguments: {
                            "x-dead-letter-exchange": "", // Default direct exchange
                            "x-dead-letter-routing-key": "my-service_ready",
                        },
                    },
                },
                "my-service_ready": {
                    options: {
                        durable: true,
                        autoDelete: false,
                    },
                },
                "my-service_delayed_errors": {
                    options: {
                        durable: true,
                        autoDelete: false,
                    },
                },
            },
            publications: {
                "my-service_delayed_wait": {
                    exchange: "", // Default direct exchange
                    routingKey: "my-service_wait",
                    options: {
                        persistent: true,
                    },
                },
            },
            subscriptions: {
                "my-service_ready_subscription": {
                    queue: "my-service_ready",
                    options: {
                        prefetch: 1,
                    },
                },
            },
        },
    },
};
```

**Queue Descriptions:**

- **`{serviceName}_wait`**: Temporary queue where delayed messages are stored with TTL
- **`{serviceName}_ready`**: Queue that receives expired messages from the wait queue
- **`{serviceName}_delayed_errors`**: Queue for messages that exceed retry limits

**Publications:**

- **`{serviceName}_delayed_wait`**: Publication for sending messages to the wait queue

**Subscriptions:**

- **`{serviceName}_ready_subscription`**: Subscription that processes expired messages and re-publishes them

## Error Handling

The package provides structured error handling with specific error codes:

- `QUEUE_FULL`: Wait queue is full
- `REPUBLISH_FAILED`: Failed to re-publish message
- `MAX_RETRIES_EXCEEDED`: Maximum retry attempts exceeded
- `INVALID_DELAY`: Invalid delay value (must be > 0)

## Examples

See the `examples/delayed-publish/` directory for complete working examples demonstrating delayed publish functionality.

## Dependencies

This package depends on:

- `@apogeelabs/hoppity` - The core hoppity library
- `rascal` - The underlying RabbitMQ library
- `structuredClone` (built-in) - For deep cloning

## License

ISC
