---
editUrl: false
next: false
prev: false
title: "DelayedPublishOptions"
---

Defined in: [packages/hoppity-delayed-publish/src/types.ts:30](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L30)

Configuration options for the delayed publish middleware.

Controls queue naming, TTL defaults, retry behavior, and durability for the
delayed publish infrastructure that gets added to every vhost in your topology.

Queue names are derived from `serviceName`:

- `{serviceName}_wait` — holds messages until their per-message TTL expires
- `{serviceName}_ready` — receives dead-lettered messages for re-publishing
- `{serviceName}_delayed_errors` — collects messages that exhaust all retries

## Example

```typescript
const options: DelayedPublishOptions = {
    serviceName: "notification-svc",
    instanceId: randomUUID(),
    defaultDelay: 60_000, // 1 minute
    maxRetries: 3,
    retryDelay: 2_000, // 2 seconds between retry attempts
    durable: true,
};
```

## See

- [withDelayedPublish](/hoppity/api-delayed-publish/functions/withdelayedpublish/) — the middleware factory that consumes these options
- [DelayedPublishBroker](/hoppity/api-delayed-publish/interfaces/delayedpublishbroker/) — the extended broker interface produced by the middleware

## Properties

### defaultDelay?

> `optional` **defaultDelay**: `number`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:51](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L51)

Default delay in milliseconds applied when `delayedPublish()` is called
without an explicit `delay` argument.

#### Default Value

`30_000` (30 seconds)

---

### durable?

> `optional` **durable**: `boolean`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:75](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L75)

Controls both queue durability and message persistence. When `true`,
queues survive broker restarts and messages are written to disk.
Set to `false` for non-persistent queues in dev/test environments.

#### Default Value

`true`

---

### instanceId

> **instanceId**: `string`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:44](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L44)

Unique identifier for this service instance. Used for queue naming to
prevent conflicts when multiple instances of the same service are running.

Must be a non-empty, non-whitespace string. Typically a `randomUUID()`.

---

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:59](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L59)

Maximum number of retry attempts when re-publishing a message from the
ready queue fails. After exhausting retries, the message is routed to
the error queue (`{serviceName}_delayed_errors`).

#### Default Value

`5`

---

### retryDelay?

> `optional` **retryDelay**: `number`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:67](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L67)

Delay in milliseconds between retry attempts. Retries are implemented by
re-publishing the message back to the wait queue with this value as the
per-message TTL, avoiding tight retry loops.

#### Default Value

`1_000` (1 second)

---

### serviceName

> **serviceName**: `string`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:37](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L37)

The name of the service. Used as the prefix for all queue, publication,
and subscription names created by the middleware.

Must be a non-empty, non-whitespace string.
