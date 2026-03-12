---
editUrl: false
next: false
prev: false
title: "Hoppity"
---

Defined in: [packages/hoppity/src/types.ts:13](https://github.com/apogee-travel/hoppity/blob/116ad649c2e29714e173c4ca41b19c4ffff2fa39/packages/hoppity/src/types.ts#L13)

Entry point interface for hoppity.

Hoppity

## Methods

### service()

> **service**(`serviceName`, `config`): [`ServiceBuilder`](/hoppity/api/classes/servicebuilder/)

Defined in: [packages/hoppity/src/types.ts:22](https://github.com/apogee-travel/hoppity/blob/116ad649c2e29714e173c4ca41b19c4ffff2fa39/packages/hoppity/src/types.ts#L22)

Creates a contract-driven service builder. Handlers and publish declarations
are the topology — everything is derived automatically.

#### Parameters

##### serviceName

`string`

The service identifier, used for queue naming

##### config

[`ServiceConfig`](/hoppity/api/interfaces/serviceconfig/)

Connection, handlers, publishes, and optional raw topology

#### Returns

[`ServiceBuilder`](/hoppity/api/classes/servicebuilder/)

- Builder instance for chaining middleware and calling .build()
