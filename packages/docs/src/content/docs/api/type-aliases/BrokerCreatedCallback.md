---
editUrl: false
next: false
prev: false
title: "BrokerCreatedCallback"
---

> **BrokerCreatedCallback** = (`broker`) => `void` \| `Promise`\<`void`\>

Defined in: [types.ts:119](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity/src/types.ts#L119)

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
