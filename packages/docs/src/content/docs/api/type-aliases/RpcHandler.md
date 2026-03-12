---
editUrl: false
next: false
prev: false
title: "RpcHandler"
---

> **RpcHandler**\<`TReq`, `TRes`\> = (`request`, `context`) => `Promise`\<`z.infer`\<`TRes`\>\>

Defined in: packages/hoppity/src/handlers/types.ts:79

Handler for RPC operations. Must be async and return the response type.

## Type Parameters

### TReq

`TReq` _extends_ `ZodTypeAny`

The Zod schema for the request payload

### TRes

`TRes` _extends_ `ZodTypeAny`

The Zod schema for the response payload

## Parameters

### request

`z.infer`\<`TReq`\>

### context

[`HandlerContext`](/hoppity/api/interfaces/handlercontext/)

## Returns

`Promise`\<`z.infer`\<`TRes`\>\>
