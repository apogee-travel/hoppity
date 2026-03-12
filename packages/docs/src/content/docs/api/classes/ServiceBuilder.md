---
editUrl: false
next: false
prev: false
title: "ServiceBuilder"
---

Defined in: [packages/hoppity/src/ServiceBuilder.ts:79](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L79)

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

Defined in: [packages/hoppity/src/ServiceBuilder.ts:90](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L90)

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

Defined in: [packages/hoppity/src/ServiceBuilder.ts:116](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L116)

Builds the service broker by executing all phases in order.

#### Returns

`Promise`\<[`ServiceBroker`](/hoppity/api/interfaces/servicebroker/)\>

---

### use()

> **use**(`middleware`): `ServiceBuilder`

Defined in: [packages/hoppity/src/ServiceBuilder.ts:108](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L108)

Adds middleware to the pipeline.

#### Parameters

##### middleware

[`MiddlewareFunction`](/hoppity/api/type-aliases/middlewarefunction/)

#### Returns

`ServiceBuilder`
