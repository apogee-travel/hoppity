/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZodTypeAny } from "zod";

/**
 * A contract describing a domain event — something that happened.
 *
 * TDomain: the domain name literal (e.g. "donated_inventory")
 * TName: the operation name literal (e.g. "created")
 * TSchema: the zod schema for the event payload
 */
export interface EventContract<
    TDomain extends string = string,
    TName extends string = string,
    TSchema extends ZodTypeAny = ZodTypeAny,
> {
    _type: "event";
    _domain: TDomain;
    _name: TName;
    schema: TSchema;
    /** The RabbitMQ exchange name for this domain's events and commands */
    exchange: string;
    /** The topic routing key: {domain}.event.{snake_name} */
    routingKey: string;
    /** The rascal publication name: {domain}_event_{snake_name} */
    publicationName: string;
    /** The rascal subscription name: {domain}_event_{snake_name} */
    subscriptionName: string;
}

/**
 * A contract describing a domain command — an instruction to do something.
 *
 * Shape is identical to EventContract but semantically distinct: commands are
 * imperatives directed at a service, events are facts broadcast to the world.
 */
export interface CommandContract<
    TDomain extends string = string,
    TName extends string = string,
    TSchema extends ZodTypeAny = ZodTypeAny,
> {
    _type: "command";
    _domain: TDomain;
    _name: TName;
    schema: TSchema;
    /** The RabbitMQ exchange name for this domain's events and commands */
    exchange: string;
    /** The topic routing key: {domain}.command.{snake_name} */
    routingKey: string;
    /** The rascal publication name: {domain}_command_{snake_name} */
    publicationName: string;
    /** The rascal subscription name: {domain}_command_{snake_name} */
    subscriptionName: string;
}

/**
 * A contract describing a domain RPC operation — a synchronous request/response.
 *
 * RPC operations get their own exchange ({domain}_rpc) to keep request/reply
 * mechanics separate from pub/sub event routing.
 */
export interface RpcContract<
    TDomain extends string = string,
    TName extends string = string,
    TRequest extends ZodTypeAny = ZodTypeAny,
    TResponse extends ZodTypeAny = ZodTypeAny,
> {
    _type: "rpc";
    _domain: TDomain;
    _name: TName;
    requestSchema: TRequest;
    responseSchema: TResponse;
    /** The RPC exchange name: {domain}_rpc */
    exchange: string;
    /** The topic routing key: {domain}.rpc.{snake_name} */
    routingKey: string;
    /** The rascal publication name: {domain}_rpc_{snake_name} */
    publicationName: string;
    /** The rascal subscription name: {domain}_rpc_{snake_name} */
    subscriptionName: string;
}

/**
 * The shape of each entry in the events definition map passed to defineDomain.
 * Maps operation names to their zod schemas.
 */
export type EventsDefinition = Record<string, ZodTypeAny>;

/**
 * The shape of each entry in the commands definition map passed to defineDomain.
 */
export type CommandsDefinition = Record<string, ZodTypeAny>;

/**
 * The shape of each entry in the rpc definition map passed to defineDomain.
 */
export type RpcDefinition = Record<string, { request: ZodTypeAny; response: ZodTypeAny }>;

/**
 * The input shape passed to defineDomain — the raw definition before wrapping
 * in contract types.
 */
export interface DomainDefinitionInput<
    TEvents extends EventsDefinition = EventsDefinition,
    TCommands extends CommandsDefinition = CommandsDefinition,
    TRpc extends RpcDefinition = RpcDefinition,
> {
    events?: TEvents;
    commands?: TCommands;
    rpc?: TRpc;
}

/**
 * Maps an EventsDefinition record to its corresponding EventContract types.
 * Used to produce the typed `events` property on a DomainDefinition.
 */
export type EventContracts<TDomain extends string, TEvents extends EventsDefinition> = {
    [K in keyof TEvents]: EventContract<TDomain, K & string, TEvents[K]>;
};

/**
 * Maps a CommandsDefinition record to its corresponding CommandContract types.
 */
export type CommandContracts<TDomain extends string, TCommands extends CommandsDefinition> = {
    [K in keyof TCommands]: CommandContract<TDomain, K & string, TCommands[K]>;
};

/**
 * Maps an RpcDefinition record to its corresponding RpcContract types.
 */
export type RpcContracts<TDomain extends string, TRpc extends RpcDefinition> = {
    [K in keyof TRpc]: RpcContract<TDomain, K & string, TRpc[K]["request"], TRpc[K]["response"]>;
};

/**
 * The return type of defineDomain. Groups all contracts for a domain under
 * their operation-type namespaces.
 */
export interface DomainDefinition<
    TDomain extends string = string,
    TEvents extends EventsDefinition = EventsDefinition,
    TCommands extends CommandsDefinition = CommandsDefinition,
    TRpc extends RpcDefinition = RpcDefinition,
> {
    domain: TDomain;
    events: EventContracts<TDomain, TEvents>;
    commands: CommandContracts<TDomain, TCommands>;
    rpc: RpcContracts<TDomain, TRpc>;
}

/**
 * Queue override options for subscriber/handler/responder declarations.
 * All fields are optional — omit to accept the defaults (quorum, 5 redeliveries).
 */
export interface HandlerOptions {
    /** Queue type — defaults to "quorum" */
    queueType?: "quorum" | "classic";
    /** Redelivery limit — defaults to 5 */
    redeliveries?: {
        limit: number;
    };
    /** Dead-letter exchange configuration */
    deadLetter?: {
        exchange: string;
        routingKey?: string;
    };
}

/**
 * Alias kept for symmetry — subscriber options and handler options are the same shape.
 */
export type SubscriptionOptions = HandlerOptions;

/**
 * Builder interface returned inside the buildServiceTopology callback.
 * Each method declares this service's role against a domain contract.
 * Declarations are accumulated and materialized into rascal topology after the
 * callback returns.
 */
export interface TopologyBuilder {
    /**
     * Declare that this service publishes the given event.
     * Adds: domain exchange + publication.
     */
    publishesEvent(contract: EventContract<any, any, any>): TopologyBuilder;

    /**
     * Declare that this service subscribes to the given event.
     * Adds: domain exchange + queue + binding + subscription.
     */
    subscribesToEvent(
        contract: EventContract<any, any, any>,
        options?: SubscriptionOptions
    ): TopologyBuilder;

    /**
     * Declare that this service sends the given command.
     * Adds: domain exchange + publication.
     */
    sendsCommand(contract: CommandContract<any, any, any>): TopologyBuilder;

    /**
     * Declare that this service handles the given command.
     * Adds: domain exchange + queue + binding + subscription.
     */
    handlesCommand(
        contract: CommandContract<any, any, any>,
        options?: HandlerOptions
    ): TopologyBuilder;

    /**
     * Declare that this service calls the given RPC operation.
     * Adds: RPC exchange + publication. Does NOT add a reply queue —
     * that is the responsibility of withRpcSupport middleware.
     */
    callsRpc(contract: RpcContract<any, any, any, any>): TopologyBuilder;

    /**
     * Declare that this service responds to the given RPC operation.
     * Adds: RPC exchange + request queue + binding + subscription.
     */
    respondsToRpc(
        contract: RpcContract<any, any, any, any>,
        options?: HandlerOptions
    ): TopologyBuilder;
}
