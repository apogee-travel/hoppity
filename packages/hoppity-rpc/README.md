# Hoppity RPC

RPC utilities for hoppity - enables service-to-service communication over RabbitMQ using request/response patterns with full type safety.

## Features

- **Type-safe RPC calls** with generic method signatures
- **Automatic correlation ID management** for request/response matching
- **Configurable timeouts** and request cancellation
- **Exclusive queues** that auto-delete when services disconnect
- **Automatic load balancing** via RabbitMQ round-robin
- **Structured error handling** with error codes
- **Clean shutdown** with proper resource cleanup
- **Integrated logging** via hoppity's context logger

## Installation

```bash
pnpm add @apogeelabs/hoppity-rpc
# or
npm install @apogeelabs/hoppity-rpc
```

## Quick Start

### Basic Usage

```typescript
import hoppity from "@apogeelabs/hoppity";
import { withRpcSupport } from "@apogeelabs/hoppity-rpc";

// Create broker with RPC support
const broker = await hoppity
    .withTopology(baseTopology)
    .use(
        withRpcSupport({
            serviceName: "hotel-service",
            instanceId: "instance-123",
        })
    )
    .build();

// Add RPC handler
broker.addRpcListener<{ hotelIds: string[] }, { availability: any[] }>(
    "hotel-availability.multi-hotel-availability",
    async request => {
        return { availability: await getHotelAvailability(request.hotelIds) };
    }
);

// Make RPC call
const response = await broker.request<{ hotelIds: string[] }, { availability: any[] }>(
    "hotel-availability.multi-hotel-availability",
    { hotelIds: ["123", "456"] }
);
```

### Advanced Configuration

```typescript
const broker = await hoppity
    .withTopology(baseTopology)
    .use(
        withRpcSupport({
            serviceName: "hotel-service",
            instanceId: crypto.randomUUID(), // Unique per instance
            rpcExchange: "my_custom_exchange", // Override the default "rpc_requests"
            defaultTimeout: 15000, // 15 seconds (default is 30000)
        })
    )
    .build();
```

## API Reference

### `withRpcSupport(options)`

Creates a hoppity middleware that adds RPC capabilities to your broker.

#### Options

| Option           | Type     | Required | Default          | Description                                                  |
| ---------------- | -------- | -------- | ---------------- | ------------------------------------------------------------ |
| `serviceName`    | `string` | Yes      | -                | The name of your service (used for queue naming and routing) |
| `instanceId`     | `string` | Yes      | -                | Unique identifier for this service instance                  |
| `rpcExchange`    | `string` | No       | `"rpc_requests"` | The RabbitMQ exchange name for RPC routing                   |
| `defaultTimeout` | `number` | No       | `30000`          | Default timeout for RPC requests in milliseconds             |

### `broker.request<TRequest, TResponse>(rpcName, message, overrides?)`

Makes an RPC request to another service.

#### Parameters

- `rpcName` (string): The name of the RPC method to call
- `message` (TRequest): The request payload
- `overrides?` (PublicationConfig): Optional publication configuration overrides

#### Returns

Promise<TResponse>: Resolves with the response payload or rejects with an error

#### Example

```typescript
// Simple request
const result = await broker.request("user.get", { userId: "123" });

// Typed request
interface GetUserRequest {
    userId: string;
}

interface GetUserResponse {
    user: {
        id: string;
        name: string;
        email: string;
    };
}

const user = await broker.request<GetUserRequest, GetUserResponse>("user.get", { userId: "123" });
```

### `broker.addRpcListener<TRequest, TResponse>(rpcName, handler)`

Registers a handler for an RPC method.

#### Parameters

- `rpcName` (string): The name of the RPC method to handle
- `handler` (function): Function that processes the request and returns a response

#### Example

```typescript
// Simple handler
broker.addRpcListener("user.get", async request => {
    const user = await getUserById(request.userId);
    return { user };
});

// Typed handler
interface GetUserRequest {
    userId: string;
}

interface GetUserResponse {
    user: {
        id: string;
        name: string;
        email: string;
    };
}

broker.addRpcListener<GetUserRequest, GetUserResponse>("user.get", async request => {
    const user = await getUserById(request.userId);
    return { user };
});
```

### `broker.cancelRequest(correlationId)`

Cancels a pending RPC request.

#### Parameters

- `correlationId` (string): The correlation ID of the request to cancel

#### Returns

boolean: True if the request was found and cancelled, false otherwise

## Architecture

### Queue Structure

The middleware creates the following RabbitMQ infrastructure:

- **RPC Exchange**: Topic exchange for routing RPC requests
- **Reply Queue**: `rpc_{serviceName}_{instanceId}_reply` (exclusive, auto-delete)
- **Inbound Queue**: `rpc_{serviceName}_{instanceId}_inbound` (exclusive, auto-delete)

### Routing

- **Request Routing Key**: `rpc.{rpcName}.request`
- **Service Binding Pattern**: `rpc.{serviceName}.#.request`

### Message Flow

1. **Request**: Client calls `broker.request()` → publishes to RPC exchange → routed to service
2. **Processing**: Service receives request → executes handler → sends response
3. **Response**: Response sent to reply queue → client receives response → promise resolves

### Topology Changes

The RPC middleware transforms your base topology by adding the necessary RabbitMQ infrastructure. Here's what gets added:

#### Before (Base Topology)

```typescript
const baseTopology = {
    vhosts: {
        "/": {
            connection: {
                hostname: "localhost",
                port: 5672,
                username: "guest",
                password: "guest",
            },
        },
    },
};
```

#### After (With RPC Middleware)

```typescript
const broker = await hoppity
    .withTopology(baseTopology)
    .use(
        withRpcSupport({
            serviceName: "hotel-service",
            instanceId: "instance-123",
            // rpcExchange defaults to "rpc_requests" if omitted
        })
    )
    .build();

// The resulting topology includes:
const resultingTopology = {
    vhosts: {
        "/": {
            connection: {
                hostname: "localhost",
                port: 5672,
                username: "guest",
                password: "guest",
            },
            // Added by RPC middleware:
            exchanges: {
                rpc_requests: {
                    type: "topic",
                    options: {
                        durable: true,
                    },
                },
            },
            queues: {
                rpc_hotel_service_instance_123_reply: {
                    options: {
                        exclusive: true,
                        autoDelete: true,
                    },
                },
                rpc_hotel_service_instance_123_inbound: {
                    options: {
                        exclusive: true,
                        autoDelete: true,
                    },
                },
            },
            bindings: {
                rpc_hotel_service_instance_123_inbound_binding: {
                    source: "rpc_requests",
                    destination: "rpc_hotel_service_instance_123_inbound",
                    destinationType: "queue",
                    bindingKey: "rpc.hotel-service.#.request",
                },
            },
            subscriptions: {
                rpc_hotel_service_instance_123_inbound_subscription: {
                    queue: "rpc_hotel_service_instance_123_inbound",
                    options: {
                        prefetch: 1,
                    },
                },
                rpc_hotel_service_instance_123_reply_subscription: {
                    queue: "rpc_hotel_service_instance_123_reply",
                    options: {
                        prefetch: 1,
                    },
                },
            },
            publications: {
                rpc_request: {
                    exchange: "rpc_requests",
                },
                rpc_reply: {
                    exchange: "", // Default direct exchange
                    routingKey: "{{replyTo}}",
                    options: {
                        persistent: false,
                    },
                },
            },
        },
    },
};
```

**Key Changes:**

- **Exchange**: Adds a durable topic exchange for RPC routing
- **Queues**: Creates two exclusive, auto-delete queues per service instance
- **Bindings**: Binds the inbound queue to the RPC exchange with service-specific pattern
- **Subscriptions**: Sets up subscriptions for both queues with prefetch=1
- **Publications**: Adds publications for sending requests and responses

## Error Handling

### RPC Error Codes

```typescript
enum RpcErrorCode {
    TIMEOUT = "RPC_TIMEOUT",
    METHOD_NOT_FOUND = "RPC_METHOD_NOT_FOUND",
    HANDLER_ERROR = "RPC_HANDLER_ERROR",
    CANCELLED = "RPC_CANCELLED",
    SERVICE_UNAVAILABLE = "RPC_SERVICE_UNAVAILABLE",
}
```

### Error Response Structure

```typescript
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
```

### Handling Errors

```typescript
try {
    const result = await broker.request("user.get", { userId: "123" });
} catch (error) {
    if (error.message.includes("RPC_TIMEOUT")) {
        // Handle timeout
    } else if (error.message.includes("RPC_METHOD_NOT_FOUND")) {
        // Handle method not found
    }
}
```

## Best Practices

### Service Naming

- Use consistent service names across your infrastructure
- Use descriptive RPC method names (e.g., `user.get`, `hotel.availability.check`)

### Instance IDs

- Generate unique instance IDs for each service instance
- Use UUIDs or timestamps to ensure uniqueness
- Don't reuse instance IDs across restarts

### Error Handling

- Always handle RPC errors gracefully
- Implement retry logic for transient failures
- Log errors with correlation IDs for debugging

### Performance

- Set appropriate timeouts based on your use case
- Use request cancellation for long-running operations
- Monitor queue depths and response times

### Security

- Validate all incoming RPC requests
- Implement authentication/authorization if needed
- Use secure RabbitMQ connections

## Examples

### Service A (RPC Client)

```typescript
import hoppity from "@apogeelabs/hoppity";
import { withRpcSupport } from "@apogeelabs/hoppity-rpc";

const broker = await hoppity
    .withTopology(baseTopology)
    .use(
        withRpcSupport({
            serviceName: "api-gateway",
            instanceId: crypto.randomUUID(),
        })
    )
    .build();

// Make RPC calls to other services
const user = await broker.request("user.get", { userId: "123" });
const hotels = await broker.request("hotel.search", { location: "NYC" });
```

### Service B (RPC Server)

```typescript
import hoppity from "@apogeelabs/hoppity";
import { withRpcSupport } from "@apogeelabs/hoppity-rpc";

const broker = await hoppity
    .withTopology(baseTopology)
    .use(
        withRpcSupport({
            serviceName: "user-service",
            instanceId: crypto.randomUUID(),
        })
    )
    .build();

// Register RPC handlers
broker.addRpcListener("user.get", async request => {
    const user = await getUserById(request.userId);
    return { user };
});

broker.addRpcListener("user.create", async request => {
    const user = await createUser(request.userData);
    return { user };
});
```

## License

ISC

---
