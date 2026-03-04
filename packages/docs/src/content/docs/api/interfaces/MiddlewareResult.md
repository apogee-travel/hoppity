---
editUrl: false
next: false
prev: false
title: "MiddlewareResult"
---

Defined in: [types.ts:129](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L129)

Result object returned by middleware functions.
Contains the modified topology and optional callback for post-broker-creation actions.

MiddlewareResult

## Properties

### onBrokerCreated?

> `optional` **onBrokerCreated**: [`BrokerCreatedCallback`](/api/type-aliases/brokercreatedcallback/)

Defined in: [types.ts:131](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L131)

Optional callback to execute after broker creation

---

### topology

> **topology**: `BrokerConfig`

Defined in: [types.ts:130](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L130)

The modified topology configuration
