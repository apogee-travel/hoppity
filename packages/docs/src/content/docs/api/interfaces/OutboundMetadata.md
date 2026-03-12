---
editUrl: false
next: false
prev: false
title: "OutboundMetadata"
---

Defined in: packages/hoppity/src/interceptors/types.ts:30

Metadata available to outbound wrappers when a message is published.
The contract isn't known until call time (publish is contract-agnostic),
so metadata is constructed per-call rather than at build time.

## Properties

### contract

> **contract**: [`EventContract`](/hoppity/api/interfaces/eventcontract/)\<`string`, `string`, `ZodTypeAny`\> \| [`CommandContract`](/hoppity/api/interfaces/commandcontract/)\<`string`, `string`, `ZodTypeAny`\> \| [`RpcContract`](/hoppity/api/interfaces/rpccontract/)\<`string`, `string`, `ZodTypeAny`, `ZodTypeAny`\>

Defined in: packages/hoppity/src/interceptors/types.ts:32

The contract being published to

---

### kind

> **kind**: `"event"` \| `"command"` \| `"rpc"`

Defined in: packages/hoppity/src/interceptors/types.ts:34

Operation kind — drives span naming and metric labels

---

### serviceName

> **serviceName**: `string`

Defined in: packages/hoppity/src/interceptors/types.ts:36

The service name from hoppity.service()
