/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicationConfig } from "rascal";
import { EventContract, CommandContract, RpcContract } from "../contracts/types";
import { HandlerContext } from "../handlers/types";

/**
 * Metadata available to inbound wrappers when a message is received.
 * Provides contract identity and raw AMQP message headers so wrappers
 * can extract trace context or other propagated data.
 */
export interface InboundMetadata {
    /** The contract this handler is bound to */
    contract: EventContract | CommandContract | RpcContract;
    /** Operation kind — drives span naming and metric labels */
    kind: "event" | "command" | "rpc";
    /** The service name from hoppity.service() */
    serviceName: string;
    /** AMQP message surface — headers for trace context extraction, properties for message metadata */
    message: {
        headers: Record<string, any>;
        properties: Record<string, any>;
    };
}

/**
 * Metadata available to outbound wrappers when a message is published.
 * The contract isn't known until call time (publish is contract-agnostic),
 * so metadata is constructed per-call rather than at build time.
 */
export interface OutboundMetadata {
    /** The contract being published to */
    contract: EventContract | CommandContract | RpcContract;
    /** Operation kind — drives span naming and metric labels */
    kind: "event" | "command" | "rpc";
    /** The service name from hoppity.service() */
    serviceName: string;
}

/**
 * Wraps a handler function. Receives the original handler and per-message metadata.
 * Returns a replacement handler with the same signature.
 *
 * Composition: for interceptors [A, B], the call chain is A → B → handler.
 * A wraps B which wraps the original handler — unwinding goes B → A on return/throw.
 *
 * Metadata is built per-message because headers vary per message.
 * The wrapper itself is called per-message with fresh metadata each time.
 */
export type InboundWrapper = (
    handler: (payload: any, context: HandlerContext) => Promise<any>,
    metadata: InboundMetadata
) => (payload: any, context: HandlerContext) => Promise<any>;

/**
 * Wraps a publish function. Receives the inner publish and metadata about
 * the contract being published to. Returns a replacement publish with the same signature.
 *
 * The wrapper can modify the message, inject headers into overrides,
 * create spans, record metrics, or short-circuit the publish.
 *
 * Composition: for interceptors [A, B], the call chain is A → B → rascal publish.
 */
export type OutboundWrapper = (
    publish: (message: any, overrides?: PublicationConfig) => Promise<any>,
    metadata: OutboundMetadata
) => (message: any, overrides?: PublicationConfig) => Promise<any>;

/**
 * A unified interceptor that can wrap inbound handler execution,
 * outbound publish calls, or both.
 *
 * Either direction is optional — an interceptor with only `inbound` is valid,
 * as is one with only `outbound`. The framework skips the missing direction.
 *
 * Interceptors are configuration, not runtime state — they are wired at build
 * time and cannot be added or removed after the broker is created.
 */
export interface Interceptor {
    /** Name for logging and debugging — required, must be non-empty */
    name: string;
    /** Wraps handler execution for events, commands, and RPC responders */
    inbound?: InboundWrapper;
    /** Wraps publish calls for publishEvent, sendCommand, and request */
    outbound?: OutboundWrapper;
}
