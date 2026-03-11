---
editUrl: false
next: false
prev: false
title: "DelayedMessage"
---

Defined in: [packages/hoppity-delayed-publish/src/types.ts:102](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L102)

Envelope structure wrapping a delayed message in the wait queue.

When `delayedPublish()` is called, the original message payload is wrapped in
this envelope along with routing metadata (publication name, overrides) and
timing information. The envelope travels through the wait queue -> dead letter ->
ready queue pipeline, where it is unwrapped and the original message is
re-published to its intended destination.

## Example

```typescript
// You typically don't construct this yourself — delayedPublish() does it.
// But if inspecting the wait or error queue contents:
const msg: DelayedMessage = {
    originalMessage: { orderId: "abc-123" },
    originalPublication: "process_order",
    targetDelay: 5000,
    createdAt: Date.now(),
    retryCount: 0,
};
```

## See

[DelayedPublishBroker.delayedPublish](/hoppity/api-delayed-publish/interfaces/delayedpublishbroker/#delayedpublish) — creates and publishes this envelope

## Properties

### createdAt

> **createdAt**: `number`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:116](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L116)

Unix timestamp (ms) when `delayedPublish()` was called. Useful for observability.

---

### originalMessage

> **originalMessage**: `any`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:104](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L104)

The original message payload passed to `delayedPublish()`.

---

### originalOverrides?

> `optional` **originalOverrides**: `PublicationConfig`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:112](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L112)

Optional Rascal `PublicationConfig` overrides passed to `delayedPublish()`.

---

### originalPublication

> **originalPublication**: `string`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:110](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L110)

The Rascal publication name to use when re-publishing the message
after the delay expires. Must reference a publication already defined
in the broker topology.

---

### retryCount?

> `optional` **retryCount**: `number`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:124](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L124)

Number of re-publish retry attempts that have occurred so far.
Starts at `0` and increments on each failed re-publish attempt.
When this reaches `maxRetries`, the message is routed to the error queue.

#### Default Value

`0`

---

### targetDelay

> **targetDelay**: `number`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:114](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L114)

The intended delay in milliseconds (used as the per-message TTL on the wait queue).
