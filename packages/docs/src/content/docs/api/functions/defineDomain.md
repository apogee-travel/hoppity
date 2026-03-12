---
editUrl: false
next: false
prev: false
title: "defineDomain"
---

> **defineDomain**\<`TDomain`, `TEvents`, `TCommands`, `TRpc`\>(`domainName`, `definition`): [`DomainDefinition`](/hoppity/api/interfaces/domaindefinition/)\<`TDomain`, `TEvents`, `TCommands`, `TRpc`\>

Defined in: packages/hoppity/src/contracts/defineDomain.ts:50

Defines a domain and returns typed contract objects for all its operations.

The returned contracts are pure data — they carry metadata and derived topology
properties (exchange, routingKey) but have no knowledge of RabbitMQ or rascal.
Topology generation happens later in ServiceBuilder.

Accepts both bare Zod schemas and extended { schema, ...options } objects for
each operation, enabling future per-operation options (e.g. partitionBy) without
a breaking API change.

## Type Parameters

### TDomain

`TDomain` _extends_ `string`

### TEvents

`TEvents` _extends_ [`EventsDefinition`](/hoppity/api/type-aliases/eventsdefinition/)

### TCommands

`TCommands` _extends_ [`CommandsDefinition`](/hoppity/api/type-aliases/commandsdefinition/)

### TRpc

`TRpc` _extends_ [`RpcDefinition`](/hoppity/api/type-aliases/rpcdefinition/)

## Parameters

### domainName

`TDomain`

The domain identifier. Used as a namespace for all generated
topology artifact names. Must be non-empty.

### definition

[`DomainDefinitionInput`](/hoppity/api/interfaces/domaindefinitioninput/)\<`TEvents`, `TCommands`, `TRpc`\>

The event, command, and RPC operation schemas for this domain.

## Returns

[`DomainDefinition`](/hoppity/api/interfaces/domaindefinition/)\<`TDomain`, `TEvents`, `TCommands`, `TRpc`\>

A DomainDefinition with typed contract objects for each operation.
