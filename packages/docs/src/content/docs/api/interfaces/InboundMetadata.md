---
editUrl: false
next: false
prev: false
title: "InboundMetadata"
---

Defined in: packages/hoppity/src/interceptors/types.ts:11

Metadata available to inbound wrappers when a message is received.
Provides contract identity and raw AMQP message headers so wrappers
can extract trace context or other propagated data.

## Properties

### contract

> **contract**: [`EventContract`](/hoppity/api/interfaces/eventcontract/)\<`string`, `string`, `ZodTypeAny`\> \| [`CommandContract`](/hoppity/api/interfaces/commandcontract/)\<`string`, `string`, `ZodTypeAny`\> \| [`RpcContract`](/hoppity/api/interfaces/rpccontract/)\<`string`, `string`, `ZodTypeAny`, `ZodTypeAny`\>

Defined in: packages/hoppity/src/interceptors/types.ts:13

The contract this handler is bound to

---

### kind

> **kind**: `"event"` \| `"command"` \| `"rpc"`

Defined in: packages/hoppity/src/interceptors/types.ts:15

Operation kind — drives span naming and metric labels

---

### message

> **message**: `object`

Defined in: packages/hoppity/src/interceptors/types.ts:19

AMQP message surface — headers for trace context extraction, properties for message metadata

#### headers

> **headers**: `Record`\<`string`, `any`\>

#### properties

> **properties**: `Record`\<`string`, `any`\>

---

### serviceName

> **serviceName**: `string`

Defined in: packages/hoppity/src/interceptors/types.ts:17

The service name from hoppity.service()
