---
editUrl: false
next: false
prev: false
title: "onCommand"
---

> **onCommand**\<`TSchema`\>(`contract`, `handler`): [`CommandHandlerDeclaration`](/hoppity/api-operations/interfaces/commandhandlerdeclaration/)

Defined in: [packages/hoppity-operations/src/handlers.ts:36](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/handlers.ts#L36)

Declares a typed command handler for use in withOperations middleware config.

Same type-inference behavior as onEvent — the contract's schema drives the
handler's content type.

## Type Parameters

### TSchema

`TSchema` _extends_ `ZodTypeAny`

## Parameters

### contract

`CommandContract`\<`any`, `any`, `TSchema`\>

### handler

[`CommandHandler`](/hoppity/api-operations/type-aliases/commandhandler/)\<`TSchema`\>

## Returns

[`CommandHandlerDeclaration`](/hoppity/api-operations/interfaces/commandhandlerdeclaration/)
