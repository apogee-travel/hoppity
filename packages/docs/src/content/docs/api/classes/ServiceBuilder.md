---
editUrl: false
next: false
prev: false
title: "ServiceBuilder"
---

Defined in: packages/hoppity/src/ServiceBuilder.ts:72

The contract-driven service builder.

Built by hoppity.service(), supports .use(middleware) chaining and
.build() to produce a wired ServiceBroker.

Build phases when .build() is called:

1. Derive topology from handlers + publishes
2. Merge with optional raw topology (raw is base, derived layers on top)
3. Run middleware pipeline (they see the complete topology)
4. Create Rascal broker via BrokerAsPromised.create()
5. Wire event/command/rpc handlers (subscribe to queues, wrap with interceptors)
6. Wire outbound methods (publishEvent, sendCommand, request, cancelRequest — wrap with interceptors)
7. Run middleware onBrokerCreated callbacks (they see the fully-wired broker)

## Constructors

### Constructor

> **new ServiceBuilder**(`serviceName`, `config`): `ServiceBuilder`

Defined in: packages/hoppity/src/ServiceBuilder.ts:83

#### Parameters

##### serviceName

`string`

##### config

[`ServiceConfig`](/hoppity/api/interfaces/serviceconfig/)

#### Returns

`ServiceBuilder`

## Methods

### build()

> **build**(): `Promise`\<[`ServiceBroker`](/hoppity/api/interfaces/servicebroker/)\>

Defined in: packages/hoppity/src/ServiceBuilder.ts:107

Builds the service broker by executing all phases in order.

#### Returns

`Promise`\<[`ServiceBroker`](/hoppity/api/interfaces/servicebroker/)\>

---

### use()

> **use**(`middleware`): `ServiceBuilder`

Defined in: packages/hoppity/src/ServiceBuilder.ts:99

Adds middleware to the pipeline.

#### Parameters

##### middleware

[`MiddlewareFunction`](/hoppity/api/type-aliases/middlewarefunction/)

#### Returns

`ServiceBuilder`
