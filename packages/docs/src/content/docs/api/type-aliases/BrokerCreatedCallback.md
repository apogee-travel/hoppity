---
editUrl: false
next: false
prev: false
title: "BrokerCreatedCallback"
---

> **BrokerCreatedCallback** = (`broker`) => `void` \| `Promise`\<`void`\>

Defined in: [packages/hoppity/src/types.ts:115](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/types.ts#L115)

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
