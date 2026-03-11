---
editUrl: false
next: false
prev: false
title: "withSubscriptions"
---

> **withSubscriptions**(`handlers`): `MiddlewareFunction`

Defined in: [withSubscriptions.ts:25](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-subscriptions/src/withSubscriptions.ts#L25)

Middleware function that sets up subscription handlers for a Rascal broker.

This middleware uses a two-phase design:

1. **Topology phase** (synchronous) — validates that every handler key maps
   to a real subscription in the topology. Fails fast so typos and stale
   handler keys are caught before the broker is even created.
2. **`onBrokerCreated` callback** (async) — wires up the actual subscription
   listeners on the live broker. This must happen after broker creation
   because `broker.subscribe()` requires a running AMQP connection.

Because this middleware validates against the finalized topology, it should
be the **last** middleware in the pipeline. If earlier middleware (e.g.
hoppity-rpc, hoppity-delayed-publish) adds subscriptions to the topology,
those must run first or validation will miss them.

## Parameters

### handlers

[`SubscriptionHandlers`](/hoppity/api-subscriptions/type-aliases/subscriptionhandlers/)

Object mapping subscription names to their handler functions

## Returns

`MiddlewareFunction`

MiddlewareFunction that can be used in the hoppity pipeline
