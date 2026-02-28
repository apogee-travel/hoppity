/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerAsPromised, PublicationConfig } from "rascal";

/**
 * Configuration options for the RPC middleware
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
 * Structure of an RPC request message
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
 * Structure of an RPC response message
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
 * Extended broker interface with RPC capabilities
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
 * Standard RPC error codes
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
