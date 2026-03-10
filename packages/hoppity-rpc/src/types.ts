/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerAsPromised, PublicationConfig } from "rascal";

/**
 * Configuration options for the RPC middleware.
 *
 * `serviceName` drives queue naming and routing key generation — it determines which
 * inbound messages this service receives. `instanceId` ensures each running instance
 * gets its own exclusive queues, so multiple instances of the same service can coexist
 * without stealing each other's replies.
 *
 * @example
 * ```typescript
 * const options: RpcMiddlewareOptions = {
 *     serviceName: "hotel-service",
 *     instanceId: randomUUID(),
 *     rpcExchange: "my_rpc_exchange",  // optional, defaults to "rpc_requests"
 *     defaultTimeout: 15_000,          // optional, defaults to 30_000
 * };
 * ```
 */
export interface RpcMiddlewareOptions {
    /** The name of the service (used for queue naming and routing) */
    serviceName: string;
    /** Unique instance identifier (should be different for each service instance) */
    instanceId: string;
    /** The name of the RPC exchange to use for routing RPC messages (defaults to "rpc_requests") */
    rpcExchange?: string;
    /** Default timeout for RPC requests in milliseconds (defaults to 30_000) */
    defaultTimeout?: number;
}

/**
 * Structure of an RPC request message.
 *
 * This is the wire format published to the RPC exchange. The `replyTo` field tells
 * the handler where to send the response — it's the name of the requester's exclusive
 * reply queue, routed via RabbitMQ's default direct exchange.
 *
 * @example
 * ```typescript
 * // You rarely construct this yourself — broker.request() builds it internally.
 * // But if you're inspecting messages for debugging:
 * const req: RpcRequest = {
 *     correlationId: "550e8400-e29b-41d4-a716-446655440000",
 *     rpcName: "user-service.getProfile",
 *     payload: { userId: "42" },
 *     replyTo: "rpc_api_gateway_abc123_reply",
 * };
 * ```
 */
export interface RpcRequest {
    /** Unique correlation ID to match request with response */
    correlationId: string;
    /** The name of the RPC method being called */
    rpcName: string;
    /** The request payload */
    payload: any;
    /** The reply-to queue name for the response */
    replyTo: string;
    /** Optional headers for additional metadata */
    headers?: Record<string, any>;
}

/**
 * Structure of an RPC response message.
 *
 * Sent by the handler back to the requester's reply queue. Exactly one of `payload`
 * or `error` will be populated — `payload` for success, `error` for failure. The
 * `correlationId` must match the original request so the correlation manager can
 * route it to the correct pending promise.
 *
 * @example
 * ```typescript
 * // Success response (constructed internally by the inbound handler):
 * const success: RpcResponse = {
 *     correlationId: "550e8400-e29b-41d4-a716-446655440000",
 *     payload: { name: "Jane Doe" },
 * };
 *
 * // Error response:
 * const failure: RpcResponse = {
 *     correlationId: "550e8400-e29b-41d4-a716-446655440000",
 *     error: { code: RpcErrorCode.HANDLER_ERROR, message: "User not found" },
 * };
 * ```
 */
export interface RpcResponse {
    /** Correlation ID matching the original request */
    correlationId: string;
    /** The response payload (if successful) */
    payload?: any;
    /** Error information (if the request failed) */
    error?: {
        /** Error code for programmatic handling */
        code: string;
        /** Human-readable error message */
        message: string;
        /** Additional error details */
        details?: any;
    };
    /** Optional headers for additional metadata */
    headers?: Record<string, any>;
}

/**
 * Extended broker interface with RPC capabilities.
 *
 * `build()` returns a standard Rascal `BrokerAsPromised`. The RPC middleware
 * monkey-patches `.request()`, `.addRpcListener()`, and `.cancelRequest()` onto
 * it at runtime during the `onBrokerCreated` phase. Cast the result to `RpcBroker`
 * to get type-safe access to these methods.
 *
 * @example
 * ```typescript
 * const broker = await hoppity
 *     .withTopology(topology)
 *     .use(withRpcSupport({ serviceName: "my-svc", instanceId: randomUUID() }))
 *     .build() as RpcBroker;
 *
 * // Now TypeScript knows about .request() and .addRpcListener()
 * broker.addRpcListener("my-svc.echo", async (msg) => msg);
 * const result = await broker.request("my-svc.echo", { hello: "world" });
 * ```
 */
export interface RpcBroker extends BrokerAsPromised {
    /**
     * Makes an RPC request to another service
     *
     * @template TRequest - Type of the request payload
     * @template TResponse - Type of the response payload
     * @param rpcName - The name of the RPC method to call
     * @param message - The request payload
     * @param overrides - Optional publication configuration overrides
     * @returns Promise that resolves to the response payload
     */
    request<TRequest = any, TResponse = any>(
        rpcName: string,
        message: TRequest,
        overrides?: PublicationConfig
    ): Promise<TResponse>;

    /**
     * Registers a handler for an RPC method
     *
     * @template TRequest - Type of the request payload
     * @template TResponse - Type of the response payload
     * @param rpcName - The name of the RPC method to handle
     * @param handler - Function that processes the request and returns a response
     */
    addRpcListener<TRequest = any, TResponse = any>(
        rpcName: string,
        handler: (request: TRequest) => Promise<TResponse>
    ): void;

    /**
     * Cancels a pending RPC request
     *
     * @param correlationId - The correlation ID of the request to cancel
     * @returns True if the request was found and cancelled, false otherwise
     */
    cancelRequest(correlationId: string): boolean;
}

/**
 * Standard RPC error codes.
 *
 * These are the `code` values that appear in `RpcResponse.error.code`.
 * They're strings (not numeric) so they're human-readable in logs and
 * don't collide with HTTP status codes or AMQP reply codes.
 */
export enum RpcErrorCode {
    /** Request timed out */
    TIMEOUT = "RPC_TIMEOUT",
    /** RPC method not found */
    METHOD_NOT_FOUND = "RPC_METHOD_NOT_FOUND",
    /** Error occurred in the RPC handler */
    HANDLER_ERROR = "RPC_HANDLER_ERROR",
    /** Request was cancelled */
    CANCELLED = "RPC_CANCELLED",
    /** Service unavailable */
    SERVICE_UNAVAILABLE = "RPC_SERVICE_UNAVAILABLE",
}
