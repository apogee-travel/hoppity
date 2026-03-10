# @apogeelabs/hoppity-delayed-publish — LLM Usage Guide

TTL-based delayed message publishing via RabbitMQ dead-letter exchanges, with automatic retry on re-publish failure.

## Imports

```typescript
// Public API
import { withDelayedPublish } from "@apogeelabs/hoppity-delayed-publish";
import { DelayedPublishError, DelayedPublishErrorCode } from "@apogeelabs/hoppity-delayed-publish";
import type {
    DelayedPublishOptions,
    DelayedMessage,
    DelayedPublishBroker,
} from "@apogeelabs/hoppity-delayed-publish";
```

## Type Signatures

### Public types (exported from barrel)

```typescript
interface DelayedPublishOptions {
    serviceName: string; // Required — prefix for all queue/publication names
    instanceId: string; // Required — unique per service instance (typically randomUUID())
    defaultDelay?: number; // Defaults to 30_000 ms
    maxRetries?: number; // Defaults to 5
    retryDelay?: number; // Defaults to 1_000 ms
    durable?: boolean; // Defaults to true — controls queue durability and message persistence
}

interface DelayedMessage {
    originalMessage: any; // The payload passed to delayedPublish()
    originalPublication: string; // Rascal publication name for re-publishing
    originalOverrides?: PublicationConfig; // Optional Rascal overrides
    targetDelay: number; // Delay in ms (used as per-message TTL)
    createdAt: number; // Unix timestamp (ms) when delayedPublish() was called
    retryCount?: number; // Starts at 0, increments on each failed re-publish
}

interface DelayedPublishBroker extends BrokerAsPromised {
    delayedPublish(
        publication: string, // Name of an existing publication in the topology
        message: any, // Message payload
        overrides?: PublicationConfig,
        delay?: number // Delay in ms (uses defaultDelay if omitted)
    ): Promise<void>;
}

enum DelayedPublishErrorCode {
    QUEUE_FULL = "DELAYED_PUBLISH_QUEUE_FULL",
    REPUBLISH_FAILED = "DELAYED_PUBLISH_REPUBLISH_FAILED",
    MAX_RETRIES_EXCEEDED = "DELAYED_PUBLISH_MAX_RETRIES_EXCEEDED",
    INVALID_DELAY = "DELAYED_PUBLISH_INVALID_DELAY",
}

class DelayedPublishError extends Error {
    public readonly code: DelayedPublishErrorCode;
    public readonly details?: any; // Shape varies by error code; see below
    constructor(code: DelayedPublishErrorCode, message: string, details?: any);
}
```

### Internal types (not exported from barrel, but used internally)

```typescript
/**
 * Retry configuration passed to handleReadyMessage().
 * Values are derived from DelayedPublishOptions at setup time.
 */
interface RetryConfig {
    maxRetries: number; // From DelayedPublishOptions.maxRetries
    retryDelay: number; // From DelayedPublishOptions.retryDelay
    persistent?: boolean; // From DelayedPublishOptions.durable (defaults to true)
}
```

### Function Signatures

#### Public

```typescript
function withDelayedPublish(options: DelayedPublishOptions): MiddlewareFunction;
```

#### Internal (not exported from barrel)

```typescript
/**
 * Handles a message that has expired from the wait queue and landed on the
 * ready queue. Unwraps the DelayedMessage envelope and re-publishes the
 * original message. On failure, retries via the wait queue up to maxRetries
 * times, then routes to the error queue.
 */
function handleReadyMessage(
    broker: BrokerAsPromised,
    delayedMessage: DelayedMessage,
    logger?: Logger,
    waitPublicationName?: string,
    retryConfig?: RetryConfig
): Promise<void>;

/**
 * Called in the onBrokerCreated callback. Subscribes to the ready queue and
 * monkey-patches the delayedPublish() method onto the broker instance.
 */
function setupDelayedPublishBroker(
    broker: BrokerAsPromised,
    options: DelayedPublishOptions,
    logger?: Logger
): Promise<void>;
```

## Usage Examples

### Basic delayed publishing

```typescript
import hoppity from "@apogeelabs/hoppity";
import { withDelayedPublish, DelayedPublishBroker } from "@apogeelabs/hoppity-delayed-publish";
import { randomUUID } from "crypto";

// build() returns BrokerAsPromised — cast to DelayedPublishBroker
const broker = (await hoppity
    .withTopology(baseTopology)
    .use(
        withDelayedPublish({
            serviceName: "notification-svc",
            instanceId: randomUUID(),
            defaultDelay: 60_000,
        })
    )
    .build()) as DelayedPublishBroker;

// Publish with explicit 5-second delay
await broker.delayedPublish("send_email", { to: "user@example.com" }, undefined, 5_000);

// Publish with default delay (60 seconds, from options)
await broker.delayedPublish("send_reminder", { userId: "123" });
```

### With custom retry configuration

```typescript
const broker = (await hoppity
    .withTopology(baseTopology)
    .use(
        withDelayedPublish({
            serviceName: "scheduler",
            instanceId: randomUUID(),
            defaultDelay: 30_000,
            maxRetries: 3, // Retry up to 3 times if re-publish fails
            retryDelay: 2_000, // Wait 2s between retries (via wait queue TTL)
        })
    )
    .build()) as DelayedPublishBroker;
```

### Error handling

```typescript
import { DelayedPublishError, DelayedPublishErrorCode } from "@apogeelabs/hoppity-delayed-publish";

try {
    await broker.delayedPublish("pub", msg, undefined, -1);
} catch (err) {
    if (err instanceof DelayedPublishError) {
        switch (err.code) {
            case DelayedPublishErrorCode.INVALID_DELAY:
                // delay was zero or negative
                break;
            case DelayedPublishErrorCode.QUEUE_FULL:
                // wait queue publish failed
                break;
        }
        console.error(err.code, err.details);
    }
}
```

## How It Works

Uses the **RabbitMQ TTL + Dead Letter Exchange** pattern:

1. **`broker.delayedPublish()`** wraps the original message in a `DelayedMessage` envelope (with metadata: original publication, overrides, delay, timestamp) and publishes it to a **wait queue** with the message TTL set to the desired delay.

2. **Wait queue** (`{serviceName}_wait`) holds messages until their TTL expires. When a message expires, RabbitMQ automatically moves it to the **ready queue** via the dead-letter exchange (uses the default direct exchange `""` with the ready queue name as routing key).

3. **Ready queue** (`{serviceName}_ready`) has a subscription (prefetch: 1) that receives expired messages. The handler extracts the original message and re-publishes it to the original publication with `mandatory: true`.

4. **Retry on failure**: If re-publishing fails, the message is sent back to the wait queue with a short TTL (`retryDelay`). This reuses the dead-letter pipeline rather than retrying immediately, giving the broker breathing room. Continues up to `maxRetries` times.

5. **Error routing**: After exhausting retries, the message is published to an error queue (`{originalPublication}_delayed_error`) with full context (original message, error, retry count, timestamps).

6. **Topology additions**: The middleware adds wait/ready/error queues, a wait publication (via default exchange), and a ready subscription to every vhost in the topology.

## Gotchas

- ⚠️ **Cast to `DelayedPublishBroker`** — `build()` returns `BrokerAsPromised`. You must cast the result to `DelayedPublishBroker` to access `.delayedPublish()`. This is because the method is monkey-patched onto the broker at runtime in the `onBrokerCreated` callback; TypeScript can't infer it.
- ⚠️ **Delay must be > 0** — zero or negative delays throw `DelayedPublishError` with code `INVALID_DELAY`.
- ⚠️ **`serviceName` and `instanceId` are required** — empty or whitespace-only values throw at middleware construction time (not at build time).
- ⚠️ **The `publication` argument must reference an existing publication** — it must already be defined in your topology. `delayedPublish` doesn't create publications; it uses them when re-publishing after the delay.
- ⚠️ **Not for sub-second precision** — RabbitMQ TTL is millisecond-granular, but actual delivery depends on queue depth, broker load, and the prefetch-1 processing rate. Don't rely on exact timing.
- ⚠️ **Wait/ready queues are durable by default** — set `durable: false` in options for non-persistent queues (e.g., dev/test environments). This controls both queue durability and message persistence.
- ⚠️ **One delayed-publish middleware per pipeline** — applying `withDelayedPublish` twice in the same pipeline will log a warning and overwrite the first config. The second set of queues will be created but the first subscription will compete for messages.
- ⚠️ **Retries go through the wait queue** — failed re-publishes are not retried immediately. They re-enter the wait queue with `retryDelay` as the TTL. This means retry timing is TTL-based, not wall-clock precise.
- ⚠️ **Error queue naming for retries** — when max retries are exhausted, messages go to `{originalPublication}_delayed_error`. This publication must exist in your topology if you want the error routing to work. If it doesn't exist, the error publish will itself fail (and the message will be nacked).
- ⚠️ **`prefetch: 1` on the ready subscription** — messages are processed one at a time to avoid overwhelming the re-publish path under burst conditions (e.g., many messages expiring simultaneously). This is intentional but means throughput is bounded by re-publish latency.
