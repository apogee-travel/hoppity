# Hoppity 🚨

A middleware pipeline for Rascal broker configuration that enables modular, composable broker setup.

## Features

- **Middleware Pipeline**: Chain multiple middleware functions to build complex broker configurations
- **Context Sharing**: Share state between middleware via context objects
- **Type Safety**: Full TypeScript support with generic broker extensions
- **Post-Creation Callbacks**: Execute setup code after broker creation
- **Error Handling**: Enhanced error messages with pipeline context
- **Debugging**: Internal execution logging and introspection capabilities
- **Logging**: Built-in logger interface with console implementation

## Installation

```bash
pnpm add @apogeelabs/hoppity
# or
npm install @apogeelabs/hoppity
```

## Basic Usage

```typescript
import hoppity from "@apogeelabs/hoppity";
import { BrokerConfig } from "rascal";

// Start with a base topology
const baseTopology: BrokerConfig = {
    vhosts: {
        "/": {
            connection: {
                url: "amqp://localhost",
            },
        },
    },
};

// Create broker with middleware
const broker = await hoppity
    .withTopology(baseTopology)
    .use(myMiddleware1)
    .use(myMiddleware2)
    .build();
```

## Middleware Context

The middleware pattern supports context sharing between middleware functions. Each middleware receives a context object that can be used to share data with downstream middleware.

### Context Interface

```typescript
interface MiddlewareContext {
    data: Record<string, any>; // Arbitrary data for sharing
    middlewareNames: string[]; // Names of executed middleware
    logger: Logger; // Logger instance for middleware to use
}
```

### Example: Context Usage

```typescript
import { MiddlewareFunction, MiddlewareContext } from "@apogeelabs/hoppity";

// First middleware: sets up exchanges and shares info
const exchangeSetupMiddleware: MiddlewareFunction = (topology, context) => {
    // Use the logger for debugging
    context.logger.info("Setting up exchanges...");

    // Modify topology to add exchanges
    const modifiedTopology = { ...topology };
    // ... add exchanges ...

    // Share exchange names with downstream middleware
    context.data.exchangeNames = ["user-events", "order-events"];
    context.data.serviceName = "user-service";

    context.logger.debug("Exchanges configured", { exchangeNames: context.data.exchangeNames });

    return { topology: modifiedTopology };
};

// Second middleware: uses context from previous middleware
const queueSetupMiddleware: MiddlewareFunction = (topology, context) => {
    // Access data from previous middleware
    const exchangeNames = context.data.exchangeNames || [];
    const serviceName = context.data.serviceName;

    context.logger.info("Setting up queues for service", { serviceName, exchangeNames });

    // Check if required middleware has run
    if (!context.middlewareNames.includes("exchangeSetupMiddleware")) {
        throw new Error("exchangeSetupMiddleware must run before queueSetupMiddleware");
    }

    // Use the shared data to set up queues
    const modifiedTopology = { ...topology };
    // ... set up queues bound to the exchanges ...

    return { topology: modifiedTopology };
};
```

## API Reference

### Main Interface

- `hoppity.withTopology(topology)` - Start with an existing topology
- `hoppity.use(middleware)` - Start with empty topology and add middleware

### Builder Interface

- `builder.use(middleware)` - Add middleware to the pipeline
- `builder.build()` - Create the broker and execute the pipeline

### Types

- `MiddlewareFunction` - Function signature for middleware
- `MiddlewareContext` - Context object for sharing state
- `MiddlewareResult` - Return type for middleware functions
- `BrokerCreatedCallback` - Callback for post-creation setup
- `BrokerWithExtensions<T>` - Utility type for combining broker extensions
- `Logger` - Logger interface for middleware logging
- `BuilderInterface` - Interface for the builder pattern

### Logger

- `ConsoleLogger` - Console-based logger implementation
- `defaultLogger` - Default logger instance

## Examples

See the `examples/` directory for complete working examples demonstrating:

- Basic middleware usage
- Context sharing between middleware
- Service-to-service messaging
- Logging and monitoring plugins

For RPC communication patterns, see the separate `@apogeelabs/hoppity-rpc` package.

## Dependencies

This package depends on:

- `rascal` - The underlying RabbitMQ library
- `fast-deep-equal` - For deep equality comparison
- `structuredClone` (built-in) - For deep cloning

## License

ISC

---
