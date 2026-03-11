---
editUrl: false
next: false
prev: false
title: "SubscriptionHandlers"
---

> **SubscriptionHandlers** = `Record`\<`string`, [`SubscriptionHandler`](/hoppity/api-subscriptions/type-aliases/subscriptionhandler/)\>

Defined in: [types.ts:56](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-subscriptions/src/types.ts#L56)

Map of subscription names to their handler functions.

Each key **must** exactly match a subscription name defined in the broker
topology. Mismatched keys are caught at validation time (fail-fast) so you
don't end up with dead handler code that silently never fires.

## Example

```ts
const handlers: SubscriptionHandlers = {
    on_order_created: handleOrderCreated,
    on_payment_received: handlePayment,
};
```
