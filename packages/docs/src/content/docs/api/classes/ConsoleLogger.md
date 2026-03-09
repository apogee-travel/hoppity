---
editUrl: false
next: false
prev: false
title: "ConsoleLogger"
---

Defined in: [consoleLogger.ts:11](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/consoleLogger.ts#L11)

Default console-based logger implementation.
Provides a simple logging interface that maps to console methods.

ConsoleLogger

## Implements

## Implements

- [`Logger`](/hoppity/api/interfaces/logger/)

## Constructors

### Constructor

> **new ConsoleLogger**(): `ConsoleLogger`

#### Returns

`ConsoleLogger`

## Methods

### critical()

> **critical**(`message`, ...`args`): `void`

Defined in: [consoleLogger.ts:62](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/consoleLogger.ts#L62)

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

[`Logger`](/hoppity/api/interfaces/logger/).[`critical`](/hoppity/api/interfaces/logger/#critical)

---

### debug()

> **debug**(`message`, ...`args`): `void`

Defined in: [consoleLogger.ts:26](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/consoleLogger.ts#L26)

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

[`Logger`](/hoppity/api/interfaces/logger/).[`debug`](/hoppity/api/interfaces/logger/#debug)

---

### error()

> **error**(`message`, ...`args`): `void`

Defined in: [consoleLogger.ts:53](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/consoleLogger.ts#L53)

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

[`Logger`](/hoppity/api/interfaces/logger/).[`error`](/hoppity/api/interfaces/logger/#error)

---

### info()

> **info**(`message`, ...`args`): `void`

Defined in: [consoleLogger.ts:35](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/consoleLogger.ts#L35)

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

[`Logger`](/hoppity/api/interfaces/logger/).[`info`](/hoppity/api/interfaces/logger/#info)

---

### silly()

> **silly**(`message`, ...`args`): `void`

Defined in: [consoleLogger.ts:17](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/consoleLogger.ts#L17)

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

[`Logger`](/hoppity/api/interfaces/logger/).[`silly`](/hoppity/api/interfaces/logger/#silly)

---

### warn()

> **warn**(`message`, ...`args`): `void`

Defined in: [consoleLogger.ts:44](https://github.com/apogee-travel/hoppity/blob/2a3626e486d3360dc3a1d039d4822c4598c8b024/packages/hoppity/src/consoleLogger.ts#L44)

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

[`Logger`](/hoppity/api/interfaces/logger/).[`warn`](/hoppity/api/interfaces/logger/#warn)
