---
editUrl: false
next: false
prev: false
title: "withRpcSupport"
---

> **withRpcSupport**(`options`): `MiddlewareFunction`

Defined in: [packages/hoppity-rpc/src/withRpcSupport.ts:24](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-rpc/src/withRpcSupport.ts#L24)

Middleware factory that adds RPC capabilities to a hoppity broker

This middleware:

1. Adds an RPC exchange to the topology
2. Creates reply and inbound queues for the service
3. Sets up bindings and subscriptions
4. Extends the broker with RPC methods (request, addRpcListener, cancelRequest)

## Parameters

### options

[`RpcMiddlewareOptions`](/hoppity/api-rpc/interfaces/rpcmiddlewareoptions/)

Configuration options for the RPC middleware

## Returns

`MiddlewareFunction`

A middleware function that can be used with hoppity
