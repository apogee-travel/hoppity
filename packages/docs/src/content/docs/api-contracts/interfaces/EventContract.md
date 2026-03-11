---
editUrl: false
next: false
prev: false
title: "EventContract"
---

Defined in: [types.ts:11](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L11)

A contract describing a domain event — something that happened.

TDomain: the domain name literal (e.g. "donated_inventory")
TName: the operation name literal (e.g. "created")
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

Defined in: [types.ts:17](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L17)

---

### \_name

> **\_name**: `TName`

Defined in: [types.ts:18](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L18)

---

### \_type

> **\_type**: `"event"`

Defined in: [types.ts:16](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L16)

---

### exchange

> **exchange**: `string`

Defined in: [types.ts:21](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L21)

The RabbitMQ exchange name for this domain's events and commands

---

### publicationName

> **publicationName**: `string`

Defined in: [types.ts:25](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L25)

The rascal publication name: {domain}_event_{snake_name}

---

### routingKey

> **routingKey**: `string`

Defined in: [types.ts:23](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L23)

The topic routing key: {domain}.event.{snake_name}

---

### schema

> **schema**: `TSchema`

Defined in: [types.ts:19](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L19)

---

### subscriptionName

> **subscriptionName**: `string`

Defined in: [types.ts:27](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L27)

The rascal subscription name: {domain}_event_{snake_name}
