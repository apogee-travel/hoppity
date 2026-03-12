---
editUrl: false
next: false
prev: false
title: "default"
---

> `const` **default**: [`Hoppity`](/hoppity/api/interfaces/hoppity/)

Defined in: [packages/hoppity/src/hoppity.ts:19](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/hoppity.ts#L19)

Entry point for hoppity. Create a service, chain middleware, build.

## Example

```typescript
const broker = await hoppity
    .service("order-service", {
        connection: { url: "amqp://localhost" },
        handlers: [createOrderHandler],
        publishes: [OrdersDomain.events.orderCreated],
        logger,
    })
    .build();
```
