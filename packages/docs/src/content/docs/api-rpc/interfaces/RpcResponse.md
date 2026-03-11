---
editUrl: false
next: false
prev: false
title: "RpcResponse"
---

Defined in: [packages/hoppity-rpc/src/types.ts:88](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L88)

Structure of an RPC response message.

Sent by the handler back to the requester's reply queue. Exactly one of `payload`
or `error` will be populated — `payload` for success, `error` for failure. The
`correlationId` must match the original request so the correlation manager can
route it to the correct pending promise.

## Example

```typescript
// Success response (constructed internally by the inbound handler):
const success: RpcResponse = {
    correlationId: "550e8400-e29b-41d4-a716-446655440000",
    payload: { name: "Jane Doe" },
};

// Error response:
const failure: RpcResponse = {
    correlationId: "550e8400-e29b-41d4-a716-446655440000",
    error: { code: RpcErrorCode.HANDLER_ERROR, message: "User not found" },
};
```

## Properties

### correlationId

> **correlationId**: `string`

Defined in: [packages/hoppity-rpc/src/types.ts:90](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L90)

Correlation ID matching the original request

---

### error?

> `optional` **error**: `object`

Defined in: [packages/hoppity-rpc/src/types.ts:94](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L94)

Error information (if the request failed)

#### code

> **code**: `string`

Error code for programmatic handling

#### details?

> `optional` **details**: `any`

Additional error details

#### message

> **message**: `string`

Human-readable error message

---

### headers?

> `optional` **headers**: `Record`\<`string`, `any`\>

Defined in: [packages/hoppity-rpc/src/types.ts:103](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L103)

Optional headers for additional metadata

---

### payload?

> `optional` **payload**: `any`

Defined in: [packages/hoppity-rpc/src/types.ts:92](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L92)

The response payload (if successful)
