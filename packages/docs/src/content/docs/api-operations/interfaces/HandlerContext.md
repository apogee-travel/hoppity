---
editUrl: false
next: false
prev: false
title: "HandlerContext"
---

Defined in: [packages/hoppity-operations/src/types.ts:15](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/types.ts#L15)

Context object passed to every handler invocation.
Gives handlers access to the extended broker for outbound operations
(e.g., publishing follow-up events from within a command handler).

## Properties

### broker

> **broker**: [`OperationsBroker`](/hoppity/api-operations/interfaces/operationsbroker/)

Defined in: [packages/hoppity-operations/src/types.ts:16](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-operations/src/types.ts#L16)
