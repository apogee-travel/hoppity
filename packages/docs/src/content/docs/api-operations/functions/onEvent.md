---
editUrl: false
next: false
prev: false
title: "onEvent"
---

> **onEvent**\<`TSchema`\>(`contract`, `handler`): [`EventHandlerDeclaration`](/hoppity/api-operations/interfaces/eventhandlerdeclaration/)

Defined in: [packages/hoppity-operations/src/handlers.ts:19](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/handlers.ts#L19)

Declares a typed event handler for use in withOperations middleware config.

The handler's content parameter type is inferred from the contract's schema,
so passing a handler whose content type doesn't match the event schema is a
compile-time error rather than a runtime surprise.

## Type Parameters

### TSchema

`TSchema` _extends_ `ZodTypeAny`

## Parameters

### contract

`EventContract`\<`any`, `any`, `TSchema`\>

### handler

[`EventHandler`](/hoppity/api-operations/type-aliases/eventhandler/)\<`TSchema`\>

## Returns

[`EventHandlerDeclaration`](/hoppity/api-operations/interfaces/eventhandlerdeclaration/)
