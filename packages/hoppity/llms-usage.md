# @apogeelabs/hoppity -- LLM Usage Guide

Contract-driven RabbitMQ topology builder for Node.js microservices, built on Rascal. Handlers and publish declarations ARE the topology.

## Imports

Everything comes from `@apogeelabs/hoppity`. No sub-module imports exist.

```typescript
// Default export -- the entry point
import hoppity from "@apogeelabs/hoppity";

// Named function exports
import { defineDomain, onEvent, onCommand, onRpc } from "@apogeelabs/hoppity";

// Class/value exports
import {
    ServiceBuilder,
    ConsoleLogger,
    defaultLogger,
    RpcErrorCode,
    RpcError,
} from "@apogeelabs/hoppity";

// Type exports
import type {
    ServiceConfig,
    ServiceBroker,
    ConnectionConfig,
    EventContract,
    CommandContract,
    RpcContract,
    DomainDefinition,
    DomainDefinitionInput,
    EventsDefinition,
    CommandsDefinition,
    RpcDefinition,
    HandlerDeclaration,
    EventHandlerDeclaration,
    CommandHandlerDeclaration,
    RpcHandlerDeclaration,
    EventHandler,
    CommandHandler,
    RpcHandler,
    HandlerContext,
    HandlerOptions,
    MiddlewareFunction,
    MiddlewareResult,
    MiddlewareContext,
    BrokerCreatedCallback,
    BrokerWithExtensions,
    Logger,
    Hoppity,
    RpcRequest,
    RpcResponse,
    RpcErrorCodeValue,
} from "@apogeelabs/hoppity";
```

## Entry Point

```typescript
const hoppity: {
    service(serviceName: string, config: ServiceConfig): ServiceBuilder;
};
export default hoppity;
```

`hoppity` is a plain object, not a class. Don't `new` it.

## ServiceConfig

```typescript
interface ServiceConfig {
    connection: ConnectionConfig;
    handlers?: HandlerDeclaration[]; // defaults to []
    publishes?: (EventContract | CommandContract | RpcContract)[]; // defaults to []
    topology?: BrokerConfig; // optional raw Rascal config -- merged as base before derived topology
    instanceId?: string; // auto-generated UUID if not provided
    defaultTimeout?: number; // RPC timeout in ms (defaults to 30_000)
    validateInbound?: boolean; // validate incoming payloads against schemas (defaults to true)
    validateOutbound?: boolean; // validate outgoing payloads against schemas (defaults to false)
    interceptors?: Interceptor[]; // per-message wrappers for telemetry, tracing, metrics
    delayedDelivery?: {
        maxRetries?: number; // max re-publish attempts before error queue (default 5)
        retryDelay?: number; // ms between retry attempts (default 1000)
    };
}

interface ConnectionConfig {
    url: string; // e.g., "amqp://localhost"
    vhost?: string; // defaults to "/"
    options?: Record<string, any>; // e.g., { heartbeat: 10 }
    retry?: {
        factor?: number;
        min?: number; // minimum retry delay in ms
        max?: number; // maximum retry delay in ms
    };
}
```

## ServiceBuilder

```typescript
class ServiceBuilder {
    constructor(serviceName: string, config: ServiceConfig);
    use(middleware: MiddlewareFunction): ServiceBuilder; // chainable
    build(): Promise<ServiceBroker>;
}
```

## defineDomain

Declares a domain's contracts. Returns typed contract objects for all operations.

```typescript
function defineDomain<TDomain, TEvents, TCommands, TRpc>(
    domainName: TDomain,
    definition: DomainDefinitionInput<TEvents, TCommands, TRpc>
): DomainDefinition<TDomain, TEvents, TCommands, TRpc>;
```

Throws if `domainName` is empty or whitespace-only. All sections are optional.

### Bare schema form

```typescript
const OrdersDomain = defineDomain("orders", {
    events: {
        orderCreated: z.object({ orderId: z.string() }),
    },
    commands: {
        cancelOrder: z.object({ orderId: z.string() }),
    },
    rpc: {
        createOrder: {
            request: z.object({ items: z.array(z.string()) }),
            response: z.object({ orderId: z.string(), total: z.number() }),
        },
    },
});
```

### Extended form (for future per-operation options)

```typescript
const OrdersDomain = defineDomain("orders", {
    events: {
        orderCreated: {
            schema: z.object({ orderId: z.string() }),
            // future options go here
        },
    },
    rpc: {
        createOrder: {
            schema: {
                request: z.object({ items: z.array(z.string()) }),
                response: z.object({ orderId: z.string() }),
            },
        },
    },
});
```

### Contract types returned

Each entry in the returned `DomainDefinition` is a typed contract object:

```typescript
// OrdersDomain.events.orderCreated is an EventContract with:
{
    _type: "event",
    _domain: "orders",
    _name: "orderCreated",
    schema: /* the Zod schema */,
    exchange: "orders",
    routingKey: "orders.event.order_created",
    publicationName: "orders_event_order_created",
    subscriptionName: "orders_event_order_created",
}

// CommandContract has the same shape but _type: "command" and routingKey pattern is {domain}.command.{snake_name}

// RpcContract has requestSchema + responseSchema instead of schema,
// exchange is "{domain}_rpc", routingKey is {domain}.rpc.{snake_name}
```

## Handler Factories

### onEvent

```typescript
function onEvent<TSchema extends ZodTypeAny>(
    contract: EventContract<any, any, TSchema>,
    handler: (content: z.infer<TSchema>, context: HandlerContext) => Promise<void> | void,
    options?: HandlerOptions
): EventHandlerDeclaration;
```

### onCommand

```typescript
function onCommand<TSchema extends ZodTypeAny>(
    contract: CommandContract<any, any, TSchema>,
    handler: (content: z.infer<TSchema>, context: HandlerContext) => Promise<void> | void,
    options?: HandlerOptions
): CommandHandlerDeclaration;
```

### onRpc

```typescript
function onRpc<TReq extends ZodTypeAny, TRes extends ZodTypeAny>(
    contract: RpcContract<any, any, TReq, TRes>,
    handler: (request: z.infer<TReq>, context: HandlerContext) => Promise<z.infer<TRes>>,
    options?: HandlerOptions
): RpcHandlerDeclaration;
```

### HandlerOptions

```typescript
interface HandlerOptions {
    queueType?: "quorum" | "classic"; // defaults to "quorum"
    redeliveries?: { limit: number }; // defaults to { limit: 5 }
    deadLetter?: {
        exchange: string;
        routingKey?: string;
    };
}
```

### HandlerContext

```typescript
interface HandlerContext {
    broker: HandlerContextBroker; // typed broker for outbound operations within handlers
}
// HandlerContextBroker has: publishEvent, sendCommand, request, cancelRequest
```

## ServiceBroker

Returned by `.build()`. Extends Rascal's `BrokerAsPromised` with typed outbound methods.

```typescript
interface ServiceBroker extends BrokerAsPromised {
    publishEvent<TSchema>(
        contract: EventContract,
        message: z.infer<TSchema>,
        overrides?: PublicationConfig
    ): Promise<void>;
    sendCommand<TSchema>(
        contract: CommandContract,
        message: z.infer<TSchema>,
        overrides?: PublicationConfig
    ): Promise<void>;
    request<TReq, TRes>(
        contract: RpcContract,
        message: z.infer<TReq>,
        overrides?: PublicationConfig
    ): Promise<z.infer<TRes>>;
    cancelRequest(correlationId: string): boolean;
}
```

## Middleware

Middleware functions are synchronous. Async work goes in `onBrokerCreated`.

```typescript
type MiddlewareFunction = (topology: BrokerConfig, context: MiddlewareContext) => MiddlewareResult;

interface MiddlewareResult {
    topology: BrokerConfig;
    onBrokerCreated?: (broker: BrokerAsPromised) => void | Promise<void>;
}

interface MiddlewareContext {
    data: Record<string, any>; // mutable shared state
    middlewareNames: string[]; // names of middleware already executed
    logger: Logger; // logger instance
    serviceName?: string; // populated by ServiceBuilder
}
```

### Writing custom middleware

```typescript
const myMiddleware: MiddlewareFunction = (topology, context) => {
    context.logger.info("Running my middleware");
    context.data.myFlag = true;

    const modified = structuredClone(topology);
    // ... modify topology ...

    return {
        topology: modified,
        onBrokerCreated: async broker => {
            // broker is fully wired here
            context.logger.info("Broker is live");
        },
    };
};
```

Named functions show their name in error messages and `context.middlewareNames`. Arrow functions show `middleware_N`.

### Middleware order matters

```typescript
const broker = await hoppity
    .service("my-service", config)
    .use(withCustomLogger({ logger })) // first -- so downstream middleware uses custom logger
    .use(myMiddleware)
    .build();
```

## RPC

### Making RPC calls

```typescript
const result = await broker.request(OrdersDomain.rpc.createOrder, { items });
// result is typed as z.infer<typeof responseSchema>
```

### RPC-only caller (no handlers)

```typescript
const broker = await hoppity
    .service("gateway-service", {
        connection: { url: "amqp://localhost" },
        publishes: [OrdersDomain.rpc.createOrder], // declares outbound RPC
    })
    .build();
```

### RPC error handling

```typescript
import { RpcError, RpcErrorCode } from "@apogeelabs/hoppity";

try {
    await broker.request(OrdersDomain.rpc.createOrder, { items });
} catch (err) {
    if (err instanceof RpcError) {
        switch (err.code) {
            case RpcErrorCode.HANDLER_ERROR:
                break; // remote handler threw
            case RpcErrorCode.TIMEOUT:
                break; // request timed out
            case RpcErrorCode.CANCELLED:
                break; // cancelRequest() was called
        }
    }
}
```

### Cancelling requests

```typescript
const cancelled = broker.cancelRequest(correlationId); // returns boolean
```

## Escape Hatch: Raw Topology

For services not using contracts, or for infrastructure that can't be derived:

```typescript
// Raw topology only
const broker = await hoppity
    .service("legacy-service", {
        connection: { url: "amqp://localhost" },
        topology: existingRascalConfig,
    })
    .build();

// Combined: raw topology as base, derived topology layers on top
const broker = await hoppity
    .service("order-service", {
        connection: { url: "amqp://localhost" },
        handlers: [cancelOrderHandler],
        publishes: [OrdersDomain.events.orderCancelled],
        topology: {
            vhosts: {
                "/": {
                    exchanges: { "order-service-dlx": { type: "topic" } },
                },
            },
        },
    })
    .build();
```

## Naming Conventions

Topology artifact names are derived mechanically from contracts. camelCase operation names become snake_case.

| Artifact                 | Pattern                                  | Example                                    |
| ------------------------ | ---------------------------------------- | ------------------------------------------ |
| Exchange (event/command) | `{domain}`                               | `orders`                                   |
| Exchange (rpc)           | `{domain}_rpc`                           | `orders_rpc`                               |
| Routing key (event)      | `{domain}.event.{snake_name}`            | `orders.event.order_created`               |
| Routing key (command)    | `{domain}.command.{snake_name}`          | `orders.command.cancel_order`              |
| Routing key (rpc)        | `{domain}.rpc.{snake_name}`              | `orders.rpc.create_order`                  |
| Queue                    | `{service}_{domain}_{type}_{snake_name}` | `order-service_orders_event_order_created` |
| Publication name         | `{domain}_{type}_{snake_name}`           | `orders_event_order_created`               |
| Subscription name        | `{domain}_{type}_{snake_name}`           | `orders_event_order_created`               |
| Reply queue              | `{service}_{instanceId}_reply`           | `order-service_abc123_reply`               |

## Logger

```typescript
interface Logger {
    silly(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    critical(message: string, ...args: any[]): void;
}

class ConsoleLogger implements Logger {
    /* maps to console.log/warn/error */
}
const defaultLogger: ConsoleLogger; // singleton
```

## BrokerWithExtensions

Utility type for combining a broker with middleware extension methods:

```typescript
type BrokerWithExtensions<T extends Record<string, any>[]> = BrokerAsPromised &
    UnionToIntersection<T[number]>;

// Usage with custom logger extensions:
const broker = (await builder.build()) as BrokerWithExtensions<[{ customMethod: () => void }]>;
```

## Gotchas

- `hoppity` is a plain object, not a class. Don't `new` it.
- Middleware functions are synchronous. Put async work in `onBrokerCreated`.
- Always clone topology before modifying: `structuredClone(topology)`.
- `.build()` returns a Promise. Don't forget `await`.
- Context mutations in `context.data` are permanent and visible to all downstream middleware.
- Event/command handlers auto-ack on success, nack without requeue on error.
- RPC handler errors are sent back to the caller as `RpcErrorCode.HANDLER_ERROR`.
- Inbound Zod validation failures (when `validateInbound: true`) nack without requeue.
- `publishes` must include any contract you want to call `publishEvent`, `sendCommand`, or `request` on. The topology won't include the publication otherwise.
