---
editUrl: false
next: false
prev: false
title: "RpcRequest"
---

Defined in: [packages/hoppity-rpc/src/types.ts:52](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L52)

Structure of an RPC request message.

This is the wire format published to the RPC exchange. The `replyTo` field tells
the handler where to send the response — it's the name of the requester's exclusive
reply queue, routed via RabbitMQ's default direct exchange.

## Example

```typescript
// You rarely construct this yourself — broker.request() builds it internally.
// But if you're inspecting messages for debugging:
const req: RpcRequest = {
    correlationId: "550e8400-e29b-41d4-a716-446655440000",
    rpcName: "user-service.getProfile",
    payload: { userId: "42" },
    replyTo: "rpc_api_gateway_abc123_reply",
};
```

## Properties

### correlationId

> **correlationId**: `string`

Defined in: [packages/hoppity-rpc/src/types.ts:54](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L54)

Unique correlation ID to match request with response

---

### headers?

> `optional` **headers**: `Record`\<`string`, `any`\>

Defined in: [packages/hoppity-rpc/src/types.ts:62](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L62)

Optional headers for additional metadata

---

### payload

> **payload**: `any`

Defined in: [packages/hoppity-rpc/src/types.ts:58](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L58)

The request payload

---

### replyTo

> **replyTo**: `string`

Defined in: [packages/hoppity-rpc/src/types.ts:60](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L60)

The reply-to queue name for the response

---

### rpcName

> **rpcName**: `string`

Defined in: [packages/hoppity-rpc/src/types.ts:56](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L56)

The name of the RPC method being called
