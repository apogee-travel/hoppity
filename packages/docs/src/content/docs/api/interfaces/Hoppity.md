---
editUrl: false
next: false
prev: false
title: "Hoppity"
---

Defined in: [types.ts:13](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L13)

Main interface for the Rascal wrapper that provides the entry point to the middleware pipeline.

This wrapper provides two main entry points:

1. `withTopology()` - Start with an existing topology configuration
2. `use()` - Start with an empty topology and add middleware

RascalWrapper

## Methods

### use()

> **use**(`middleware`): [`BuilderInterface`](/api/interfaces/builderinterface/)

Defined in: [types.ts:28](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L28)

Creates a builder instance with an empty topology and adds the first middleware.

#### Parameters

##### middleware

[`MiddlewareFunction`](/api/type-aliases/middlewarefunction/)

The first middleware to add

#### Returns

[`BuilderInterface`](/api/interfaces/builderinterface/)

- Builder instance for chaining additional middleware

---

### withTopology()

> **withTopology**(`topology`): [`BuilderInterface`](/api/interfaces/builderinterface/)

Defined in: [types.ts:20](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L20)

Creates a builder instance with an initial topology configuration.

#### Parameters

##### topology

`BrokerConfig`

Initial topology configuration

#### Returns

[`BuilderInterface`](/api/interfaces/builderinterface/)

- Builder instance for chaining middleware
