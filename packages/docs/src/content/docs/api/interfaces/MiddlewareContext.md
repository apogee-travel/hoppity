---
editUrl: false
next: false
prev: false
title: "MiddlewareContext"
---

Defined in: [types.ts:90](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/types.ts#L90)

Context object passed to middleware functions for sharing state.
This allows middleware to communicate and share information with downstream middleware.

MiddlewareContext

## Properties

### data

> **data**: `Record`\<`string`, `any`\>

Defined in: [types.ts:91](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/types.ts#L91)

Arbitrary data that can be set and read by middleware

---

### logger

> **logger**: [`Logger`](/hoppity/api/interfaces/logger/)

Defined in: [types.ts:93](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/types.ts#L93)

Logger instance for middleware to use

---

### middlewareNames

> **middlewareNames**: `string`[]

Defined in: [types.ts:92](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/types.ts#L92)

Names of middleware that have already executed
