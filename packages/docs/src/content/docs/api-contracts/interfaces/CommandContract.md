---
editUrl: false
next: false
prev: false
title: "CommandContract"
---

Defined in: [types.ts:36](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L36)

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

Defined in: [types.ts:42](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L42)

---

### \_name

> **\_name**: `TName`

Defined in: [types.ts:43](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L43)

---

### \_type

> **\_type**: `"command"`

Defined in: [types.ts:41](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L41)

---

### exchange

> **exchange**: `string`

Defined in: [types.ts:46](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L46)

The RabbitMQ exchange name for this domain's events and commands

---

### publicationName

> **publicationName**: `string`

Defined in: [types.ts:50](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L50)

The rascal publication name: {domain}_command_{snake_name}

---

### routingKey

> **routingKey**: `string`

Defined in: [types.ts:48](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L48)

The topic routing key: {domain}.command.{snake_name}

---

### schema

> **schema**: `TSchema`

Defined in: [types.ts:44](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L44)

---

### subscriptionName

> **subscriptionName**: `string`

Defined in: [types.ts:52](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L52)

The rascal subscription name: {domain}_command_{snake_name}
