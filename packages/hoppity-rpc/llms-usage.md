# @apogeelabs/hoppity-rpc — LLM Usage Guide

Request/response RPC over RabbitMQ with automatic correlation ID management and configurable timeouts.

## Imports

```typescript
import { withRpcSupport } from "@apogeelabs/hoppity-rpc";
import { RpcErrorCode } from "@apogeelabs/hoppity-rpc";
import type {
    RpcMiddlewareOptions,
    RpcRequest,
    RpcResponse,
    RpcBroker,
} from "@apogeelabs/hoppity-rpc";
import type { Logger } from "@apogeelabs/hoppity-rpc"; // Re-exported from core
```

## Type Signatures

```typescript
interface RpcMiddlewareOptions {
    serviceName: string; // Used for queue naming and routing
    instanceId: string; // Unique per service instance (use randomUUID())
    rpcExchange?: string; // Defaults to "rpc_requests"
    defaultTimeout?: number; // Defaults to 30_000 ms
}

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
    headers?: Record<string, any>;
}

interface RpcBroker extends BrokerAsPromised {
    request<TRequest = any, TResponse = any>(
        rpcName: string,
        message: TRequest,
        overrides?: PublicationConfig
    ): Promise<TResponse>;

    addRpcListener<TRequest = any, TResponse = any>(
        rpcName: string,
        handler: (request: TRequest) => Promise<TResponse>
    ): void;

    cancelRequest(correlationId: string): boolean;
}

enum RpcErrorCode {
    TIMEOUT = "RPC_TIMEOUT",
    METHOD_NOT_FOUND = "RPC_METHOD_NOT_FOUND",
    HANDLER_ERROR = "RPC_HANDLER_ERROR",
    CANCELLED = "RPC_CANCELLED",
    SERVICE_UNAVAILABLE = "RPC_SERVICE_UNAVAILABLE",
}
```

### Function Signature

```typescript
function withRpcSupport(options: RpcMiddlewareOptions): MiddlewareFunction;
```

## Usage Examples

### Basic RPC handler

```typescript
import hoppity from "@apogeelabs/hoppity";
import { withRpcSupport, RpcBroker } from "@apogeelabs/hoppity-rpc";
import { randomUUID } from "crypto";

const broker = (await hoppity
    .withTopology(baseTopology)
    .use(
        withRpcSupport({
            serviceName: "user-service",
            instanceId: randomUUID(),
        })
    )
    .build()) as RpcBroker;

// Register a handler
broker.addRpcListener<{ userId: string }, { name: string }>(
    "user-service.getProfile",
    async request => {
        return { name: "Jane Doe" };
    }
);
```

### Making RPC requests

```typescript
const broker = (await hoppity
    .withTopology(baseTopology)
    .use(
        withRpcSupport({
            serviceName: "api-gateway",
            instanceId: randomUUID(),
            defaultTimeout: 10_000,
        })
    )
    .build()) as RpcBroker;

try {
    const profile = await broker.request<{ userId: string }, { name: string }>(
        "user-service.getProfile",
        { userId: "42" }
    );
    console.log(profile.name);
} catch (err) {
    // Timeout, method not found, handler error, etc.
    console.error(err);
}
```

## How It Works

1. **Topology modification**: The middleware adds an RPC topic exchange, reply queue (exclusive, auto-delete), inbound queue (exclusive, auto-delete), bindings, publications, and subscriptions to every vhost in the topology.

2. **Queue naming**: Queues are named `rpc_{serviceName}_{instanceId}_reply` and `rpc_{serviceName}_{instanceId}_inbound`. Non-alphanumeric characters in serviceName/instanceId are replaced with underscores.

3. **Request flow**:
    - `broker.request()` generates a `correlationId` via `randomUUID()`, stores a pending promise in the correlation manager, and publishes to the RPC exchange with routing key `rpc.{rpcName}.request`.
    - The message includes `replyTo` (the reply queue name) so the handler knows where to respond.

4. **Handler flow**:
    - Inbound queue subscription receives the request, looks up the handler by `rpcName`.
    - Handler is called with the request payload. Response (or error) is published to the reply queue using RabbitMQ's default direct exchange with routing key = `replyTo`.

5. **Response flow**:
    - Reply queue subscription receives the response, extracts `correlationId`, resolves/rejects the stored promise.

6. **Timeout**: Each request has a timeout (default 30s). Expired requests are rejected with `RPC_TIMEOUT`.

7. **Cleanup**: On broker shutdown, all pending requests are rejected and the correlation manager is cleaned up.

## Gotchas

- ⚠️ **Cast to `RpcBroker`** — `build()` returns `BrokerAsPromised`. You must cast: `build() as RpcBroker` to access `.request()` and `.addRpcListener()`.
- ⚠️ **`serviceName` and `instanceId` are required** — empty strings or whitespace-only values will throw.
- ⚠️ **Both services need `withRpcSupport`** — the requester and the handler service both need the middleware for their respective queue infrastructure.
- ⚠️ **Handler must return a Promise** — `addRpcListener` expects `async (request) => response`. Sync return will not work.
- ⚠️ **`rpcName` is just a string convention** — the typical pattern is `serviceName.methodName` (e.g., `"user-service.getProfile"`), but any string works. The routing uses `rpc.{rpcName}.request` and the binding pattern is `rpc.{serviceName}.#.request`.
- ⚠️ **Queues are exclusive and auto-delete** — they're tied to the connection. If the service restarts, it gets new queues. Pending requests from before the restart will timeout.
