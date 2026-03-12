/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerAsPromised, PublicationConfig } from "rascal";
import { EventContract, CommandContract, RpcContract } from "../contracts/types";
import { z, ZodTypeAny } from "zod";

// ---------------------------------------------------------------------------
// ServiceBroker forward reference — defined fully in broker/types.ts.
// Declared here as a minimal interface so HandlerContext can reference it
// without creating a circular import.
// ---------------------------------------------------------------------------

/**
 * Minimal broker surface exposed to handler functions.
 * The full ServiceBroker interface is in broker/types.ts.
 */
export interface HandlerContextBroker extends BrokerAsPromised {
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
// Handler context — passed to every handler invocation
// ---------------------------------------------------------------------------

/**
 * Context object passed to every handler invocation.
 * Gives handlers typed access to the broker for outbound operations.
 */
export interface HandlerContext {
    broker: HandlerContextBroker;
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
// The _kind discriminant lets ServiceBuilder route each to the correct
// subscription wiring logic without type assertions.
// ---------------------------------------------------------------------------

/** Declaration returned by {@link onEvent}. */
export interface EventHandlerDeclaration {
    _kind: "event";
    contract: EventContract<any, any, any>;
    handler: EventHandler<any>;
    options?: import("../contracts/types").HandlerOptions;
}

/** Declaration returned by {@link onCommand}. */
export interface CommandHandlerDeclaration {
    _kind: "command";
    contract: CommandContract<any, any, any>;
    handler: CommandHandler<any>;
    options?: import("../contracts/types").HandlerOptions;
}

/** Declaration returned by {@link onRpc}. */
export interface RpcHandlerDeclaration {
    _kind: "rpc";
    contract: RpcContract<any, any, any, any>;
    handler: RpcHandler<any, any>;
    options?: import("../contracts/types").HandlerOptions;
}

export type HandlerDeclaration =
    | EventHandlerDeclaration
    | CommandHandlerDeclaration
    | RpcHandlerDeclaration;
