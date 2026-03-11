---
editUrl: false
next: false
prev: false
title: "defineDomain"
---

> **defineDomain**\<`TDomain`, `TEvents`, `TCommands`, `TRpc`\>(`domainName`, `definition`): [`DomainDefinition`](/hoppity/api-contracts/interfaces/domaindefinition/)\<`TDomain`, `TEvents`, `TCommands`, `TRpc`\>

Defined in: [defineDomain.ts:26](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/defineDomain.ts#L26)

Defines a domain and returns typed contract objects for all its operations.

The returned contracts are pure data — they carry metadata and derived topology
properties (exchange, routingKey) but have no knowledge of RabbitMQ or rascal.
Topology generation happens later in buildServiceTopology.

## Type Parameters

### TDomain

`TDomain` _extends_ `string`

### TEvents

`TEvents` _extends_ [`EventsDefinition`](/hoppity/api-contracts/type-aliases/eventsdefinition/)

### TCommands

`TCommands` _extends_ [`CommandsDefinition`](/hoppity/api-contracts/type-aliases/commandsdefinition/)

### TRpc

`TRpc` _extends_ [`RpcDefinition`](/hoppity/api-contracts/type-aliases/rpcdefinition/)

## Parameters

### domainName

`TDomain`

The domain identifier. Used as a namespace for all generated
topology artifact names. Must be non-empty. Use snake_case (e.g. "donated_inventory").

### definition

[`DomainDefinitionInput`](/hoppity/api-contracts/interfaces/domaindefinitioninput/)\<`TEvents`, `TCommands`, `TRpc`\>

The event, command, and RPC operation schemas for this domain.

## Returns

[`DomainDefinition`](/hoppity/api-contracts/interfaces/domaindefinition/)\<`TDomain`, `TEvents`, `TCommands`, `TRpc`\>

A DomainDefinition with typed contract objects for each operation.
