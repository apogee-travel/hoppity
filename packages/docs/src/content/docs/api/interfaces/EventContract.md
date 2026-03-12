---
editUrl: false
next: false
prev: false
title: "EventContract"
---

Defined in: packages/hoppity/src/contracts/types.ts:23

A contract describing a domain event — something that happened.

TDomain: the domain name literal (e.g. "orders")
TName: the operation name literal (e.g. "orderCreated")
TSchema: the zod schema for the event payload

## Type Parameters

### TDomain

`TDomain` _extends_ `string` = `string`

### TName

`TName` _extends_ `string` = `string`

### TSchema

`TSchema` _extends_ `ZodTypeAny` = `ZodTypeAny`

## Properties

### \_domain

> **\_domain**: `TDomain`

Defined in: packages/hoppity/src/contracts/types.ts:29

---

### \_name

> **\_name**: `TName`

Defined in: packages/hoppity/src/contracts/types.ts:30

---

### \_type

> **\_type**: `"event"`

Defined in: packages/hoppity/src/contracts/types.ts:28

---

### delay?

> `optional` **delay**: [`DelayConfig`](/hoppity/api/type-aliases/delayconfig/)

Defined in: packages/hoppity/src/contracts/types.ts:44

Delayed delivery configuration. Present only when the contract was declared
with `delay: true` or `delay: { default: N }` in defineDomain.

---

### exchange

> **exchange**: `string`

Defined in: packages/hoppity/src/contracts/types.ts:33

The RabbitMQ exchange name for this domain's events and commands

---

### publicationName

> **publicationName**: `string`

Defined in: packages/hoppity/src/contracts/types.ts:37

The rascal publication name: {domain}_event_{snake_name}

---

### routingKey

> **routingKey**: `string`

Defined in: packages/hoppity/src/contracts/types.ts:35

The topic routing key: {domain}.event.{snake_name}

---

### schema

> **schema**: `TSchema`

Defined in: packages/hoppity/src/contracts/types.ts:31

---

### subscriptionName

> **subscriptionName**: `string`

Defined in: packages/hoppity/src/contracts/types.ts:39

The rascal subscription name: {domain}_event_{snake_name}
