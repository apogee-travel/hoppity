---
editUrl: false
next: false
prev: false
title: "DomainDefinition"
---

Defined in: [types.ts:138](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L138)

The return type of defineDomain. Groups all contracts for a domain under
their operation-type namespaces.

## Type Parameters

### TDomain

`TDomain` _extends_ `string` = `string`

### TEvents

`TEvents` _extends_ [`EventsDefinition`](/hoppity/api-contracts/type-aliases/eventsdefinition/) = [`EventsDefinition`](/hoppity/api-contracts/type-aliases/eventsdefinition/)

### TCommands

`TCommands` _extends_ [`CommandsDefinition`](/hoppity/api-contracts/type-aliases/commandsdefinition/) = [`CommandsDefinition`](/hoppity/api-contracts/type-aliases/commandsdefinition/)

### TRpc

`TRpc` _extends_ [`RpcDefinition`](/hoppity/api-contracts/type-aliases/rpcdefinition/) = [`RpcDefinition`](/hoppity/api-contracts/type-aliases/rpcdefinition/)

## Properties

### commands

> **commands**: [`CommandContracts`](/hoppity/api-contracts/type-aliases/commandcontracts/)\<`TDomain`, `TCommands`\>

Defined in: [types.ts:146](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L146)

---

### domain

> **domain**: `TDomain`

Defined in: [types.ts:144](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L144)

---

### events

> **events**: [`EventContracts`](/hoppity/api-contracts/type-aliases/eventcontracts/)\<`TDomain`, `TEvents`\>

Defined in: [types.ts:145](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L145)

---

### rpc

> **rpc**: [`RpcContracts`](/hoppity/api-contracts/type-aliases/rpccontracts/)\<`TDomain`, `TRpc`\>

Defined in: [types.ts:147](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L147)
