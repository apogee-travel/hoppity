---
editUrl: false
next: false
prev: false
title: "BrokerCreatedCallback"
---

> **BrokerCreatedCallback** = (`broker`) => `void` \| `Promise`\<`void`\>

Defined in: [packages/hoppity/src/types.ts:115](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/types.ts#L115)

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
