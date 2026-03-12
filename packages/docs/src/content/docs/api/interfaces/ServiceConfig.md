---
editUrl: false
next: false
prev: false
title: "ServiceConfig"
---

Defined in: [packages/hoppity/src/ServiceBuilder.ts:28](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L28)

Configuration for a service created via hoppity.service().

## Properties

### connection

> **connection**: [`ConnectionConfig`](/hoppity/api/interfaces/connectionconfig/)

Defined in: [packages/hoppity/src/ServiceBuilder.ts:30](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L30)

Connection settings for the RabbitMQ broker

---

### defaultTimeout?

> `optional` **defaultTimeout**: `number`

Defined in: [packages/hoppity/src/ServiceBuilder.ts:40](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L40)

Default RPC timeout in ms (defaults to 30_000)

---

### delayedDelivery?

> `optional` **delayedDelivery**: `DelayedDeliveryConfig`

Defined in: [packages/hoppity/src/ServiceBuilder.ts:55](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L55)

Configuration for the delayed delivery engine.
Only relevant when any declared contracts use `delay` support.

---

### handlers?

> `optional` **handlers**: [`HandlerDeclaration`](/hoppity/api/type-aliases/handlerdeclaration/)[]

Defined in: [packages/hoppity/src/ServiceBuilder.ts:32](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L32)

Handler declarations (onEvent, onCommand, onRpc)

---

### instanceId?

> `optional` **instanceId**: `string`

Defined in: [packages/hoppity/src/ServiceBuilder.ts:38](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L38)

Unique instance identifier — auto-generated (UUID) if not provided

---

### interceptors?

> `optional` **interceptors**: [`Interceptor`](/hoppity/api/interfaces/interceptor/)[]

Defined in: [packages/hoppity/src/ServiceBuilder.ts:50](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L50)

Interceptors applied to all handler and publish operations.
Each interceptor can declare inbound (handler wrapping), outbound (publish wrapping), or both.
Applied in declaration order — first interceptor is outermost wrapper.

---

### logger?

> `optional` **logger**: [`Logger`](/hoppity/api/interfaces/logger/)

Defined in: [packages/hoppity/src/ServiceBuilder.ts:61](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L61)

Custom logger instance. When provided, replaces the default ConsoleLogger for all
build pipeline logging, handler wiring, and outbound method logging. Providing the
logger here ensures it is active before any middleware runs — no ordering footgun.

---

### publishes?

> `optional` **publishes**: ([`EventContract`](/hoppity/api/interfaces/eventcontract/)\<`string`, `string`, `ZodTypeAny`\> \| [`CommandContract`](/hoppity/api/interfaces/commandcontract/)\<`string`, `string`, `ZodTypeAny`\> \| [`RpcContract`](/hoppity/api/interfaces/rpccontract/)\<`string`, `string`, `ZodTypeAny`, `ZodTypeAny`\>)[]

Defined in: [packages/hoppity/src/ServiceBuilder.ts:34](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L34)

Outbound contract declarations (events, commands, RPC calls to send)

---

### topology?

> `optional` **topology**: `BrokerConfig`

Defined in: [packages/hoppity/src/ServiceBuilder.ts:36](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L36)

Optional raw Rascal BrokerConfig — merged as the base before derived topology layers on top

---

### validateInbound?

> `optional` **validateInbound**: `boolean`

Defined in: [packages/hoppity/src/ServiceBuilder.ts:42](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L42)

Validate inbound payloads against contract schemas (defaults to true)

---

### validateOutbound?

> `optional` **validateOutbound**: `boolean`

Defined in: [packages/hoppity/src/ServiceBuilder.ts:44](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/ServiceBuilder.ts#L44)

Validate outbound payloads against contract schemas (defaults to false)
