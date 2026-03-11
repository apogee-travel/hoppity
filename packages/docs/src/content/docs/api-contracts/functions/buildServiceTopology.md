---
editUrl: false
next: false
prev: false
title: "buildServiceTopology"
---

> **buildServiceTopology**(`initialTopology`, `serviceName`, `configure`): `BrokerConfig`

Defined in: [buildServiceTopology.ts:223](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/buildServiceTopology.ts#L223)

Generates topology for a service's messaging roles against domain contracts.

Takes an initial BrokerConfig (which carries vhost and connection config),
a service name, and a configure callback. The callback receives a TopologyBuilder
where the service declares its role against each contract. After the callback
returns, all declared artifacts are merged into the cloned topology.

The initial topology is never mutated — a structuredClone is made upfront.

## Parameters

### initialTopology

`BrokerConfig`

### serviceName

`string`

### configure

(`builder`) => `void`

## Returns

`BrokerConfig`

## Example

```typescript
const topology = buildServiceTopology(baseConfig, "warehouse", t => {
    t.publishesEvent(DonatedInventory.events.created);
    t.handlesCommand(DonatedInventory.commands.reserveItem);
});
```
