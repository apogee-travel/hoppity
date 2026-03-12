---
editUrl: false
next: false
prev: false
title: "onEvent"
---

> **onEvent**\<`TSchema`\>(`contract`, `handler`, `options?`): [`EventHandlerDeclaration`](/hoppity/api/interfaces/eventhandlerdeclaration/)

Defined in: [packages/hoppity/src/handlers/onEvent.ts:16](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/handlers/onEvent.ts#L16)

Declares a typed event handler for use in the service config handlers array.

The handler's content parameter type is inferred from the contract's schema,
so passing a handler whose content type doesn't match the event schema is a
compile-time error rather than a runtime surprise.

## Type Parameters

### TSchema

`TSchema` _extends_ `ZodTypeAny`

## Parameters

### contract

[`EventContract`](/hoppity/api/interfaces/eventcontract/)\<`any`, `any`, `TSchema`\>

The EventContract to handle

### handler

[`EventHandler`](/hoppity/api/type-aliases/eventhandler/)\<`TSchema`\>

The handler function

### options?

[`HandlerOptions`](/hoppity/api/interfaces/handleroptions/)

Optional queue/redelivery/dead-letter overrides

## Returns

[`EventHandlerDeclaration`](/hoppity/api/interfaces/eventhandlerdeclaration/)
