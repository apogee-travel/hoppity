---
editUrl: false
next: false
prev: false
title: "ServiceConfig"
---

Defined in: packages/hoppity/src/ServiceBuilder.ts:27

Configuration for a service created via hoppity.service().

## Properties

### connection

> **connection**: [`ConnectionConfig`](/hoppity/api/interfaces/connectionconfig/)

Defined in: packages/hoppity/src/ServiceBuilder.ts:29

Connection settings for the RabbitMQ broker

---

### defaultTimeout?

> `optional` **defaultTimeout**: `number`

Defined in: packages/hoppity/src/ServiceBuilder.ts:39

Default RPC timeout in ms (defaults to 30_000)

---

### delayedDelivery?

> `optional` **delayedDelivery**: `DelayedDeliveryConfig`

Defined in: packages/hoppity/src/ServiceBuilder.ts:54

Configuration for the delayed delivery engine.
Only relevant when any declared contracts use `delay` support.

---

### handlers?

> `optional` **handlers**: [`HandlerDeclaration`](/hoppity/api/type-aliases/handlerdeclaration/)[]

Defined in: packages/hoppity/src/ServiceBuilder.ts:31

Handler declarations (onEvent, onCommand, onRpc)

---

### instanceId?

> `optional` **instanceId**: `string`

Defined in: packages/hoppity/src/ServiceBuilder.ts:37

Unique instance identifier — auto-generated (UUID) if not provided

---

### interceptors?

> `optional` **interceptors**: [`Interceptor`](/hoppity/api/interfaces/interceptor/)[]

Defined in: packages/hoppity/src/ServiceBuilder.ts:49

Interceptors applied to all handler and publish operations.
Each interceptor can declare inbound (handler wrapping), outbound (publish wrapping), or both.
Applied in declaration order — first interceptor is outermost wrapper.

---

### publishes?

> `optional` **publishes**: ([`EventContract`](/hoppity/api/interfaces/eventcontract/)\<`string`, `string`, `ZodTypeAny`\> \| [`CommandContract`](/hoppity/api/interfaces/commandcontract/)\<`string`, `string`, `ZodTypeAny`\> \| [`RpcContract`](/hoppity/api/interfaces/rpccontract/)\<`string`, `string`, `ZodTypeAny`, `ZodTypeAny`\>)[]

Defined in: packages/hoppity/src/ServiceBuilder.ts:33

Outbound contract declarations (events, commands, RPC calls to send)

---

### topology?

> `optional` **topology**: `BrokerConfig`

Defined in: packages/hoppity/src/ServiceBuilder.ts:35

Optional raw Rascal BrokerConfig — merged as the base before derived topology layers on top

---

### validateInbound?

> `optional` **validateInbound**: `boolean`

Defined in: packages/hoppity/src/ServiceBuilder.ts:41

Validate inbound payloads against contract schemas (defaults to true)

---

### validateOutbound?

> `optional` **validateOutbound**: `boolean`

Defined in: packages/hoppity/src/ServiceBuilder.ts:43

Validate outbound payloads against contract schemas (defaults to false)
