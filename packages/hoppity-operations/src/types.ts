/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerAsPromised, PublicationConfig } from "rascal";
import { EventContract, CommandContract, RpcContract } from "@apogeelabs/hoppity-contracts";
import { z, ZodTypeAny } from "zod";

// ---------------------------------------------------------------------------
// Handler context — passed to every handler invocation
// ---------------------------------------------------------------------------

export interface HandlerContext {
    broker: OperationsBroker;
}

// ---------------------------------------------------------------------------
// Handler function signatures
// ---------------------------------------------------------------------------

export type EventHandler<TSchema extends ZodTypeAny> = (
    content: z.infer<TSchema>,
    context: HandlerContext
) => Promise<void> | void;

export type CommandHandler<TSchema extends ZodTypeAny> = (
    content: z.infer<TSchema>,
    context: HandlerContext
) => Promise<void> | void;

export type RpcHandler<TReq extends ZodTypeAny, TRes extends ZodTypeAny> = (
    request: z.infer<TReq>,
    context: HandlerContext
) => Promise<z.infer<TRes>>;

// ---------------------------------------------------------------------------
// Handler declarations — returned by onEvent / onCommand / onRpc
// ---------------------------------------------------------------------------

export interface EventHandlerDeclaration {
    _kind: "event";
    contract: EventContract<any, any, any>;
    handler: EventHandler<any>;
}

export interface CommandHandlerDeclaration {
    _kind: "command";
    contract: CommandContract<any, any, any>;
    handler: CommandHandler<any>;
}

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
// Extended broker — adds typed operation methods to BrokerAsPromised
// ---------------------------------------------------------------------------

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
