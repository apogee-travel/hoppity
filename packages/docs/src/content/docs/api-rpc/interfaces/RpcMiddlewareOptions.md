---
editUrl: false
next: false
prev: false
title: "RpcMiddlewareOptions"
---

Defined in: [packages/hoppity-rpc/src/types.ts:22](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L22)

Configuration options for the RPC middleware.

`serviceName` drives queue naming and routing key generation — it determines which
inbound messages this service receives. `instanceId` ensures each running instance
gets its own exclusive queues, so multiple instances of the same service can coexist
without stealing each other's replies.

## Example

```typescript
const options: RpcMiddlewareOptions = {
    serviceName: "hotel-service",
    instanceId: randomUUID(),
    rpcExchange: "my_rpc_exchange", // optional, defaults to "rpc_requests"
    defaultTimeout: 15_000, // optional, defaults to 30_000
};
```

## Properties

### defaultTimeout?

> `optional` **defaultTimeout**: `number`

Defined in: [packages/hoppity-rpc/src/types.ts:30](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L30)

Default timeout for RPC requests in milliseconds (defaults to 30_000)

---

### instanceId

> **instanceId**: `string`

Defined in: [packages/hoppity-rpc/src/types.ts:26](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L26)

Unique instance identifier (should be different for each service instance)

---

### rpcExchange?

> `optional` **rpcExchange**: `string`

Defined in: [packages/hoppity-rpc/src/types.ts:28](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L28)

The name of the RPC exchange to use for routing RPC messages (defaults to "rpc_requests")

---

### serviceName

> **serviceName**: `string`

Defined in: [packages/hoppity-rpc/src/types.ts:24](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/types.ts#L24)

The name of the service (used for queue naming and routing)
