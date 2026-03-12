---
editUrl: false
next: false
prev: false
title: "InboundWrapper"
---

> **InboundWrapper** = (`handler`, `metadata`) => (`payload`, `context`) => `Promise`\<`any`\>

Defined in: [packages/hoppity/src/interceptors/types.ts:49](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/interceptors/types.ts#L49)

Wraps a handler function. Receives the original handler and per-message metadata.
Returns a replacement handler with the same signature.

Composition: for interceptors [A, B], the call chain is A → B → handler.
A wraps B which wraps the original handler — unwinding goes B → A on return/throw.

Metadata is built per-message because headers vary per message.
The wrapper itself is called per-message with fresh metadata each time.

## Parameters

### handler

(`payload`, `context`) => `Promise`\<`any`\>

### metadata

[`InboundMetadata`](/hoppity/api/interfaces/inboundmetadata/)

## Returns

> (`payload`, `context`): `Promise`\<`any`\>

### Parameters

#### payload

`any`

#### context

[`HandlerContext`](/hoppity/api/interfaces/handlercontext/)

### Returns

`Promise`\<`any`\>
