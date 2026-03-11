---
editUrl: false
next: false
prev: false
title: "OperationsMiddlewareOptions"
---

Defined in: [packages/hoppity-operations/src/types.ts:94](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/types.ts#L94)

Configuration for the [withOperations](/hoppity/api-operations/functions/withoperations/) middleware factory.
All handlers must be declared upfront — dynamic registration after broker creation is not supported.

## Properties

### defaultTimeout?

> `optional` **defaultTimeout**: `number`

Defined in: [packages/hoppity-operations/src/types.ts:99](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/types.ts#L99)

Default RPC timeout in ms (defaults to 30_000)

---

### handlers

> **handlers**: [`HandlerDeclaration`](/hoppity/api-operations/type-aliases/handlerdeclaration/)[]

Defined in: [packages/hoppity-operations/src/types.ts:97](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/types.ts#L97)

---

### instanceId

> **instanceId**: `string`

Defined in: [packages/hoppity-operations/src/types.ts:96](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/types.ts#L96)

---

### serviceName

> **serviceName**: `string`

Defined in: [packages/hoppity-operations/src/types.ts:95](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/types.ts#L95)

---

### validateInbound?

> `optional` **validateInbound**: `boolean`

Defined in: [packages/hoppity-operations/src/types.ts:101](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/types.ts#L101)

Validate inbound payloads against contract schemas (defaults to true)

---

### validateOutbound?

> `optional` **validateOutbound**: `boolean`

Defined in: [packages/hoppity-operations/src/types.ts:103](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/types.ts#L103)

Validate outbound payloads against contract schemas (defaults to false)
