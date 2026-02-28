# @apogeelabs/hoppity — LLM Usage Guide

Core middleware pipeline and builder API for composing RabbitMQ broker topologies on Rascal.

## Imports

```typescript
// Default export — the builder entry point
import hoppity from "@apogeelabs/hoppity";

// Type imports
import type {
    MiddlewareFunction,
    MiddlewareContext,
    MiddlewareResult,
    BuilderInterface,
    BrokerCreatedCallback,
    BrokerWithExtensions,
    Hoppity,
    Logger,
} from "@apogeelabs/hoppity";

// Class/value imports
import { ConsoleLogger, defaultLogger } from "@apogeelabs/hoppity";
```

## Type Signatures

```typescript
// Logger interface — implemented by ConsoleLogger, or bring your own
interface Logger {
    silly(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    critical(message: string, ...args: any[]): void;
}

// Shared state passed through the middleware pipeline
interface MiddlewareContext {
    data: Record<string, any>; // Mutable shared state for inter-middleware communication
    middlewareNames: string[]; // Names of executed middleware (in order)
    logger: Logger; // Logger instance (defaults to ConsoleLogger)
}

// What every middleware function must return
interface MiddlewareResult {
    topology: BrokerConfig;
    onBrokerCreated?: (broker: BrokerAsPromised) => void | Promise<void>;
}

// The middleware function signature — synchronous
type MiddlewareFunction = (topology: BrokerConfig, context: MiddlewareContext) => MiddlewareResult;

// Callback alias
type BrokerCreatedCallback = (broker: BrokerAsPromised) => void | Promise<void>;

// Fluent builder interface
interface BuilderInterface {
    use(middleware: MiddlewareFunction): BuilderInterface;
    build(): Promise<BrokerAsPromised>;
}

// Utility type for extending broker with custom methods
type BrokerWithExtensions<T extends Record<string, any>[]> = BrokerAsPromised &
    UnionToIntersection<T[number]>;
```

### Entry Point (default export)

```typescript
const hoppity: {
    withTopology(topology: BrokerConfig): BuilderInterface;
    use(middleware: MiddlewareFunction): BuilderInterface;
};
```

### ConsoleLogger

```typescript
class ConsoleLogger implements Logger {
    silly(message: string, ...args: any[]): void; // → console.log
    debug(message: string, ...args: any[]): void; // → console.log
    info(message: string, ...args: any[]): void; // → console.log
    warn(message: string, ...args: any[]): void; // → console.warn
    error(message: string, ...args: any[]): void; // → console.error
    critical(message: string, ...args: any[]): void; // → console.error
}

const defaultLogger: ConsoleLogger; // Singleton instance
```

## Usage Examples

### Building a broker with topology

```typescript
import hoppity from "@apogeelabs/hoppity";
import { BrokerConfig } from "rascal";

const topology: BrokerConfig = {
    vhosts: {
        "/": {
            connection: {
                hostname: "localhost",
                user: "guest",
                password: "guest",
                port: 5672,
                vhost: "/",
            },
            exchanges: {
                events: { type: "topic" },
            },
            queues: {
                event_queue: {},
            },
            bindings: {
                event_binding: {
                    source: "events",
                    destination: "event_queue",
                    bindingKey: "event.#",
                },
            },
            publications: {
                publish_event: { exchange: "events", routingKey: "event.created" },
            },
            subscriptions: {
                on_event: { queue: "event_queue", prefetch: 1 },
            },
        },
    },
};

const broker = await hoppity.withTopology(topology).build();
```

### Writing custom middleware

```typescript
import { MiddlewareFunction } from "@apogeelabs/hoppity";

const addAuditExchange: MiddlewareFunction = (topology, context) => {
    const modified = structuredClone(topology);
    modified.vhosts ??= {};
    modified.vhosts["/"] ??= {};
    modified.vhosts["/"].exchanges ??= {};
    modified.vhosts["/"].exchanges["audit"] = { type: "fanout" };

    context.data.auditExchange = "audit";
    context.logger.info("Added audit exchange");

    return {
        topology: modified,
        onBrokerCreated: async broker => {
            const sub = await broker.subscribe("audit_subscription");
            sub.on("message", (msg, content, ackOrNack) => {
                console.log("Audit event:", content);
                ackOrNack();
            });
        },
    };
};

const broker = await hoppity.withTopology(baseTopology).use(addAuditExchange).build();
```

## How It Works

1. `hoppity.withTopology(config)` creates a `RascalBuilder` that deep-clones the config via `structuredClone()`.
2. `.use(middleware)` pushes middleware onto an internal array. Returns `this` for chaining.
3. `.build()` executes three phases:
    - **Phase 1**: Runs each middleware sequentially. Each receives the cumulative topology and a shared `MiddlewareContext`. `fast-deep-equal` detects topology changes for logging.
    - **Phase 2**: Calls `BrokerAsPromised.create(finalTopology)` to create the Rascal broker.
    - **Phase 3**: Runs all `onBrokerCreated` callbacks sequentially. If any fails, the broker is shut down.
4. All errors are wrapped with pipeline context (middleware name, index, execution count) and include `.cause` chains.

## Gotchas

- ⚠️ **`hoppity` is a plain object, not a class** — don't `new hoppity()`.
- ⚠️ **Middleware functions are synchronous** — they return `MiddlewareResult`, not a Promise. Put async work in `onBrokerCreated`.
- ⚠️ **Always clone topology before modifying** — use `structuredClone(topology)`. The builder clones at construction, but middleware should not mutate the object it receives.
- ⚠️ **`.build()` returns a Promise** — don't forget to `await` it.
- ⚠️ **Context mutations are permanent** — anything you put in `context.data` is visible to all downstream middleware.
- ⚠️ **Named functions are better** — middleware named with `function myMiddleware(...)` shows its name in error messages and `context.middlewareNames`. Arrow functions and anonymous functions show `middleware_N`.
