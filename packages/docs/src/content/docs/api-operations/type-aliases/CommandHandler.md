---
editUrl: false
next: false
prev: false
title: "CommandHandler"
---

> **CommandHandler**\<`TSchema`\> = (`content`, `context`) => `Promise`\<`void`\> \| `void`

Defined in: [packages/hoppity-operations/src/types.ts:38](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/types.ts#L38)

Handler for domain commands. May be sync or async — auto-acked on success.

## Type Parameters

### TSchema

`TSchema` _extends_ `ZodTypeAny`

The Zod schema from the CommandContract

## Parameters

### content

`z.infer`\<`TSchema`\>

### context

[`HandlerContext`](/hoppity/api-operations/interfaces/handlercontext/)

## Returns

`Promise`\<`void`\> \| `void`
