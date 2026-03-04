---
editUrl: false
next: false
prev: false
title: "BuilderInterface"
---

Defined in: [types.ts:189](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L189)

Interface for the builder pattern that allows chaining middleware.
Provides a fluent API for configuring the Rascal broker with middleware pipeline.

BuilderInterface

## Methods

### build()

> **build**(): `Promise`\<`BrokerAsPromised`\>

Defined in: [types.ts:201](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L201)

Creates the Rascal broker with the configured topology and executes all middleware callbacks.

#### Returns

`Promise`\<`BrokerAsPromised`\>

- The configured Rascal broker instance

---

### use()

> **use**(`middleware`): `BuilderInterface`

Defined in: [types.ts:195](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L195)

Adds middleware to the pipeline.

#### Parameters

##### middleware

[`MiddlewareFunction`](/api/type-aliases/middlewarefunction/)

The middleware function to add

#### Returns

`BuilderInterface`

- Returns self for method chaining
