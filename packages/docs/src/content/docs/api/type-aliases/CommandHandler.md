---
editUrl: false
next: false
prev: false
title: "CommandHandler"
---

> **CommandHandler**\<`TSchema`\> = (`content`, `context`) => `Promise`\<`void`\> \| `void`

Defined in: [packages/hoppity/src/handlers/types.ts:69](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/handlers/types.ts#L69)

Handler for domain commands. May be sync or async — auto-acked on success.

## Type Parameters

### TSchema

`TSchema` _extends_ `ZodTypeAny`

The Zod schema from the CommandContract

## Parameters

### content

`z.infer`\<`TSchema`\>

### context

[`HandlerContext`](/hoppity/api/interfaces/handlercontext/)

## Returns

`Promise`\<`void`\> \| `void`
