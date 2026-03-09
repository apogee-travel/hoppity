---
editUrl: false
next: false
prev: false
title: "MiddlewareFunction"
---

> **MiddlewareFunction** = (`topology`, `context`) => [`MiddlewareResult`](/hoppity/api/interfaces/middlewareresult/)

Defined in: [types.ts:178](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/types.ts#L178)

Middleware function that can modify the topology and optionally provide a callback.
Middleware functions are executed in the order they are added to the pipeline.
Each middleware receives the current topology and a context object for sharing state.

## Parameters

### topology

`BrokerConfig`

The current topology configuration

### context

[`MiddlewareContext`](/hoppity/api/interfaces/middlewarecontext/)

Context object for sharing state between middleware

## Returns

[`MiddlewareResult`](/hoppity/api/interfaces/middlewareresult/)

- The modified topology and optional callback

## Example

```typescript
// First middleware: sets up exchanges and shares info via context
const exchangeSetupMiddleware: MiddlewareFunction = (topology, context) => {
    // Modify topology to add exchanges
    const modifiedTopology = { ...topology };
    // ... add exchanges ...

    // Share exchange names with downstream middleware
    context.data.exchangeNames = ["user-events", "order-events"];
    context.data.serviceName = "user-service";

    return { topology: modifiedTopology };
};

// Second middleware: uses context from previous middleware
const queueSetupMiddleware: MiddlewareFunction = (topology, context) => {
    // Access data from previous middleware
    const exchangeNames = context.data.exchangeNames || [];
    const serviceName = context.data.serviceName;

    // Check if required middleware has run
    if (!context.middlewareNames.includes("exchangeSetupMiddleware")) {
        throw new Error("exchangeSetupMiddleware must run before queueSetupMiddleware");
    }

    // Use the shared data to set up queues
    const modifiedTopology = { ...topology };
    // ... set up queues bound to the exchanges ...

    return { topology: modifiedTopology };
};
```
