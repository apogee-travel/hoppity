---
editUrl: false
next: false
prev: false
title: "SubscriptionHandler"
---

> **SubscriptionHandler** = (`message`, `content`, `ackOrNackFn`, `broker`) => `Promise`\<`void`\> \| `void`

Defined in: [types.ts:34](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-subscriptions/src/types.ts#L34)

Handler function signature for subscription message processing.

Handlers can be synchronous or asynchronous. If a handler returns a
`Promise`, rejected promises are caught by the middleware and the message
is automatically nacked. Synchronous throws are handled the same way.

## Parameters

### message

`Message`

The raw Rascal message object (AMQP envelope + headers)

### content

`any`

The parsed message body (Rascal handles deserialization)

### ackOrNackFn

`AckOrNack`

Call with no args to acknowledge, or pass an `Error`
(and optional recovery options) to nack. See Rascal docs for recovery
strategies like `{ strategy: "nack", requeue: false }`.

### broker

`BrokerAsPromised`

The live `BrokerAsPromised` instance, useful when a handler
needs to publish a response or interact with other broker features.

## Returns

`Promise`\<`void`\> \| `void`

`void` or `Promise<void>`

## Example

```ts
const handler: SubscriptionHandler = async (message, content, ackOrNack, broker) => {
    await processOrder(content);
    ackOrNack(); // acknowledge
};
```
