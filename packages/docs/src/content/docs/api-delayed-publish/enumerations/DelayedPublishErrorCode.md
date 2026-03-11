---
editUrl: false
next: false
prev: false
title: "DelayedPublishErrorCode"
---

Defined in: [packages/hoppity-delayed-publish/src/types.ts:199](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L199)

Error codes for delayed publish operations.

Each code maps to a specific failure mode in the delayed publish pipeline.
These are set on [DelayedPublishError.code](/hoppity/api-delayed-publish/classes/delayedpublisherror/#code) and can be used for
programmatic error handling.

## Example

```typescript
try {
    await broker.delayedPublish("pub", msg, undefined, -1);
} catch (err) {
    if (err instanceof DelayedPublishError && err.code === DelayedPublishErrorCode.INVALID_DELAY) {
        // handle invalid delay
    }
}
```

## Enumeration Members

### INVALID_DELAY

> **INVALID_DELAY**: `"DELAYED_PUBLISH_INVALID_DELAY"`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:207](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L207)

The delay value was zero or negative.

---

### MAX_RETRIES_EXCEEDED

> **MAX_RETRIES_EXCEEDED**: `"DELAYED_PUBLISH_MAX_RETRIES_EXCEEDED"`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:205](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L205)

All retry attempts exhausted; the message has been routed to the error queue.

---

### QUEUE_FULL

> **QUEUE_FULL**: `"DELAYED_PUBLISH_QUEUE_FULL"`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:201](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L201)

Publishing to the wait queue failed (e.g., connection loss, channel error).

---

### REPUBLISH_FAILED

> **REPUBLISH_FAILED**: `"DELAYED_PUBLISH_REPUBLISH_FAILED"`

Defined in: [packages/hoppity-delayed-publish/src/types.ts:203](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-delayed-publish/src/types.ts#L203)

Re-publishing the message from the ready queue to its original destination failed.
