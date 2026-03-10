/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerAsPromised, PublicationConfig } from "rascal";
import { EventContract, CommandContract, RpcContract } from "@apogeelabs/hoppity-contracts";
import { z, ZodTypeAny } from "zod";

// ---------------------------------------------------------------------------
// Handler context — passed to every handler invocation
// ---------------------------------------------------------------------------

/**
 * Context object passed to every handler invocation.
 * Gives handlers access to the extended broker for outbound operations
 * (e.g., publishing follow-up events from within a command handler).
 */
export interface HandlerContext {
    broker: OperationsBroker;
}

// ---------------------------------------------------------------------------
// Handler function signatures
// Content types are inferred from contract schemas via z.infer<TSchema>,
// so type mismatches between handler and contract are compile-time errors.
// ---------------------------------------------------------------------------

/**
 * Handler for domain events. May be sync or async — auto-acked on success.
 * @typeParam TSchema - The Zod schema from the EventContract
 */
export type EventHandler<TSchema extends ZodTypeAny> = (
    content: z.infer<TSchema>,
    context: HandlerContext
) => Promise<void> | void;

/**
 * Handler for domain commands. May be sync or async — auto-acked on success.
 * @typeParam TSchema - The Zod schema from the CommandContract
 */
export type CommandHandler<TSchema extends ZodTypeAny> = (
    content: z.infer<TSchema>,
    context: HandlerContext
) => Promise<void> | void;

/**
 * Handler for RPC operations. Must be async and return the response type.
 * @typeParam TReq - The Zod schema for the request payload
 * @typeParam TRes - The Zod schema for the response payload
 */
export type RpcHandler<TReq extends ZodTypeAny, TRes extends ZodTypeAny> = (
    request: z.infer<TReq>,
    context: HandlerContext
) => Promise<z.infer<TRes>>;

// ---------------------------------------------------------------------------
// Handler declarations — returned by onEvent / onCommand / onRpc
// These are pure data objects pairing a contract with its handler.
// The _kind discriminant lets withOperations route each to the correct
// subscription wiring logic without type assertions.
// ---------------------------------------------------------------------------

/** Declaration returned by {@link onEvent}. */
export interface EventHandlerDeclaration {
    _kind: "event";
    contract: EventContract<any, any, any>;
    handler: EventHandler<any>;
}

/** Declaration returned by {@link onCommand}. */
export interface CommandHandlerDeclaration {
    _kind: "command";
    contract: CommandContract<any, any, any>;
    handler: CommandHandler<any>;
}

/** Declaration returned by {@link onRpc}. */
export interface RpcHandlerDeclaration {
    _kind: "rpc";
    contract: RpcContract<any, any, any, any>;
    handler: RpcHandler<any, any>;
}

export type HandlerDeclaration =
    | EventHandlerDeclaration
    | CommandHandlerDeclaration
    | RpcHandlerDeclaration;

// ---------------------------------------------------------------------------
// Middleware options
// ---------------------------------------------------------------------------

/**
 * Configuration for the {@link withOperations} middleware factory.
 * All handlers must be declared upfront — dynamic registration after broker creation is not supported.
 */
export interface OperationsMiddlewareOptions {
    serviceName: string;
    instanceId: string;
    handlers: HandlerDeclaration[];
    /** Default RPC timeout in ms (defaults to 30_000) */
    defaultTimeout?: number;
    /** Validate inbound payloads against contract schemas (defaults to true) */
    validateInbound?: boolean;
    /** Validate outbound payloads against contract schemas (defaults to false) */
    validateOutbound?: boolean;
}

// ---------------------------------------------------------------------------
// Extended broker — adds typed operation methods to BrokerAsPromised.
// These methods are monkey-patched onto the broker in onBrokerCreated,
// so callers must cast: `build() as OperationsBroker`.
// ---------------------------------------------------------------------------

/**
 * Broker instance extended with typed contract-based operation methods.
 * Obtained by casting the result of `hoppity.build()` after `withOperations` middleware.
 */
export interface OperationsBroker extends BrokerAsPromised {
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

// ---------------------------------------------------------------------------
// RPC wire envelope — same format as hoppity-rpc for interoperability
// ---------------------------------------------------------------------------

export interface RpcRequest {
    correlationId: string;
    rpcName: string;
    payload: any;
    replyTo: string;
    headers?: Record<string, any>;
}

export interface RpcResponse {
    correlationId: string;
    payload?: any;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

// ---------------------------------------------------------------------------
// RPC error codes
// ---------------------------------------------------------------------------

export const RpcErrorCode = {
    HANDLER_ERROR: "RPC_HANDLER_ERROR",
    TIMEOUT: "RPC_TIMEOUT",
    CANCELLED: "RPC_CANCELLED",
} as const;

export type RpcErrorCodeValue = (typeof RpcErrorCode)[keyof typeof RpcErrorCode];
