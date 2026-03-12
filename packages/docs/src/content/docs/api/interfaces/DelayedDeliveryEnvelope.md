---
editUrl: false
next: false
prev: false
title: "DelayedDeliveryEnvelope"
---

Defined in: packages/hoppity/src/broker/delayedDeliveryTypes.ts:12

Wraps the original message during transit through the wait → ready queue pipeline.

When publishEvent/sendCommand is called with a delay option, the original payload
is wrapped in this envelope and published to the wait queue with per-message TTL
equal to the delay. When TTL expires, RabbitMQ dead-letters the envelope to the
ready queue, where it is unwrapped and the original message is re-published.

## Properties

### createdAt

> **createdAt**: `number`

Defined in: packages/hoppity/src/broker/delayedDeliveryTypes.ts:22

Unix timestamp (ms) when the delayed publish was initiated

---

### originalMessage

> **originalMessage**: `any`

Defined in: packages/hoppity/src/broker/delayedDeliveryTypes.ts:14

The original message payload

---

### originalOverrides?

> `optional` **originalOverrides**: `PublicationConfig`

Defined in: packages/hoppity/src/broker/delayedDeliveryTypes.ts:18

Optional Rascal PublicationConfig overrides forwarded to the re-publish call

---

### originalPublication

> **originalPublication**: `string`

Defined in: packages/hoppity/src/broker/delayedDeliveryTypes.ts:16

The Rascal publication name to use when re-publishing after the delay

---

### retryCount

> **retryCount**: `number`

Defined in: packages/hoppity/src/broker/delayedDeliveryTypes.ts:24

Number of re-publish retry attempts so far. Starts at 0.

---

### targetDelay

> **targetDelay**: `number`

Defined in: packages/hoppity/src/broker/delayedDeliveryTypes.ts:20

The intended delay in milliseconds (used as per-message TTL on the wait queue)
