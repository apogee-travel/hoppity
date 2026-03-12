---
editUrl: false
next: false
prev: false
title: "Logger"
---

Defined in: [packages/hoppity/src/types.ts:31](https://github.com/apogee-travel/hoppity/blob/116ad649c2e29714e173c4ca41b19c4ffff2fa39/packages/hoppity/src/types.ts#L31)

Logger interface that provides standard logging methods.
This allows for flexible logging implementations while maintaining a consistent API.

Logger

## Methods

### critical()

> **critical**(`message`, ...`args`): `void`

Defined in: [packages/hoppity/src/types.ts:72](https://github.com/apogee-travel/hoppity/blob/116ad649c2e29714e173c4ca41b19c4ffff2fa39/packages/hoppity/src/types.ts#L72)

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

Defined in: [packages/hoppity/src/types.ts:44](https://github.com/apogee-travel/hoppity/blob/116ad649c2e29714e173c4ca41b19c4ffff2fa39/packages/hoppity/src/types.ts#L44)

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

Defined in: [packages/hoppity/src/types.ts:65](https://github.com/apogee-travel/hoppity/blob/116ad649c2e29714e173c4ca41b19c4ffff2fa39/packages/hoppity/src/types.ts#L65)

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

Defined in: [packages/hoppity/src/types.ts:51](https://github.com/apogee-travel/hoppity/blob/116ad649c2e29714e173c4ca41b19c4ffff2fa39/packages/hoppity/src/types.ts#L51)

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

Defined in: [packages/hoppity/src/types.ts:37](https://github.com/apogee-travel/hoppity/blob/116ad649c2e29714e173c4ca41b19c4ffff2fa39/packages/hoppity/src/types.ts#L37)

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

Defined in: [packages/hoppity/src/types.ts:58](https://github.com/apogee-travel/hoppity/blob/116ad649c2e29714e173c4ca41b19c4ffff2fa39/packages/hoppity/src/types.ts#L58)

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
