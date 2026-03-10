# @apogeelabs/hoppity-operations — LLM Usage Guide

Typed runtime broker operations for hoppity-contracts. Wires contract-based event, command, and RPC handlers into the broker and extends it with typed outbound methods. Contract objects are the only accepted API surface — no string fallback.

## Imports

```typescript
import {
    withOperations,
    onEvent,
    onCommand,
    onRpc,
    RpcErrorCode,
} from "@apogeelabs/hoppity-operations";
import type {
    OperationsBroker,
    OperationsMiddlewareOptions,
    HandlerContext,
    EventHandler,
    CommandHandler,
    RpcHandler,
    HandlerDeclaration,
    EventHandlerDeclaration,
    CommandHandlerDeclaration,
    RpcHandlerDeclaration,
    RpcRequest,
    RpcResponse,
    RpcErrorCodeValue,
} from "@apogeelabs/hoppity-operations";
```

## Type Signatures

```typescript
// --- Handler context (passed to every handler) ---

interface HandlerContext {
    broker: OperationsBroker;
}

// --- Handler function signatures ---

type EventHandler<TSchema extends ZodTypeAny> = (
    content: z.infer<TSchema>,
    context: HandlerContext
) => Promise<void> | void;

type CommandHandler<TSchema extends ZodTypeAny> = (
    content: z.infer<TSchema>,
    context: HandlerContext
) => Promise<void> | void;

type RpcHandler<TReq extends ZodTypeAny, TRes extends ZodTypeAny> = (
    request: z.infer<TReq>,
    context: HandlerContext
) => Promise<z.infer<TRes>>;

// --- Handler declarations (returned by onEvent/onCommand/onRpc) ---

interface EventHandlerDeclaration {
    _kind: "event";
    contract: EventContract<any, any, any>;
    handler: EventHandler<any>;
}

interface CommandHandlerDeclaration {
    _kind: "command";
    contract: CommandContract<any, any, any>;
    handler: CommandHandler<any>;
}

interface RpcHandlerDeclaration {
    _kind: "rpc";
    contract: RpcContract<any, any, any, any>;
    handler: RpcHandler<any, any>;
}

type HandlerDeclaration =
    | EventHandlerDeclaration
    | CommandHandlerDeclaration
    | RpcHandlerDeclaration;

// --- Middleware options ---

interface OperationsMiddlewareOptions {
    serviceName: string; // Required, non-empty
    instanceId: string; // Required, non-empty, unique per instance
    handlers: HandlerDeclaration[];
    defaultTimeout?: number; // Default: 30_000 ms
    validateInbound?: boolean; // Default: true
    validateOutbound?: boolean; // Default: false
}

// --- Extended broker ---

interface OperationsBroker extends BrokerAsPromised {
    publishEvent<TSchema extends ZodTypeAny>(
        contract: EventContract<any, any, TSchema>,
        message: z.infer<TSchema>,
        overrides?: PublicationConfig
    ): Promise<void>;

    sendCommand<TSchema extends ZodTypeAny>(
        contract: CommandContract<any, any, TSchema>,
        message: z.infer<TSchema>,
        overrides?: PublicationConfig
    ): Promise<void>;

    request<TReq extends ZodTypeAny, TRes extends ZodTypeAny>(
        contract: RpcContract<any, any, TReq, TRes>,
        message: z.infer<TReq>,
        overrides?: PublicationConfig
    ): Promise<z.infer<TRes>>;

    cancelRequest(correlationId: string): boolean;
}

// --- RPC wire envelope (same format as hoppity-rpc) ---

interface RpcRequest {
    correlationId: string;
    rpcName: string;
    payload: any;
    replyTo: string;
    headers?: Record<string, any>;
}

interface RpcResponse {
    correlationId: string;
    payload?: any;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

// --- RPC error codes ---

const RpcErrorCode = {
    HANDLER_ERROR: "RPC_HANDLER_ERROR",
    TIMEOUT: "RPC_TIMEOUT",
    CANCELLED: "RPC_CANCELLED",
} as const;

type RpcErrorCodeValue = (typeof RpcErrorCode)[keyof typeof RpcErrorCode];
```

## Function Signatures

```typescript
// Middleware factory
function withOperations(options: OperationsMiddlewareOptions): MiddlewareFunction;

// Handler declaration helpers (pure factories, no side effects)
function onEvent<TSchema extends ZodTypeAny>(
    contract: EventContract<any, any, TSchema>,
    handler: EventHandler<TSchema>
): EventHandlerDeclaration;

function onCommand<TSchema extends ZodTypeAny>(
    contract: CommandContract<any, any, TSchema>,
    handler: CommandHandler<TSchema>
): CommandHandlerDeclaration;

function onRpc<TReq extends ZodTypeAny, TRes extends ZodTypeAny>(
    contract: RpcContract<any, any, TReq, TRes>,
    handler: RpcHandler<TReq, TRes>
): RpcHandlerDeclaration;
```

## Usage Examples

### Full pipeline — define contracts, build topology, wire operations

```typescript
import { defineDomain, buildServiceTopology } from "@apogeelabs/hoppity-contracts";
import hoppity from "@apogeelabs/hoppity";
import { withOperations, onEvent, onCommand, onRpc } from "@apogeelabs/hoppity-operations";
import type { OperationsBroker } from "@apogeelabs/hoppity-operations";
import { z } from "zod";

const Inventory = defineDomain("inventory", {
    events: {
        reserved: z.object({ itemId: z.string(), quantity: z.number() }),
    },
    commands: {
        reserve: z.object({ itemId: z.string(), quantity: z.number() }),
    },
    rpc: {
        checkAvailability: {
            request: z.object({ itemId: z.string() }),
            response: z.object({ available: z.boolean(), quantity: z.number() }),
        },
    },
});

const Order = defineDomain("order", {
    events: {
        placed: z.object({ orderId: z.string(), items: z.array(z.string()) }),
    },
});

const baseTopology = {
    vhosts: { "/": { connection: { url: "amqp://localhost" } } },
};

const topology = buildServiceTopology(baseTopology, "warehouse", t => {
    t.publishesEvent(Inventory.events.reserved);
    t.subscribesToEvent(Order.events.placed);
    t.handlesCommand(Inventory.commands.reserve);
    t.respondsToRpc(Inventory.rpc.checkAvailability);
});

const broker = (await hoppity
    .withTopology(topology)
    .use(
        withOperations({
            serviceName: "warehouse",
            instanceId: crypto.randomUUID(),
            handlers: [
                onEvent(Order.events.placed, async (content, { broker }) => {
                    // content: { orderId: string; items: string[] }
                    console.log("Order placed:", content.orderId);
                }),
                onCommand(Inventory.commands.reserve, async (content, { broker }) => {
                    // content: { itemId: string; quantity: number }
                    await reserveInventory(content.itemId, content.quantity);
                }),
                onRpc(Inventory.rpc.checkAvailability, async (request, { broker }) => {
                    // request: { itemId: string }
                    // return type enforced: { available: boolean; quantity: number }
                    const stock = await getStock(request.itemId);
                    return { available: stock > 0, quantity: stock };
                }),
            ],
        })
    )
    .build()) as OperationsBroker;
```

### Outbound operations

```typescript
// Publish a typed event
await broker.publishEvent(Inventory.events.reserved, {
    itemId: "abc-123",
    quantity: 5,
});

// Send a typed command
await broker.sendCommand(Inventory.commands.reserve, {
    itemId: "abc-123",
    quantity: 5,
});

// Make a typed RPC request
const result = await broker.request(Inventory.rpc.checkAvailability, {
    itemId: "abc-123",
});
// result: { available: boolean; quantity: number }

// Cancel a pending RPC request
broker.cancelRequest(correlationId);
```

### RPC client service (no inbound handlers)

```typescript
const topology = buildServiceTopology(baseTopology, "api-gateway", t => {
    t.callsRpc(Inventory.rpc.checkAvailability);
});

const broker = (await hoppity
    .withTopology(topology)
    .use(
        withOperations({
            serviceName: "api-gateway",
            instanceId: crypto.randomUUID(),
            handlers: [],
        })
    )
    .build()) as OperationsBroker;

try {
    const result = await broker.request(Inventory.rpc.checkAvailability, {
        itemId: "abc-123",
    });
} catch (err) {
    // RPC_TIMEOUT, RPC_HANDLER_ERROR, RPC_CANCELLED
}
```

### Composing with outbound exchange middleware

```typescript
import { withOutboundExchange } from "@apogeelabs/hoppity-contracts";

const broker = await hoppity
    .withTopology(topology)
    .use(withOutboundExchange("warehouse"))
    .use(withOperations({
        serviceName: "warehouse",
        instanceId: crypto.randomUUID(),
        handlers: [...],
    }))
    .build() as OperationsBroker;
```

### Enabling outbound validation

```typescript
withOperations({
    serviceName: "warehouse",
    instanceId: crypto.randomUUID(),
    handlers: [...],
    validateOutbound: true,  // zod parse on every publish/send/request
});
```

## How It Works

1. **Topology phase**: If any `onRpc` handler is present, adds a reply queue (`{serviceName}_{instanceId}_reply`), its subscription, and an `rpc_reply` publication (default exchange, dynamic routing key) to every vhost. Stores config in `context.data.operationsConfig`.

2. **onBrokerCreated phase**:
    - Subscribes all event and command handlers to their `contract.subscriptionName`
    - Attaches `publishEvent` and `sendCommand` methods to the broker (resolve publication names from contracts)
    - Subscribes all RPC handlers to their `contract.subscriptionName`
    - Sets up the reply queue subscription for correlation resolution
    - Attaches `request` and `cancelRequest` methods to the broker
    - Wraps `broker.shutdown` to clean up pending RPC requests

3. **Event/command message flow**: Message arrives on subscription -> optional zod validation -> handler called with typed content -> auto-ack on success, auto-nack (dead-letter, no requeue) on error

4. **RPC responder flow**: `RpcRequest` envelope arrives -> extract correlationId/replyTo/payload -> optional zod validation on payload -> handler called -> `RpcResponse` published to `rpc_reply` with `routingKey: replyTo` -> ack

5. **RPC requester flow**: `broker.request()` generates correlationId -> optional outbound validation -> publishes `RpcRequest` to `contract.publicationName` -> waits for matching `RpcResponse` on reply queue -> optional inbound validation on response -> resolves promise

## Gotchas

- **Cast to `OperationsBroker`** — `build()` returns `BrokerAsPromised`. You must cast: `build() as OperationsBroker` to access `.publishEvent()`, `.sendCommand()`, `.request()`, and `.cancelRequest()`.
- **`serviceName` and `instanceId` are required** — empty strings or whitespace-only values throw at middleware construction time.
- **All handlers must be declared upfront** — dynamic handler registration after broker creation is not supported. Use `hoppity-subscriptions` for that.
- **Auto-ack means nack dead-letters** — handler errors nack with `requeue: false`. Messages go to dead-letter, not back to the queue. This prevents infinite loops on deterministic errors.
- **RPC handler must return a Promise** — `onRpc` expects `async (request, context) => response`.
- **Inbound validation is on by default** — zod parse runs on every incoming message. Disable with `validateInbound: false` for hot paths.
- **Reply queue is exclusive and auto-delete** — tied to the connection. Service restart = new queue. Pending requests from before restart will timeout.
- **RPC for callers too** — services that only call RPCs (no responder handlers) still need `withOperations` for the reply queue infrastructure. Pass an empty `handlers: []`.
- **`rpc_reply` publication guard** — if `hoppity-rpc`'s `withRpcSupport` already added an `rpc_reply` publication, `withOperations` skips adding another (logs a warning). Both use the same default exchange + routing key.
