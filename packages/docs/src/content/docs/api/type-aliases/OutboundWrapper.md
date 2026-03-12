---
editUrl: false
next: false
prev: false
title: "OutboundWrapper"
---

> **OutboundWrapper** = (`publish`, `metadata`) => (`message`, `overrides?`) => `Promise`\<`any`\>

Defined in: [packages/hoppity/src/interceptors/types.ts:63](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/interceptors/types.ts#L63)

Wraps a publish function. Receives the inner publish and metadata about
the contract being published to. Returns a replacement publish with the same signature.

The wrapper can modify the message, inject headers into overrides,
create spans, record metrics, or short-circuit the publish.

Composition: for interceptors [A, B], the call chain is A → B → rascal publish.

## Parameters

### publish

(`message`, `overrides?`) => `Promise`\<`any`\>

### metadata

[`OutboundMetadata`](/hoppity/api/interfaces/outboundmetadata/)

## Returns

> (`message`, `overrides?`): `Promise`\<`any`\>

### Parameters

#### message

`any`

#### overrides?

`PublicationConfig`

### Returns

`Promise`\<`any`\>
