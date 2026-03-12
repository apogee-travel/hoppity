---
editUrl: false
next: false
prev: false
title: "CommandHandler"
---

> **CommandHandler**\<`TSchema`\> = (`content`, `context`) => `Promise`\<`void`\> \| `void`

Defined in: [packages/hoppity/src/handlers/types.ts:69](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/handlers/types.ts#L69)

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
