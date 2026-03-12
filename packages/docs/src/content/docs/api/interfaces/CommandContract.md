---
editUrl: false
next: false
prev: false
title: "CommandContract"
---

Defined in: packages/hoppity/src/contracts/types.ts:53

A contract describing a domain command — an instruction to do something.

Shape is identical to EventContract but semantically distinct: commands are
imperatives directed at a service, events are facts broadcast to the world.

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

Defined in: packages/hoppity/src/contracts/types.ts:59

---

### \_name

> **\_name**: `TName`

Defined in: packages/hoppity/src/contracts/types.ts:60

---

### \_type

> **\_type**: `"command"`

Defined in: packages/hoppity/src/contracts/types.ts:58

---

### delay?

> `optional` **delay**: [`DelayConfig`](/hoppity/api/type-aliases/delayconfig/)

Defined in: packages/hoppity/src/contracts/types.ts:74

Delayed delivery configuration. Present only when the contract was declared
with `delay: true` or `delay: { default: N }` in defineDomain.

---

### exchange

> **exchange**: `string`

Defined in: packages/hoppity/src/contracts/types.ts:63

The RabbitMQ exchange name for this domain's events and commands

---

### publicationName

> **publicationName**: `string`

Defined in: packages/hoppity/src/contracts/types.ts:67

The rascal publication name: {domain}_command_{snake_name}

---

### routingKey

> **routingKey**: `string`

Defined in: packages/hoppity/src/contracts/types.ts:65

The topic routing key: {domain}.command.{snake_name}

---

### schema

> **schema**: `TSchema`

Defined in: packages/hoppity/src/contracts/types.ts:61

---

### subscriptionName

> **subscriptionName**: `string`

Defined in: packages/hoppity/src/contracts/types.ts:69

The rascal subscription name: {domain}_command_{snake_name}
