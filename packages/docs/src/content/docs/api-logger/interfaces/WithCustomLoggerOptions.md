---
editUrl: false
next: false
prev: false
title: "WithCustomLoggerOptions"
---

Defined in: [hoppity-logger/src/withCustomLogger.ts:7](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-logger/src/withCustomLogger.ts#L7)

Configuration options for the [withCustomLogger](/hoppity/api-logger/functions/withcustomlogger/) middleware.

## Properties

### logger

> **logger**: [`Logger`](/hoppity/api-logger/interfaces/logger/)

Defined in: [hoppity-logger/src/withCustomLogger.ts:14](https://github.com/apogee-travel/hoppity/blob/81be1585ced51f77543aa03d03ab298c040554f3/packages/hoppity-logger/src/withCustomLogger.ts#L14)

The logger instance to inject into the middleware pipeline context.
Must implement all six methods of the [Logger](/hoppity/api-logger/interfaces/logger/) interface.
Most popular loggers (Winston, Pino, Bunyan) need a thin wrapper
since they typically lack `silly` and/or `critical` methods.
