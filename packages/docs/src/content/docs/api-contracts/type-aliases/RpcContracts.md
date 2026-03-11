---
editUrl: false
next: false
prev: false
title: "RpcContracts"
---

> **RpcContracts**\<`TDomain`, `TRpc`\> = `{ [K in keyof TRpc]: RpcContract<TDomain, K & string, TRpc[K]["request"], TRpc[K]["response"]> }`

Defined in: [types.ts:130](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L130)

Maps an RpcDefinition record to its corresponding RpcContract types.

## Type Parameters

### TDomain

`TDomain` _extends_ `string`

### TRpc

`TRpc` _extends_ [`RpcDefinition`](/hoppity/api-contracts/type-aliases/rpcdefinition/)
