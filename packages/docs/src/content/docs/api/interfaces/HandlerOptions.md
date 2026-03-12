---
editUrl: false
next: false
prev: false
title: "HandlerOptions"
---

Defined in: packages/hoppity/src/contracts/types.ts:250

Queue override options for handler declarations.
All fields are optional — omit to accept the defaults (quorum, 5 redeliveries).

## Properties

### deadLetter?

> `optional` **deadLetter**: `object`

Defined in: packages/hoppity/src/contracts/types.ts:258

Dead-letter exchange configuration

#### exchange

> **exchange**: `string`

#### routingKey?

> `optional` **routingKey**: `string`

---

### queueType?

> `optional` **queueType**: `"quorum"` \| `"classic"`

Defined in: packages/hoppity/src/contracts/types.ts:252

Queue type — defaults to "quorum"

---

### redeliveries?

> `optional` **redeliveries**: `object`

Defined in: packages/hoppity/src/contracts/types.ts:254

Redelivery limit — defaults to 5

#### limit

> **limit**: `number`
