---
editUrl: false
next: false
prev: false
title: "onRpc"
---

> **onRpc**\<`TReq`, `TRes`\>(`contract`, `handler`): [`RpcHandlerDeclaration`](/hoppity/api-operations/interfaces/rpchandlerdeclaration/)

Defined in: [packages/hoppity-operations/src/handlers.ts:53](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/handlers.ts#L53)

Declares a typed RPC handler for use in withOperations middleware config.

Both the request and response types are inferred from the contract's schemas.
The handler must return a Promise resolving to the response schema's inferred type.

## Type Parameters

### TReq

`TReq` _extends_ `ZodTypeAny`

### TRes

`TRes` _extends_ `ZodTypeAny`

## Parameters

### contract

`RpcContract`\<`any`, `any`, `TReq`, `TRes`\>

### handler

[`RpcHandler`](/hoppity/api-operations/type-aliases/rpchandler/)\<`TReq`, `TRes`\>

## Returns

[`RpcHandlerDeclaration`](/hoppity/api-operations/interfaces/rpchandlerdeclaration/)
