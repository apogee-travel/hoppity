---
editUrl: false
next: false
prev: false
title: "CommandContracts"
---

> **CommandContracts**\<`TDomain`, `TCommands`\> = `{ [K in keyof TCommands]: CommandContract<TDomain, K & string, TCommands[K]> }`

Defined in: [types.ts:123](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L123)

Maps a CommandsDefinition record to its corresponding CommandContract types.

## Type Parameters

### TDomain

`TDomain` _extends_ `string`

### TCommands

`TCommands` _extends_ [`CommandsDefinition`](/hoppity/api-contracts/type-aliases/commandsdefinition/)
