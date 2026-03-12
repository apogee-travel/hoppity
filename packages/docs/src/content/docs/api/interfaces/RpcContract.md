---
editUrl: false
next: false
prev: false
title: "RpcContract"
---

Defined in: [packages/hoppity/src/contracts/types.ts:83](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/contracts/types.ts#L83)

A contract describing a domain RPC operation — a synchronous request/response.

RPC operations get their own exchange ({domain}\_rpc) to keep request/reply
mechanics separate from pub/sub event routing.

## Type Parameters

### TDomain

`TDomain` _extends_ `string` = `string`

### TName

`TName` _extends_ `string` = `string`

### TRequest

`TRequest` _extends_ `ZodTypeAny` = `ZodTypeAny`

### TResponse

`TResponse` _extends_ `ZodTypeAny` = `ZodTypeAny`

## Properties

### \_domain

> **\_domain**: `TDomain`

Defined in: [packages/hoppity/src/contracts/types.ts:90](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/contracts/types.ts#L90)

---

### \_name

> **\_name**: `TName`

Defined in: [packages/hoppity/src/contracts/types.ts:91](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/contracts/types.ts#L91)

---

### \_type

> **\_type**: `"rpc"`

Defined in: [packages/hoppity/src/contracts/types.ts:89](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/contracts/types.ts#L89)

---

### exchange

> **exchange**: `string`

Defined in: [packages/hoppity/src/contracts/types.ts:95](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/contracts/types.ts#L95)

The RPC exchange name: {domain}\_rpc

---

### publicationName

> **publicationName**: `string`

Defined in: [packages/hoppity/src/contracts/types.ts:99](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/contracts/types.ts#L99)

The rascal publication name: {domain}_rpc_{snake_name}

---

### requestSchema

> **requestSchema**: `TRequest`

Defined in: [packages/hoppity/src/contracts/types.ts:92](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/contracts/types.ts#L92)

---

### responseSchema

> **responseSchema**: `TResponse`

Defined in: [packages/hoppity/src/contracts/types.ts:93](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/contracts/types.ts#L93)

---

### routingKey

> **routingKey**: `string`

Defined in: [packages/hoppity/src/contracts/types.ts:97](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/contracts/types.ts#L97)

The topic routing key: {domain}.rpc.{snake_name}

---

### subscriptionName

> **subscriptionName**: `string`

Defined in: [packages/hoppity/src/contracts/types.ts:101](https://github.com/apogee-travel/hoppity/blob/ad178a967c807167b2308ad04f8d6ce79450207d/packages/hoppity/src/contracts/types.ts#L101)

The rascal subscription name: {domain}_rpc_{snake_name}
