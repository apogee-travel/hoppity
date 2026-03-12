---
editUrl: false
next: false
prev: false
title: "DomainDefinition"
---

Defined in: [packages/hoppity/src/contracts/types.ts:234](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/contracts/types.ts#L234)

The return type of defineDomain. Groups all contracts for a domain under
their operation-type namespaces.

## Type Parameters

### TDomain

`TDomain` _extends_ `string` = `string`

### TEvents

`TEvents` _extends_ [`EventsDefinition`](/hoppity/api/type-aliases/eventsdefinition/) = [`EventsDefinition`](/hoppity/api/type-aliases/eventsdefinition/)

### TCommands

`TCommands` _extends_ [`CommandsDefinition`](/hoppity/api/type-aliases/commandsdefinition/) = [`CommandsDefinition`](/hoppity/api/type-aliases/commandsdefinition/)

### TRpc

`TRpc` _extends_ [`RpcDefinition`](/hoppity/api/type-aliases/rpcdefinition/) = [`RpcDefinition`](/hoppity/api/type-aliases/rpcdefinition/)

## Properties

### commands

> **commands**: `CommandContracts`\<`TDomain`, `TCommands`\>

Defined in: [packages/hoppity/src/contracts/types.ts:242](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/contracts/types.ts#L242)

---

### domain

> **domain**: `TDomain`

Defined in: [packages/hoppity/src/contracts/types.ts:240](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/contracts/types.ts#L240)

---

### events

> **events**: `EventContracts`\<`TDomain`, `TEvents`\>

Defined in: [packages/hoppity/src/contracts/types.ts:241](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/contracts/types.ts#L241)

---

### rpc

> **rpc**: `RpcContracts`\<`TDomain`, `TRpc`\>

Defined in: [packages/hoppity/src/contracts/types.ts:243](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/contracts/types.ts#L243)
