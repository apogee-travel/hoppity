---
editUrl: false
next: false
prev: false
title: "Hoppity"
---

Defined in: [types.ts:13](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/types.ts#L13)

Main interface for the Rascal wrapper that provides the entry point to the middleware pipeline.

This wrapper provides two main entry points:

1. `withTopology()` - Start with an existing topology configuration
2. `use()` - Start with an empty topology and add middleware

RascalWrapper

## Methods

### use()

> **use**(`middleware`): [`BuilderInterface`](/hoppity/api/interfaces/builderinterface/)

Defined in: [types.ts:28](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/types.ts#L28)

Creates a builder instance with an empty topology and adds the first middleware.

#### Parameters

##### middleware

[`MiddlewareFunction`](/hoppity/api/type-aliases/middlewarefunction/)

The first middleware to add

#### Returns

[`BuilderInterface`](/hoppity/api/interfaces/builderinterface/)

- Builder instance for chaining additional middleware

---

### withTopology()

> **withTopology**(`topology`): [`BuilderInterface`](/hoppity/api/interfaces/builderinterface/)

Defined in: [types.ts:20](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/types.ts#L20)

Creates a builder instance with an initial topology configuration.

#### Parameters

##### topology

`BrokerConfig`

Initial topology configuration

#### Returns

[`BuilderInterface`](/hoppity/api/interfaces/builderinterface/)

- Builder instance for chaining middleware
