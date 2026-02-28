# @apogeelabs/hoppity-logger — LLM Usage Guide

Injects a custom logger into the middleware pipeline context, replacing the default `ConsoleLogger`.

## Imports

```typescript
import { withCustomLogger } from "@apogeelabs/hoppity-logger";
import type { WithCustomLoggerOptions } from "@apogeelabs/hoppity-logger";
import type { Logger } from "@apogeelabs/hoppity-logger"; // Re-exported from core
```

## Type Signatures

```typescript
interface WithCustomLoggerOptions {
    logger: Logger; // Any object implementing the Logger interface
}

// Logger interface (defined in @apogeelabs/hoppity, re-exported here)
interface Logger {
    silly(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    critical(message: string, ...args: any[]): void;
}
```

### Function Signature

```typescript
function withCustomLogger(options: WithCustomLoggerOptions): MiddlewareFunction;
```

## Usage Examples

### With a Winston logger

```typescript
import hoppity from "@apogeelabs/hoppity";
import { withCustomLogger, Logger } from "@apogeelabs/hoppity-logger";
import winston from "winston";

const winstonLogger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
});

// Wrap to match the Logger interface (Winston lacks silly/critical)
const logger: Logger = {
    silly: (msg, ...args) => winstonLogger.silly(msg, ...args),
    debug: (msg, ...args) => winstonLogger.debug(msg, ...args),
    info: (msg, ...args) => winstonLogger.info(msg, ...args),
    warn: (msg, ...args) => winstonLogger.warn(msg, ...args),
    error: (msg, ...args) => winstonLogger.error(msg, ...args),
    critical: (msg, ...args) => winstonLogger.error(msg, ...args),
};

const broker = await hoppity
    .withTopology(topology)
    .use(withCustomLogger({ logger }))
    .use(otherMiddleware) // Will use the Winston logger via context.logger
    .build();
```

### With a Pino logger

```typescript
import pino from "pino";
import { withCustomLogger, Logger } from "@apogeelabs/hoppity-logger";

const pinoLogger = pino({ level: "debug" });

const logger: Logger = {
    silly: (msg, ...args) => pinoLogger.trace(msg, ...args),
    debug: (msg, ...args) => pinoLogger.debug(msg, ...args),
    info: (msg, ...args) => pinoLogger.info(msg, ...args),
    warn: (msg, ...args) => pinoLogger.warn(msg, ...args),
    error: (msg, ...args) => pinoLogger.error(msg, ...args),
    critical: (msg, ...args) => pinoLogger.fatal(msg, ...args),
};

const broker = await hoppity.withTopology(topology).use(withCustomLogger({ logger })).build();
```

## How It Works

This is the simplest middleware in the ecosystem. It does one thing:

```typescript
context.logger = options.logger;
```

It sets the custom logger on the shared `MiddlewareContext`. The topology is returned unchanged. No `onBrokerCreated` callback is needed.

All downstream middleware (RPC, delayed-publish, subscriptions, custom middleware) accesses `context.logger` for logging, so they'll automatically use whatever logger you inject here.

## Gotchas

- ⚠️ **Must be first in the chain** — middleware before `withCustomLogger` will use the default `ConsoleLogger`. Apply it first so all downstream middleware benefits.
- ⚠️ **Logger must implement all 6 methods** — `silly`, `debug`, `info`, `warn`, `error`, `critical`. Most popular loggers need a thin wrapper since they lack `silly` and/or `critical`.
- ⚠️ **Does not modify topology** — this middleware only touches `context.logger`. It returns the topology unchanged.
