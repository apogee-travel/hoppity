---
editUrl: false
next: false
prev: false
title: "withOperations"
---

> **withOperations**(`options`): `MiddlewareFunction`

Defined in: [packages/hoppity-operations/src/withOperations.ts:24](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/withOperations.ts#L24)

Middleware factory that wires contract-based operations into the broker.

Topology phase: adds RPC reply infrastructure (reply queue + subscription +
rpc_reply publication) when any RpcHandlerDeclaration is present, then stores
config in context.data for diagnostics.

onBrokerCreated phase: subscribes event/command/rpc handlers and extends the
broker with publishEvent, sendCommand, request, and cancelRequest methods.

## Parameters

### options

[`OperationsMiddlewareOptions`](/hoppity/api-operations/interfaces/operationsmiddlewareoptions/)

## Returns

`MiddlewareFunction`
