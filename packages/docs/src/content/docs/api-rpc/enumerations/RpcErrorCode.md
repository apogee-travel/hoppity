---
editUrl: false
next: false
prev: false
title: "RpcErrorCode"
---

Defined in: [packages/hoppity-rpc/src/types.ts:172](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L172)

Standard RPC error codes.

These are the `code` values that appear in `RpcResponse.error.code`.
They're strings (not numeric) so they're human-readable in logs and
don't collide with HTTP status codes or AMQP reply codes.

## Enumeration Members

### CANCELLED

> **CANCELLED**: `"RPC_CANCELLED"`

Defined in: [packages/hoppity-rpc/src/types.ts:180](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L180)

Request was cancelled

---

### HANDLER_ERROR

> **HANDLER_ERROR**: `"RPC_HANDLER_ERROR"`

Defined in: [packages/hoppity-rpc/src/types.ts:178](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L178)

Error occurred in the RPC handler

---

### METHOD_NOT_FOUND

> **METHOD_NOT_FOUND**: `"RPC_METHOD_NOT_FOUND"`

Defined in: [packages/hoppity-rpc/src/types.ts:176](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L176)

RPC method not found

---

### SERVICE_UNAVAILABLE

> **SERVICE_UNAVAILABLE**: `"RPC_SERVICE_UNAVAILABLE"`

Defined in: [packages/hoppity-rpc/src/types.ts:182](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L182)

Service unavailable

---

### TIMEOUT

> **TIMEOUT**: `"RPC_TIMEOUT"`

Defined in: [packages/hoppity-rpc/src/types.ts:174](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L174)

Request timed out
