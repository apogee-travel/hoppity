---
editUrl: false
next: false
prev: false
title: "BrokerCreatedCallback"
---

> **BrokerCreatedCallback** = (`broker`) => `void` \| `Promise`\<`void`\>

Defined in: [types.ts:119](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L119)

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
