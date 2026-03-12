/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZodTypeAny } from "zod";
import {
    CommandContract,
    CommandsDefinition,
    DelayConfig,
    DomainDefinition,
    DomainDefinitionInput,
    EventContract,
    EventsDefinition,
    RpcContract,
    RpcDefinition,
    ExtractEventSchema,
    ExtractCommandSchema,
    ExtractRpcRequest,
    ExtractRpcResponse,
} from "./types";
import { getExchangeName, getPublicationName, getRoutingKey, getSubscriptionName } from "./naming";

/**
 * Returns true if the value is a plain Zod schema (has _def) rather than an
 * extended operation object { schema, ...options }. Used to distinguish the
 * two forms accepted by defineDomain.
 */
function isZodSchema(value: unknown): value is ZodTypeAny {
    return (
        typeof value === "object" &&
        value !== null &&
        "_def" in value &&
        typeof (value as any)._def === "object"
    );
}

/**
 * Defines a domain and returns typed contract objects for all its operations.
 *
 * The returned contracts are pure data — they carry metadata and derived topology
 * properties (exchange, routingKey) but have no knowledge of RabbitMQ or rascal.
 * Topology generation happens later in ServiceBuilder.
 *
 * Accepts both bare Zod schemas and extended { schema, ...options } objects for
 * each operation, enabling future per-operation options (e.g. partitionBy) without
 * a breaking API change.
 *
 * @param domainName - The domain identifier. Used as a namespace for all generated
 *   topology artifact names. Must be non-empty.
 * @param definition - The event, command, and RPC operation schemas for this domain.
 * @returns A DomainDefinition with typed contract objects for each operation.
 */
export function defineDomain<
    TDomain extends string,
    TEvents extends EventsDefinition,
    TCommands extends CommandsDefinition,
    TRpc extends RpcDefinition,
>(
    domainName: TDomain,
    definition: DomainDefinitionInput<TEvents, TCommands, TRpc>
): DomainDefinition<TDomain, TEvents, TCommands, TRpc> {
    if (!domainName?.trim()) {
        throw new Error("defineDomain: domainName is required and must be a non-empty string");
    }

    const events = buildEventContracts(domainName, definition.events ?? ({} as TEvents));
    const commands = buildCommandContracts(domainName, definition.commands ?? ({} as TCommands));
    const rpc = buildRpcContracts(domainName, definition.rpc ?? ({} as TRpc));

    return {
        domain: domainName,
        events,
        commands,
        rpc,
    } as DomainDefinition<TDomain, TEvents, TCommands, TRpc>;
}

function buildEventContracts<TDomain extends string, TEvents extends EventsDefinition>(
    domain: TDomain,
    events: TEvents
): { [K in keyof TEvents]: EventContract<TDomain, K & string, ExtractEventSchema<TEvents[K]>> } {
    const result: Record<string, EventContract> = {};
    const exchange = getExchangeName(domain, "event");

    for (const name of Object.keys(events)) {
        const input = events[name];
        // Accept both bare Zod schemas and { schema, ...options } extended form.
        const schema: ZodTypeAny = isZodSchema(input) ? input : (input as any).schema;
        const delay: DelayConfig | undefined = isZodSchema(input)
            ? undefined
            : (input as any).delay;

        validateDelayConfig(delay, `${domain}.events.${name}`);

        const contract: EventContract = {
            _type: "event",
            _domain: domain,
            _name: name,
            schema,
            exchange,
            routingKey: getRoutingKey(domain, "event", name),
            publicationName: getPublicationName(domain, "event", name),
            subscriptionName: getSubscriptionName(domain, "event", name),
        };

        if (delay !== undefined) {
            contract.delay = delay;
        }

        result[name] = contract;
    }

    return result as {
        [K in keyof TEvents]: EventContract<TDomain, K & string, ExtractEventSchema<TEvents[K]>>;
    };
}

function buildCommandContracts<TDomain extends string, TCommands extends CommandsDefinition>(
    domain: TDomain,
    commands: TCommands
): {
    [K in keyof TCommands]: CommandContract<
        TDomain,
        K & string,
        ExtractCommandSchema<TCommands[K]>
    >;
} {
    const result: Record<string, CommandContract> = {};
    const exchange = getExchangeName(domain, "command");

    for (const name of Object.keys(commands)) {
        const input = commands[name];
        const schema: ZodTypeAny = isZodSchema(input) ? input : (input as any).schema;
        const delay: DelayConfig | undefined = isZodSchema(input)
            ? undefined
            : (input as any).delay;

        validateDelayConfig(delay, `${domain}.commands.${name}`);

        const contract: CommandContract = {
            _type: "command",
            _domain: domain,
            _name: name,
            schema,
            exchange,
            routingKey: getRoutingKey(domain, "command", name),
            publicationName: getPublicationName(domain, "command", name),
            subscriptionName: getSubscriptionName(domain, "command", name),
        };

        if (delay !== undefined) {
            contract.delay = delay;
        }

        result[name] = contract;
    }

    return result as {
        [K in keyof TCommands]: CommandContract<
            TDomain,
            K & string,
            ExtractCommandSchema<TCommands[K]>
        >;
    };
}

/**
 * Validates the delay config value from an extended operation input.
 * Throws if `{ default: N }` is used with N <= 0, since a non-positive default
 * delay is nonsensical and almost certainly a bug.
 */
function validateDelayConfig(delay: DelayConfig | undefined, location: string): void {
    if (delay !== undefined && delay !== true) {
        // NaN and Infinity both pass a plain `<= 0` check but are nonsensical TTL values,
        // so we reject them explicitly with Number.isFinite.
        if (!Number.isFinite(delay.default) || delay.default <= 0) {
            throw new Error(
                `defineDomain: delay.default must be greater than 0 (at ${location}, got ${delay.default})`
            );
        }
    }
}

function buildRpcContracts<TDomain extends string, TRpc extends RpcDefinition>(
    domain: TDomain,
    rpc: TRpc
): {
    [K in keyof TRpc]: RpcContract<
        TDomain,
        K & string,
        ExtractRpcRequest<TRpc[K]>,
        ExtractRpcResponse<TRpc[K]>
    >;
} {
    const result: Record<string, RpcContract> = {};
    const exchange = getExchangeName(domain, "rpc");

    for (const name of Object.keys(rpc)) {
        const input = rpc[name];
        // Extended form: { schema: { request, response }, ...options }
        // Simple form: { request, response }
        const { request: requestSchema, response: responseSchema } = isZodSchema(input)
            ? (undefined as never) // RPC can't be a bare schema — handled by type system
            : "schema" in input && !isZodSchema(input)
              ? (input as any).schema
              : input;

        result[name] = {
            _type: "rpc",
            _domain: domain,
            _name: name,
            requestSchema,
            responseSchema,
            exchange,
            routingKey: getRoutingKey(domain, "rpc", name),
            publicationName: getPublicationName(domain, "rpc", name),
            subscriptionName: getSubscriptionName(domain, "rpc", name),
        };
    }

    return result as {
        [K in keyof TRpc]: RpcContract<
            TDomain,
            K & string,
            ExtractRpcRequest<TRpc[K]>,
            ExtractRpcResponse<TRpc[K]>
        >;
    };
}
