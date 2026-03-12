---
editUrl: false
next: false
prev: false
title: "default"
---

> `const` **default**: [`Hoppity`](/hoppity/api/interfaces/hoppity/)

Defined in: [packages/hoppity/src/hoppity.ts:19](https://github.com/apogee-travel/hoppity/blob/116ad649c2e29714e173c4ca41b19c4ffff2fa39/packages/hoppity/src/hoppity.ts#L19)

Entry point for hoppity. Create a service, chain middleware, build.

## Example

```typescript
const broker = await hoppity
    .service("order-service", {
        connection: { url: "amqp://localhost" },
        handlers: [createOrderHandler],
        publishes: [OrdersDomain.events.orderCreated],
    })
    .use(withCustomLogger({ logger }))
    .build();
```
