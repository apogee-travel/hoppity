# @apogeelabs/hoppity-logger

Logger utilities for hoppity - a RabbitMQ/Rascal broker builder.

## Installation

```bash
pnpm add @apogeelabs/hoppity-logger
# or
npm install @apogeelabs/hoppity-logger
```

## Usage

### Basic Custom Logger

```typescript
import hoppity from "@apogeelabs/hoppity";
import { withCustomLogger } from "@apogeelabs/hoppity-logger";

// Create a custom logger that implements the Logger interface
class CustomLogger {
    silly(message: string, ...args: any[]): void {
        console.debug(`[SILLY] ${message}`, ...args);
    }

    debug(message: string, ...args: any[]): void {
        console.debug(`[DEBUG] ${message}`, ...args);
    }

    info(message: string, ...args: any[]): void {
        console.log(`[INFO] ${message}`, ...args);
    }

    warn(message: string, ...args: any[]): void {
        console.warn(`[WARN] ${message}`, ...args);
    }

    error(message: string, ...args: any[]): void {
        console.error(`[ERROR] ${message}`, ...args);
    }

    critical(message: string, ...args: any[]): void {
        console.error(`[CRITICAL] ${message}`, ...args);
    }
}

// Use with hoppity
const broker = await hoppity.use(withCustomLogger({ logger: new CustomLogger() })).build();
```

### Winston Logger Integration

```typescript
import winston from "winston";
import hoppity from "@apogeelabs/hoppity";
import { withCustomLogger } from "@apogeelabs/hoppity-logger";

// Create a Winston logger
const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

// Create a wrapper that implements the Logger interface
const winstonLogger = {
    silly: (message: string, ...args: any[]) => logger.silly(message, ...args),
    debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
    info: (message: string, ...args: any[]) => logger.info(message, ...args),
    warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
    error: (message: string, ...args: any[]) => logger.error(message, ...args),
    critical: (message: string, ...args: any[]) => logger.error(`[CRITICAL] ${message}`, ...args),
};

const broker = await hoppity.use(withCustomLogger({ logger: winstonLogger })).build();
```

### Pino Logger Integration

```typescript
import pino from "pino";
import hoppity from "@apogeelabs/hoppity";
import { withCustomLogger } from "@apogeelabs/hoppity-logger";

// Create a Pino logger
const pinoLogger = pino({
    level: "info",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
        },
    },
});

// Create a wrapper that implements the Logger interface
const logger = {
    silly: (message: string, ...args: any[]) => pinoLogger.trace(message, ...args),
    debug: (message: string, ...args: any[]) => pinoLogger.debug(message, ...args),
    info: (message: string, ...args: any[]) => pinoLogger.info(message, ...args),
    warn: (message: string, ...args: any[]) => pinoLogger.warn(message, ...args),
    error: (message: string, ...args: any[]) => pinoLogger.error(message, ...args),
    critical: (message: string, ...args: any[]) => pinoLogger.fatal(message, ...args),
};

const broker = await hoppity.use(withCustomLogger({ logger })).build();
```

## API

### `withCustomLogger(options: WithCustomLoggerOptions)`

Middleware that sets a custom logger on the context. This allows downstream middleware to use the provided logger instead of the default console logger.

#### Options

- `logger: Logger` - The custom logger instance that implements the Logger interface

#### Returns

A middleware function that sets the custom logger on the context.

#### Logger Interface

Your custom logger must implement the following interface:

```typescript
interface Logger {
    silly(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    critical(message: string, ...args: any[]): void;
}
```

## Middleware Order

⚠️ The `withCustomLogger` middleware **must be the first middleware** in the chain. Any middleware registered before it will use the default `ConsoleLogger` instead of your custom logger:

```typescript
const broker = await hoppity
    .use(withCustomLogger({ logger: customLogger })) // Apply early
    .use(withDelayedPublish({ serviceName: "my-service", instanceId: "instance-1" }))
    .use(
        withRpcSupport({ serviceName: "my-service", instanceId: "instance-1", rpcExchange: "rpc" })
    )
    .build();
```

## License

ISC
