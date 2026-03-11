---
editUrl: false
next: false
prev: false
title: "TopologyBuilder"
---

Defined in: [types.ts:179](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L179)

Builder interface returned inside the buildServiceTopology callback.
Each method declares this service's role against a domain contract.
Declarations are accumulated and materialized into rascal topology after the
callback returns.

## Methods

### callsRpc()

> **callsRpc**(`contract`): `TopologyBuilder`

Defined in: [types.ts:215](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L215)

Declare that this service calls the given RPC operation.
Adds: RPC exchange + publication. Does NOT add a reply queue —
that is the responsibility of withRpcSupport middleware.

#### Parameters

##### contract

[`RpcContract`](/hoppity/api-contracts/interfaces/rpccontract/)\<`any`, `any`, `any`, `any`\>

#### Returns

`TopologyBuilder`

---

### handlesCommand()

> **handlesCommand**(`contract`, `options?`): `TopologyBuilder`

Defined in: [types.ts:205](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L205)

Declare that this service handles the given command.
Adds: domain exchange + queue + binding + subscription.

#### Parameters

##### contract

[`CommandContract`](/hoppity/api-contracts/interfaces/commandcontract/)\<`any`, `any`, `any`\>

##### options?

[`HandlerOptions`](/hoppity/api-contracts/interfaces/handleroptions/)

#### Returns

`TopologyBuilder`

---

### publishesEvent()

> **publishesEvent**(`contract`): `TopologyBuilder`

Defined in: [types.ts:184](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L184)

Declare that this service publishes the given event.
Adds: domain exchange + publication.

#### Parameters

##### contract

[`EventContract`](/hoppity/api-contracts/interfaces/eventcontract/)\<`any`, `any`, `any`\>

#### Returns

`TopologyBuilder`

---

### respondsToRpc()

> **respondsToRpc**(`contract`, `options?`): `TopologyBuilder`

Defined in: [types.ts:221](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L221)

Declare that this service responds to the given RPC operation.
Adds: RPC exchange + request queue + binding + subscription.

#### Parameters

##### contract

[`RpcContract`](/hoppity/api-contracts/interfaces/rpccontract/)\<`any`, `any`, `any`, `any`\>

##### options?

[`HandlerOptions`](/hoppity/api-contracts/interfaces/handleroptions/)

#### Returns

`TopologyBuilder`

---

### sendsCommand()

> **sendsCommand**(`contract`): `TopologyBuilder`

Defined in: [types.ts:199](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L199)

Declare that this service sends the given command.
Adds: domain exchange + publication.

#### Parameters

##### contract

[`CommandContract`](/hoppity/api-contracts/interfaces/commandcontract/)\<`any`, `any`, `any`\>

#### Returns

`TopologyBuilder`

---

### subscribesToEvent()

> **subscribesToEvent**(`contract`, `options?`): `TopologyBuilder`

Defined in: [types.ts:190](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-contracts/src/types.ts#L190)

Declare that this service subscribes to the given event.
Adds: domain exchange + queue + binding + subscription.

#### Parameters

##### contract

[`EventContract`](/hoppity/api-contracts/interfaces/eventcontract/)\<`any`, `any`, `any`\>

##### options?

[`HandlerOptions`](/hoppity/api-contracts/interfaces/handleroptions/)

#### Returns

`TopologyBuilder`
