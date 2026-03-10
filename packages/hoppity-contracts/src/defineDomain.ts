import { ZodTypeAny } from "zod";
import {
    CommandContract,
    CommandsDefinition,
    DomainDefinition,
    DomainDefinitionInput,
    EventContract,
    EventsDefinition,
    RpcContract,
    RpcDefinition,
} from "./types";
import { getExchangeName, getPublicationName, getRoutingKey, getSubscriptionName } from "./naming";

/**
 * Defines a domain and returns typed contract objects for all its operations.
 *
 * The returned contracts are pure data — they carry metadata and derived topology
 * properties (exchange, routingKey) but have no knowledge of RabbitMQ or rascal.
 * Topology generation happens later in buildServiceTopology.
 *
 * @param domainName - The domain identifier. Used as a namespace for all generated
 *   topology artifact names. Must be non-empty. Use snake_case (e.g. "donated_inventory").
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
): { [K in keyof TEvents]: EventContract<TDomain, K & string, TEvents[K]> } {
    const result: Record<string, EventContract> = {};
    const exchange = getExchangeName(domain, "event");

    for (const name of Object.keys(events)) {
        const schema: ZodTypeAny = events[name];
        result[name] = {
            _type: "event",
            _domain: domain,
            _name: name,
            schema,
            exchange,
            routingKey: getRoutingKey(domain, "event", name),
            publicationName: getPublicationName(domain, "event", name),
            subscriptionName: getSubscriptionName(domain, "event", name),
        };
    }

    return result as { [K in keyof TEvents]: EventContract<TDomain, K & string, TEvents[K]> };
}

function buildCommandContracts<TDomain extends string, TCommands extends CommandsDefinition>(
    domain: TDomain,
    commands: TCommands
): { [K in keyof TCommands]: CommandContract<TDomain, K & string, TCommands[K]> } {
    const result: Record<string, CommandContract> = {};
    const exchange = getExchangeName(domain, "command");

    for (const name of Object.keys(commands)) {
        const schema: ZodTypeAny = commands[name];
        result[name] = {
            _type: "command",
            _domain: domain,
            _name: name,
            schema,
            exchange,
            routingKey: getRoutingKey(domain, "command", name),
            publicationName: getPublicationName(domain, "command", name),
            subscriptionName: getSubscriptionName(domain, "command", name),
        };
    }

    return result as {
        [K in keyof TCommands]: CommandContract<TDomain, K & string, TCommands[K]>;
    };
}

function buildRpcContracts<TDomain extends string, TRpc extends RpcDefinition>(
    domain: TDomain,
    rpc: TRpc
): {
    [K in keyof TRpc]: RpcContract<TDomain, K & string, TRpc[K]["request"], TRpc[K]["response"]>;
} {
    const result: Record<string, RpcContract> = {};
    const exchange = getExchangeName(domain, "rpc");

    for (const name of Object.keys(rpc)) {
        const { request: requestSchema, response: responseSchema } = rpc[name];
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
            TRpc[K]["request"],
            TRpc[K]["response"]
        >;
    };
}
