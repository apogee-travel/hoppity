# Hoppity Delayed Publish

TTL-based delayed message publishing for [hoppity](https://github.com/apogee-stealth/hoppity) brokers, using RabbitMQ dead-letter exchanges with automatic retry on re-publish failure.

## Features

- **Delayed Publishing**: Schedule messages to be published at a future time using RabbitMQ per-message TTL
- **Automatic Retry**: Built-in retry mechanism for failed re-publishes (configurable attempts and backoff)
- **Error Routing**: Dedicated error queue for messages that exhaust retry limits
- **Hoppity Integration**: Plugs into the hoppity middleware pipeline — topology and subscriptions are set up automatically
- **Type Safety**: Full TypeScript support; cast to `DelayedPublishBroker` for the extended API
- **Service Isolation**: Queue naming based on `serviceName` prevents cross-service conflicts

## Installation

```bash
pnpm add @apogeelabs/hoppity-delayed-publish
# or
npm install @apogeelabs/hoppity-delayed-publish
```

Peer dependency: `rascal@^20.1.1`

## Usage

```typescript
import hoppity from "@apogeelabs/hoppity";
import { withDelayedPublish, type DelayedPublishBroker } from "@apogeelabs/hoppity-delayed-publish";
import { randomUUID } from "crypto";

// build() returns BrokerAsPromised — cast to DelayedPublishBroker
// to access the delayedPublish() method added by the middleware.
const broker = (await hoppity
    .withTopology(baseTopology)
    .use(
        withDelayedPublish({
            serviceName: "my-service",
            instanceId: randomUUID(),
            defaultDelay: 30_000, // 30 seconds
        })
    )
    .build()) as DelayedPublishBroker;

// Publish with an explicit 5-second delay
await broker.delayedPublish(
    "my-exchange-publication", // must exist in your topology
    { message: "This will be published in 5 seconds" },
    undefined, // optional publication overrides
    5_000
);

// Publish with the default delay (30s, from options above)
await broker.delayedPublish("my-exchange-publication", { message: "Delayed with default" });
```

## API Reference

### `withDelayedPublish(options)`

Middleware factory that adds delayed publish infrastructure to every vhost in your topology and extends the broker with the `delayedPublish()` method.

#### Options (`DelayedPublishOptions`)

| Option         | Type      | Default  | Description                                                                      |
| -------------- | --------- | -------- | -------------------------------------------------------------------------------- |
| `serviceName`  | `string`  | required | Service name — used as prefix for queue/publication names                        |
| `instanceId`   | `string`  | required | Unique instance identifier (typically `randomUUID()`)                            |
| `defaultDelay` | `number`  | `30_000` | Default delay in ms when `delayedPublish()` is called without a `delay` argument |
| `maxRetries`   | `number`  | `5`      | Max re-publish retry attempts before routing to the error queue                  |
| `retryDelay`   | `number`  | `1_000`  | Delay in ms between retry attempts                                               |
| `durable`      | `boolean` | `true`   | Controls queue durability and message persistence                                |

### `broker.delayedPublish(publication, message, overrides?, delay?)`

Publishes a message that will be re-published to its original destination after the specified delay.

| Parameter     | Type                 | Description                                      |
| ------------- | -------------------- | ------------------------------------------------ |
| `publication` | `string`             | Name of an existing publication in your topology |
| `message`     | `any`                | The message payload                              |
| `overrides`   | `PublicationConfig?` | Optional Rascal publication overrides            |
| `delay`       | `number?`            | Delay in ms (uses `defaultDelay` if omitted)     |

Returns a `Promise<void>` that resolves when the message is accepted by the wait queue (not when it is eventually re-published).

## How It Works

Uses the **RabbitMQ TTL + Dead Letter Exchange** pattern:

1. **`delayedPublish()`** wraps the message in a `DelayedMessage` envelope (original payload + routing metadata + timestamp) and publishes it to the **wait queue** with the per-message TTL set to the desired delay.

2. **Wait queue** (`{serviceName}_wait`) holds the message until its TTL expires. On expiry, RabbitMQ dead-letters it to the **ready queue** via the default direct exchange (`""`).

3. **Ready queue** (`{serviceName}_ready`) has a subscription (prefetch 1) that unwraps the envelope and re-publishes the original message to the original publication with `mandatory: true`.

4. **Retry on failure**: If re-publishing fails, the message goes back to the wait queue with a short TTL (`retryDelay`), reusing the same dead-letter cycle. This avoids tight retry loops and gives the broker breathing room. After `maxRetries` attempts, the message is routed to the error queue.

5. **Error queue** (`{serviceName}_delayed_errors`) collects messages that exhausted all retries, for inspection or manual replay.

### Topology Changes

The middleware automatically adds the following to each vhost:

```
Queues:
  {serviceName}_wait            - TTL hold queue with dead-letter to ready queue
  {serviceName}_ready           - Receives expired messages for re-publishing
  {serviceName}_delayed_errors  - Failed messages after max retries

Publications:
  {serviceName}_delayed_wait    - Publishes to the wait queue via default exchange

Subscriptions:
  {serviceName}_ready_subscription - Processes the ready queue (prefetch: 1)
```

Example topology after applying `withDelayedPublish({ serviceName: "my-service", ... })`:

```typescript
{
    vhosts: {
        "/": {
            connection: { /* ... */ },
            queues: {
                "my-service_wait": {
                    options: {
                        durable: true,
                        autoDelete: false,
                        arguments: {
                            "x-dead-letter-exchange": "",
                            "x-dead-letter-routing-key": "my-service_ready",
                        },
                    },
                },
                "my-service_ready": {
                    options: { durable: true, autoDelete: false },
                },
                "my-service_delayed_errors": {
                    options: { durable: true, autoDelete: false },
                },
            },
            publications: {
                "my-service_delayed_wait": {
                    exchange: "",
                    routingKey: "my-service_wait",
                    options: { persistent: true },
                },
            },
            subscriptions: {
                "my-service_ready_subscription": {
                    queue: "my-service_ready",
                    options: { prefetch: 1 },
                },
            },
        },
    },
}
```

## Error Handling

All errors are instances of `DelayedPublishError` with a machine-readable `code`:

| Code                   | When                                                 |
| ---------------------- | ---------------------------------------------------- |
| `QUEUE_FULL`           | Publishing to the wait queue fails                   |
| `REPUBLISH_FAILED`     | Re-publishing from the ready queue fails (retryable) |
| `MAX_RETRIES_EXCEEDED` | All retry attempts exhausted                         |
| `INVALID_DELAY`        | Delay value is zero or negative                      |

```typescript
import { DelayedPublishError, DelayedPublishErrorCode } from "@apogeelabs/hoppity-delayed-publish";

try {
    await broker.delayedPublish("pub", msg, undefined, -1);
} catch (err) {
    if (err instanceof DelayedPublishError) {
        console.error(err.code, err.details);
    }
}
```

## Examples

See the `examples/delayed-publish/` directory for complete working examples.

## Dependencies

- `@apogeelabs/hoppity` (workspace dependency) — core middleware pipeline
- `rascal@^20.1.1` (peer dependency) — RabbitMQ broker library

## License

ISC
