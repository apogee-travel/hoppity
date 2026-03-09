---
editUrl: false
next: false
prev: false
title: "MiddlewareResult"
---

Defined in: [types.ts:129](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/types.ts#L129)

Result object returned by middleware functions.
Contains the modified topology and optional callback for post-broker-creation actions.

MiddlewareResult

## Properties

### onBrokerCreated?

> `optional` **onBrokerCreated**: [`BrokerCreatedCallback`](/hoppity/api/type-aliases/brokercreatedcallback/)

Defined in: [types.ts:131](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/types.ts#L131)

Optional callback to execute after broker creation

---

### topology

> **topology**: `BrokerConfig`

Defined in: [types.ts:130](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/types.ts#L130)

The modified topology configuration
