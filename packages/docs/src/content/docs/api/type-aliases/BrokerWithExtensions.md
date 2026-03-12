---
editUrl: false
next: false
prev: false
title: "BrokerWithExtensions"
---

> **BrokerWithExtensions**\<`T`\> = `BrokerAsPromised` & `UnionToIntersection`\<`T`\[`number`\]\>

Defined in: [packages/hoppity/src/types.ts:193](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/types.ts#L193)

Utility type for combining a Rascal broker with extension methods added by middleware.
Middleware can attach extra methods onto the broker in their `onBrokerCreated` callbacks.
This type makes those extensions type-safe by intersecting the base `BrokerAsPromised`
with each extension record.

## Type Parameters

### T

`T` _extends_ `Record`\<`string`, `any`\>[]

Tuple of extension record types (e.g., `[RpcBrokerExtensions, DelayedPublishExtensions]`)

## Example

```typescript
type MyBroker = BrokerWithExtensions<[{ rpcCall: (msg: any) => Promise<any> }]>;
// Result: BrokerAsPromised & { rpcCall: (msg: any) => Promise<any> }
```
