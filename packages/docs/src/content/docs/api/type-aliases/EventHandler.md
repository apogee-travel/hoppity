---
editUrl: false
next: false
prev: false
title: "EventHandler"
---

> **EventHandler**\<`TSchema`\> = (`content`, `context`) => `Promise`\<`void`\> \| `void`

Defined in: [packages/hoppity/src/handlers/types.ts:60](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/handlers/types.ts#L60)

Handler for domain events. May be sync or async — auto-acked on success.

## Type Parameters

### TSchema

`TSchema` _extends_ `ZodTypeAny`

The Zod schema from the EventContract

## Parameters

### content

`z.infer`\<`TSchema`\>

### context

[`HandlerContext`](/hoppity/api/interfaces/handlercontext/)

## Returns

`Promise`\<`void`\> \| `void`
