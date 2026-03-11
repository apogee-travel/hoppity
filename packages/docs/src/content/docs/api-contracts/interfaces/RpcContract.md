---
editUrl: false
next: false
prev: false
title: "RpcContract"
---

Defined in: [types.ts:61](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L61)

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

Defined in: [types.ts:68](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L68)

---

### \_name

> **\_name**: `TName`

Defined in: [types.ts:69](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L69)

---

### \_type

> **\_type**: `"rpc"`

Defined in: [types.ts:67](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L67)

---

### exchange

> **exchange**: `string`

Defined in: [types.ts:73](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L73)

The RPC exchange name: {domain}\_rpc

---

### publicationName

> **publicationName**: `string`

Defined in: [types.ts:77](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L77)

The rascal publication name: {domain}_rpc_{snake_name}

---

### requestSchema

> **requestSchema**: `TRequest`

Defined in: [types.ts:70](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L70)

---

### responseSchema

> **responseSchema**: `TResponse`

Defined in: [types.ts:71](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L71)

---

### routingKey

> **routingKey**: `string`

Defined in: [types.ts:75](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L75)

The topic routing key: {domain}.rpc.{snake_name}

---

### subscriptionName

> **subscriptionName**: `string`

Defined in: [types.ts:79](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L79)

The rascal subscription name: {domain}_rpc_{snake_name}
