---
editUrl: false
next: false
prev: false
title: "MiddlewareContext"
---

Defined in: [packages/hoppity/src/types.ts:85](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/types.ts#L85)

Context object passed to middleware functions for sharing state.
This allows middleware to communicate and share information with downstream middleware.

MiddlewareContext

## Properties

### data

> **data**: `Record`\<`string`, `any`\>

Defined in: [packages/hoppity/src/types.ts:86](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/types.ts#L86)

Arbitrary data that can be set and read by middleware

---

### logger

> **logger**: [`Logger`](/hoppity/api/interfaces/logger/)

Defined in: [packages/hoppity/src/types.ts:88](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/types.ts#L88)

Logger instance for middleware to use

---

### middlewareNames

> **middlewareNames**: `string`[]

Defined in: [packages/hoppity/src/types.ts:87](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/types.ts#L87)

Names of middleware that have already executed

---

### serviceName?

> `optional` **serviceName**: `string`

Defined in: [packages/hoppity/src/types.ts:89](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/types.ts#L89)

The service name, populated by ServiceBuilder
