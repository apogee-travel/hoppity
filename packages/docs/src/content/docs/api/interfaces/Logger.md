---
editUrl: false
next: false
prev: false
title: "Logger"
---

Defined in: [types.ts:37](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L37)

Logger interface that provides standard logging methods.
This allows for flexible logging implementations while maintaining a consistent API.

Logger

## Methods

### critical()

> **critical**(`message`, ...`args`): `void`

Defined in: [types.ts:78](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L78)

Log a critical error message

#### Parameters

##### message

`string`

The message to log

##### args

...`any`[]

Additional arguments to log

#### Returns

`void`

---

### debug()

> **debug**(`message`, ...`args`): `void`

Defined in: [types.ts:50](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L50)

Log a debug message

#### Parameters

##### message

`string`

The message to log

##### args

...`any`[]

Additional arguments to log

#### Returns

`void`

---

### error()

> **error**(`message`, ...`args`): `void`

Defined in: [types.ts:71](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L71)

Log an error message

#### Parameters

##### message

`string`

The message to log

##### args

...`any`[]

Additional arguments to log

#### Returns

`void`

---

### info()

> **info**(`message`, ...`args`): `void`

Defined in: [types.ts:57](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L57)

Log an info message

#### Parameters

##### message

`string`

The message to log

##### args

...`any`[]

Additional arguments to log

#### Returns

`void`

---

### silly()

> **silly**(`message`, ...`args`): `void`

Defined in: [types.ts:43](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L43)

Log a silly message

#### Parameters

##### message

`string`

The message to log

##### args

...`any`[]

Additional arguments to log

#### Returns

`void`

---

### warn()

> **warn**(`message`, ...`args`): `void`

Defined in: [types.ts:64](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/types.ts#L64)

Log a warning message

#### Parameters

##### message

`string`

The message to log

##### args

...`any`[]

Additional arguments to log

#### Returns

`void`
