---
editUrl: false
next: false
prev: false
title: "HandlerOptions"
---

Defined in: [types.ts:154](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L154)

Queue override options for subscriber/handler/responder declarations.
All fields are optional — omit to accept the defaults (quorum, 5 redeliveries).

## Properties

### deadLetter?

> `optional` **deadLetter**: `object`

Defined in: [types.ts:162](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L162)

Dead-letter exchange configuration

#### exchange

> **exchange**: `string`

#### routingKey?

> `optional` **routingKey**: `string`

---

### queueType?

> `optional` **queueType**: `"quorum"` \| `"classic"`

Defined in: [types.ts:156](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L156)

Queue type — defaults to "quorum"

---

### redeliveries?

> `optional` **redeliveries**: `object`

Defined in: [types.ts:158](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L158)

Redelivery limit — defaults to 5

#### limit

> **limit**: `number`
