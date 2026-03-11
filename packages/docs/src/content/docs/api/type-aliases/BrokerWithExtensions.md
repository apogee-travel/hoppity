---
editUrl: false
next: false
prev: false
title: "BrokerWithExtensions"
---

> **BrokerWithExtensions**\<`T`\> = `BrokerAsPromised` & `UnionToIntersection`\<`T`\[`number`\]\>

Defined in: [types.ts:218](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity/src/types.ts#L218)

Utility type for combining a Rascal broker with extension methods added by middleware.
Middleware like `hoppity-rpc` and `hoppity-delayed-publish` monkey-patch extra methods
onto the broker in their `onBrokerCreated` callbacks. This type makes those extensions
type-safe by intersecting the base `BrokerAsPromised` with each extension record.

## Type Parameters

### T

`T` _extends_ `Record`\<`string`, `any`\>[]

Tuple of extension record types (e.g., `[RpcBrokerExtensions, DelayedPublishExtensions]`)

## Example

```typescript
type MyBroker = BrokerWithExtensions<[{ rpcCall: (msg: any) => Promise<any> }]>;
// Result: BrokerAsPromised & { rpcCall: (msg: any) => Promise<any> }
```
