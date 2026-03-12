---
editUrl: false
next: false
prev: false
title: "onRpc"
---

> **onRpc**\<`TReq`, `TRes`\>(`contract`, `handler`, `options?`): [`RpcHandlerDeclaration`](/hoppity/api/interfaces/rpchandlerdeclaration/)

Defined in: [packages/hoppity/src/handlers/onRpc.ts:15](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/handlers/onRpc.ts#L15)

Declares a typed RPC handler for use in the service config handlers array.

Both the request and response types are inferred from the contract's schemas.
The handler must return a Promise resolving to the response schema's inferred type.

## Type Parameters

### TReq

`TReq` _extends_ `ZodTypeAny`

### TRes

`TRes` _extends_ `ZodTypeAny`

## Parameters

### contract

[`RpcContract`](/hoppity/api/interfaces/rpccontract/)\<`any`, `any`, `TReq`, `TRes`\>

The RpcContract to handle

### handler

[`RpcHandler`](/hoppity/api/type-aliases/rpchandler/)\<`TReq`, `TRes`\>

The handler function

### options?

[`HandlerOptions`](/hoppity/api/interfaces/handleroptions/)

Optional queue/redelivery/dead-letter overrides

## Returns

[`RpcHandlerDeclaration`](/hoppity/api/interfaces/rpchandlerdeclaration/)
