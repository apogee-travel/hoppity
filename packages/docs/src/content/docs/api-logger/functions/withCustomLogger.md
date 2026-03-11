---
editUrl: false
next: false
prev: false
title: "withCustomLogger"
---

> **withCustomLogger**(`options`): `MiddlewareFunction`

Defined in: [hoppity-logger/src/withCustomLogger.ts:41](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-logger/src/withCustomLogger.ts#L41)

Middleware that sets a custom logger on the context.
This allows downstream middleware to use the provided logger instead of the default console logger.

## Parameters

### options

[`WithCustomLoggerOptions`](/hoppity/api-logger/interfaces/withcustomloggeroptions/)

Configuration options including the custom logger

## Returns

`MiddlewareFunction`

- Middleware function that sets the custom logger

## Example

```typescript
import winston from "winston";
import { withCustomLogger } from "@apogeelabs/hoppity-logger";

const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
});

const broker = await hoppity.use(withCustomLogger({ logger })).use(myOtherMiddleware).build();
```
