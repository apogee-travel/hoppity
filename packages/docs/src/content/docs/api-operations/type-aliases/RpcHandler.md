---
editUrl: false
next: false
prev: false
title: "RpcHandler"
---

> **RpcHandler**\<`TReq`, `TRes`\> = (`request`, `context`) => `Promise`\<`z.infer`\<`TRes`\>\>

Defined in: [packages/hoppity-operations/src/types.ts:48](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/types.ts#L48)

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

[`HandlerContext`](/hoppity/api-operations/interfaces/handlercontext/)

## Returns

`Promise`\<`z.infer`\<`TRes`\>\>
