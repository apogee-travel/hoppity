---
editUrl: false
next: false
prev: false
title: "BrokerCreatedCallback"
---

> **BrokerCreatedCallback** = (`broker`) => `void` \| `Promise`\<`void`\>

Defined in: [types.ts:119](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/types.ts#L119)

Callback function that is executed after the broker is created.
Allows middleware to perform post-creation setup like subscribing to queues,
setting up event handlers, or performing other broker-dependent operations.

## Parameters

### broker

`BrokerAsPromised`

The created Rascal broker instance

## Returns

`void` \| `Promise`\<`void`\>

- Can be synchronous or asynchronous
