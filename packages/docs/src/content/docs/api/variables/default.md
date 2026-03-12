---
editUrl: false
next: false
prev: false
title: "default"
---

> `const` **default**: [`Hoppity`](/hoppity/api/interfaces/hoppity/)

Defined in: [packages/hoppity/src/hoppity.ts:19](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/hoppity.ts#L19)

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
