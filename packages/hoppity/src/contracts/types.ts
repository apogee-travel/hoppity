/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZodTypeAny } from "zod";

/**
 * Declares delayed delivery support on a contract.
 *
 * `true` — delay is supported but has no default; the caller must always supply
 * an explicit delay value when publishing.
 *
 * `{ default: number }` — delay is supported and has a default; the caller may
 * omit the delay value to use the default, or supply a value to override it.
 * The default must be greater than 0.
 */
export type DelayConfig = true | { default: number };

/**
 * A contract describing a domain event — something that happened.
 *
 * TDomain: the domain name literal (e.g. "orders")
 * TName: the operation name literal (e.g. "orderCreated")
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
    /**
     * Delayed delivery configuration. Present only when the contract was declared
     * with `delay: true` or `delay: { default: N }` in defineDomain.
     */
    delay?: DelayConfig;
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
    /**
     * Delayed delivery configuration. Present only when the contract was declared
     * with `delay: true` or `delay: { default: N }` in defineDomain.
     */
    delay?: DelayConfig;
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
 * Accepts either a bare Zod schema or an extended object { schema, ...options }.
 * The extended form supports `delay` for opting into delayed delivery.
 */
export type EventOperationInput =
    | ZodTypeAny
    | { schema: ZodTypeAny; delay?: DelayConfig; [key: string]: any };

/**
 * The shape of each entry in the commands definition map passed to defineDomain.
 * The extended form supports `delay` for opting into delayed delivery.
 */
export type CommandOperationInput =
    | ZodTypeAny
    | { schema: ZodTypeAny; delay?: DelayConfig; [key: string]: any };

/**
 * The shape of each entry in the rpc definition map passed to defineDomain.
 */
export type RpcOperationInput =
    | { request: ZodTypeAny; response: ZodTypeAny }
    | { schema: { request: ZodTypeAny; response: ZodTypeAny }; [key: string]: any };

/**
 * Maps an EventsDefinition record to the ZodTypeAny used by each entry.
 */
export type EventsDefinition = Record<string, EventOperationInput>;

/**
 * Maps a CommandsDefinition record to the ZodTypeAny used by each entry.
 */
export type CommandsDefinition = Record<string, CommandOperationInput>;

/**
 * Maps an RpcDefinition record.
 */
export type RpcDefinition = Record<string, RpcOperationInput>;

/**
 * Extracts the Zod schema type from an EventOperationInput.
 */
export type ExtractEventSchema<T extends EventOperationInput> = T extends ZodTypeAny
    ? T
    : T extends { schema: infer S extends ZodTypeAny }
      ? S
      : never;

/**
 * Extracts the Zod schema type from a CommandOperationInput.
 */
export type ExtractCommandSchema<T extends CommandOperationInput> = T extends ZodTypeAny
    ? T
    : T extends { schema: infer S extends ZodTypeAny }
      ? S
      : never;

/**
 * Extracts the request schema from an RpcOperationInput.
 */
export type ExtractRpcRequest<T extends RpcOperationInput> = T extends { request: infer R }
    ? R extends ZodTypeAny
        ? R
        : never
    : T extends { schema: { request: infer R } }
      ? R extends ZodTypeAny
          ? R
          : never
      : never;

/**
 * Extracts the response schema from an RpcOperationInput.
 */
export type ExtractRpcResponse<T extends RpcOperationInput> = T extends { response: infer R }
    ? R extends ZodTypeAny
        ? R
        : never
    : T extends { schema: { response: infer R } }
      ? R extends ZodTypeAny
          ? R
          : never
      : never;

/**
 * The input shape passed to defineDomain.
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
 */
export type EventContracts<TDomain extends string, TEvents extends EventsDefinition> = {
    [K in keyof TEvents]: EventContract<TDomain, K & string, ExtractEventSchema<TEvents[K]>>;
};

/**
 * Maps a CommandsDefinition record to its corresponding CommandContract types.
 */
export type CommandContracts<TDomain extends string, TCommands extends CommandsDefinition> = {
    [K in keyof TCommands]: CommandContract<
        TDomain,
        K & string,
        ExtractCommandSchema<TCommands[K]>
    >;
};

/**
 * Maps an RpcDefinition record to its corresponding RpcContract types.
 */
export type RpcContracts<TDomain extends string, TRpc extends RpcDefinition> = {
    [K in keyof TRpc]: RpcContract<
        TDomain,
        K & string,
        ExtractRpcRequest<TRpc[K]>,
        ExtractRpcResponse<TRpc[K]>
    >;
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
 * Queue override options for handler declarations.
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
