---
editUrl: false
next: false
prev: false
title: "EventHandler"
---

> **EventHandler**\<`TSchema`\> = (`content`, `context`) => `Promise`\<`void`\> \| `void`

Defined in: [packages/hoppity-operations/src/types.ts:29](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/types.ts#L29)

Handler for domain events. May be sync or async — auto-acked on success.

## Type Parameters

### TSchema

`TSchema` _extends_ `ZodTypeAny`

The Zod schema from the EventContract

## Parameters

### content

`z.infer`\<`TSchema`\>

### context

[`HandlerContext`](/hoppity/api-operations/interfaces/handlercontext/)

## Returns

`Promise`\<`void`\> \| `void`
