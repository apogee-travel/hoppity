---
editUrl: false
next: false
prev: false
title: "DelayedDeliveryErrorCode"
---

Defined in: packages/hoppity/src/broker/delayedDeliveryTypes.ts:30

Error codes for delayed delivery operations.

## Enumeration Members

### ERROR_QUEUE_PUBLISH_FAILED

> **ERROR_QUEUE_PUBLISH_FAILED**: `"DELAYED_DELIVERY_ERROR_QUEUE_PUBLISH_FAILED"`

Defined in: packages/hoppity/src/broker/delayedDeliveryTypes.ts:36

Publishing to the error queue after max retries exhausted failed

---

### INVALID_DELAY

> **INVALID_DELAY**: `"DELAYED_DELIVERY_INVALID_DELAY"`

Defined in: packages/hoppity/src/broker/delayedDeliveryTypes.ts:32

The delay value was zero or negative

---

### MAX_RETRIES_EXCEEDED

> **MAX_RETRIES_EXCEEDED**: `"DELAYED_DELIVERY_MAX_RETRIES_EXCEEDED"`

Defined in: packages/hoppity/src/broker/delayedDeliveryTypes.ts:38

All retry attempts exhausted; message routed to the error queue

---

### QUEUE_FULL

> **QUEUE_FULL**: `"DELAYED_DELIVERY_QUEUE_FULL"`

Defined in: packages/hoppity/src/broker/delayedDeliveryTypes.ts:34

Publishing to the wait queue failed

---

### RETRY_ENQUEUE_FAILED

> **RETRY_ENQUEUE_FAILED**: `"DELAYED_DELIVERY_RETRY_ENQUEUE_FAILED"`

Defined in: packages/hoppity/src/broker/delayedDeliveryTypes.ts:44

Re-enqueueing to the wait queue failed during a retry attempt.
The ready-queue message should be nacked so Rascal's redelivery limit applies —
the message is not yet parked anywhere safe.
