# @apogeelabs/hoppity-delayed-publish — LLM Usage Guide

TTL-based delayed message publishing via RabbitMQ dead-letter exchanges, with automatic retry on re-publish failure.

## Imports

```typescript
import { withDelayedPublish } from "@apogeelabs/hoppity-delayed-publish";
import { DelayedPublishError, DelayedPublishErrorCode } from "@apogeelabs/hoppity-delayed-publish";
import type {
    DelayedPublishOptions,
    DelayedMessage,
    DelayedPublishBroker,
} from "@apogeelabs/hoppity-delayed-publish";
```

## Type Signatures

```typescript
interface DelayedPublishOptions {
    serviceName: string; // Used for queue naming
    instanceId: string; // Unique per service instance
    defaultDelay?: number; // Defaults to 30_000 ms
    maxRetries?: number; // Defaults to 5
    retryDelay?: number; // Defaults to 1_000 ms
    durable?: boolean; // Defaults to true — controls queue durability and message persistence
}

interface DelayedMessage {
    originalMessage: any;
    originalPublication: string;
    originalOverrides?: PublicationConfig;
    targetDelay: number;
    createdAt: number;
    retryCount?: number;
}

interface DelayedPublishBroker extends BrokerAsPromised {
    delayedPublish(
        publication: string, // Name of the publication to eventually publish to
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
    public readonly details?: any;
    constructor(code: DelayedPublishErrorCode, message: string, details?: any);
}
```

### Function Signature

```typescript
function withDelayedPublish(options: DelayedPublishOptions): MiddlewareFunction;
```

## Usage Examples

### Basic delayed publishing

```typescript
import hoppity from "@apogeelabs/hoppity";
import { withDelayedPublish, DelayedPublishBroker } from "@apogeelabs/hoppity-delayed-publish";
import { randomUUID } from "crypto";

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
            retryDelay: 2_000, // Wait 2s between retries
        })
    )
    .build()) as DelayedPublishBroker;
```

## How It Works

Uses the **RabbitMQ TTL + Dead Letter Exchange** pattern:

1. **`broker.delayedPublish()`** wraps the original message in a `DelayedMessage` envelope (with metadata: original publication, overrides, delay, timestamp) and publishes it to a **wait queue** with the message TTL set to the desired delay.

2. **Wait queue** (`{serviceName}_wait`) holds messages until their TTL expires. When a message expires, RabbitMQ automatically moves it to the **ready queue** via the dead-letter exchange.

3. **Ready queue** (`{serviceName}_ready`) has a subscription that receives expired messages. The handler extracts the original message and re-publishes it to the original publication with `mandatory: true`.

4. **Retry on failure**: If re-publishing fails, the message is sent back to the wait queue with a short TTL (`retryDelay`). This continues up to `maxRetries` times. After exhausting retries, the message is published to an error queue (`{originalPublication}_delayed_error`).

5. **Topology additions**: The middleware adds wait/ready queues, dead-letter exchange bindings, and associated publications/subscriptions to every vhost in the topology.

## Gotchas

- ⚠️ **Cast to `DelayedPublishBroker`** — `build()` returns `BrokerAsPromised`. Cast to access `.delayedPublish()`.
- ⚠️ **Delay must be > 0** — zero or negative delays throw `INVALID_DELAY`.
- ⚠️ **`serviceName` and `instanceId` are required** — empty/whitespace values throw.
- ⚠️ **The `publication` argument is the name of an existing publication** — it must already be defined in your topology. `delayedPublish` doesn't create publications; it uses them when re-publishing after the delay.
- ⚠️ **Not for sub-second precision** — RabbitMQ TTL is millisecond-granular, but actual delivery depends on queue processing and load. Don't rely on exact timing.
- ⚠️ **Wait/ready queues are durable by default** — set `durable: false` in options for non-persistent queues (e.g., dev/test environments). This controls both queue durability and message persistence.
