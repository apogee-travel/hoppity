---
editUrl: false
next: false
prev: false
title: "ConsoleLogger"
---

Defined in: [consoleLogger.ts:11](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/consoleLogger.ts#L11)

Default console-based logger implementation.
Provides a simple logging interface that maps to console methods.

ConsoleLogger

## Implements

## Implements

- [`Logger`](/api/interfaces/logger/)

## Constructors

### Constructor

> **new ConsoleLogger**(): `ConsoleLogger`

#### Returns

`ConsoleLogger`

## Methods

### critical()

> **critical**(`message`, ...`args`): `void`

Defined in: [consoleLogger.ts:62](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/consoleLogger.ts#L62)

Log a critical error message using console.error

#### Parameters

##### message

`string`

The message to log

##### args

...`any`[]

Additional arguments to log

#### Returns

`void`

#### Implementation of

[`Logger`](/api/interfaces/logger/).[`critical`](/api/interfaces/logger/#critical)

---

### debug()

> **debug**(`message`, ...`args`): `void`

Defined in: [consoleLogger.ts:26](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/consoleLogger.ts#L26)

Log a debug message using console.log

#### Parameters

##### message

`string`

The message to log

##### args

...`any`[]

Additional arguments to log

#### Returns

`void`

#### Implementation of

[`Logger`](/api/interfaces/logger/).[`debug`](/api/interfaces/logger/#debug)

---

### error()

> **error**(`message`, ...`args`): `void`

Defined in: [consoleLogger.ts:53](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/consoleLogger.ts#L53)

Log an error message using console.error

#### Parameters

##### message

`string`

The message to log

##### args

...`any`[]

Additional arguments to log

#### Returns

`void`

#### Implementation of

[`Logger`](/api/interfaces/logger/).[`error`](/api/interfaces/logger/#error)

---

### info()

> **info**(`message`, ...`args`): `void`

Defined in: [consoleLogger.ts:35](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/consoleLogger.ts#L35)

Log an info message using console.log

#### Parameters

##### message

`string`

The message to log

##### args

...`any`[]

Additional arguments to log

#### Returns

`void`

#### Implementation of

[`Logger`](/api/interfaces/logger/).[`info`](/api/interfaces/logger/#info)

---

### silly()

> **silly**(`message`, ...`args`): `void`

Defined in: [consoleLogger.ts:17](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/consoleLogger.ts#L17)

Log a silly message using console.log

#### Parameters

##### message

`string`

The message to log

##### args

...`any`[]

Additional arguments to log

#### Returns

`void`

#### Implementation of

[`Logger`](/api/interfaces/logger/).[`silly`](/api/interfaces/logger/#silly)

---

### warn()

> **warn**(`message`, ...`args`): `void`

Defined in: [consoleLogger.ts:44](https://github.com/apogee-stealth/hoppity/blob/c6783951cf3efeb89e1d0641d2afd7496a6ddd04/packages/hoppity/src/consoleLogger.ts#L44)

Log a warning message using console.warn

#### Parameters

##### message

`string`

The message to log

##### args

...`any`[]

Additional arguments to log

#### Returns

`void`

#### Implementation of

[`Logger`](/api/interfaces/logger/).[`warn`](/api/interfaces/logger/#warn)
