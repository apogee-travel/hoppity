---
editUrl: false
next: false
prev: false
title: "CommandContract"
---

Defined in: [packages/hoppity/src/contracts/types.ts:53](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/contracts/types.ts#L53)

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

Defined in: [packages/hoppity/src/contracts/types.ts:59](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/contracts/types.ts#L59)

---

### \_name

> **\_name**: `TName`

Defined in: [packages/hoppity/src/contracts/types.ts:60](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/contracts/types.ts#L60)

---

### \_type

> **\_type**: `"command"`

Defined in: [packages/hoppity/src/contracts/types.ts:58](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/contracts/types.ts#L58)

---

### delay?

> `optional` **delay**: [`DelayConfig`](/hoppity/api/type-aliases/delayconfig/)

Defined in: [packages/hoppity/src/contracts/types.ts:74](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/contracts/types.ts#L74)

Delayed delivery configuration. Present only when the contract was declared
with `delay: true` or `delay: { default: N }` in defineDomain.

---

### exchange

> **exchange**: `string`

Defined in: [packages/hoppity/src/contracts/types.ts:63](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/contracts/types.ts#L63)

The RabbitMQ exchange name for this domain's events and commands

---

### publicationName

> **publicationName**: `string`

Defined in: [packages/hoppity/src/contracts/types.ts:67](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/contracts/types.ts#L67)

The rascal publication name: {domain}_command_{snake_name}

---

### routingKey

> **routingKey**: `string`

Defined in: [packages/hoppity/src/contracts/types.ts:65](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/contracts/types.ts#L65)

The topic routing key: {domain}.command.{snake_name}

---

### schema

> **schema**: `TSchema`

Defined in: [packages/hoppity/src/contracts/types.ts:61](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/contracts/types.ts#L61)

---

### subscriptionName

> **subscriptionName**: `string`

Defined in: [packages/hoppity/src/contracts/types.ts:69](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/contracts/types.ts#L69)

The rascal subscription name: {domain}_command_{snake_name}
