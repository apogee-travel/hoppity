---
editUrl: false
next: false
prev: false
title: "Interceptor"
---

Defined in: [packages/hoppity/src/interceptors/types.ts:78](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/interceptors/types.ts#L78)

A unified interceptor that can wrap inbound handler execution,
outbound publish calls, or both.

Either direction is optional — an interceptor with only `inbound` is valid,
as is one with only `outbound`. The framework skips the missing direction.

Interceptors are configuration, not runtime state — they are wired at build
time and cannot be added or removed after the broker is created.

## Properties

### inbound?

> `optional` **inbound**: [`InboundWrapper`](/hoppity/api/type-aliases/inboundwrapper/)

Defined in: [packages/hoppity/src/interceptors/types.ts:82](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/interceptors/types.ts#L82)

Wraps handler execution for events, commands, and RPC responders

---

### name

> **name**: `string`

Defined in: [packages/hoppity/src/interceptors/types.ts:80](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/interceptors/types.ts#L80)

Name for logging and debugging — required, must be non-empty

---

### outbound?

> `optional` **outbound**: [`OutboundWrapper`](/hoppity/api/type-aliases/outboundwrapper/)

Defined in: [packages/hoppity/src/interceptors/types.ts:84](https://github.com/apogee-travel/hoppity/blob/c9712023a65181fbb268e1d6f167364721040374/packages/hoppity/src/interceptors/types.ts#L84)

Wraps publish calls for publishEvent, sendCommand, and request
