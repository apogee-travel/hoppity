/**
 * @module @apogeelabs/hoppity-contracts
 *
 * Domain-centric messaging contracts for hoppity topology generation.
 * Define events, commands, and RPC operations with Zod schemas, then derive
 * deterministic RabbitMQ topology — exchanges, queues, bindings, publications,
 * and subscriptions — from those contracts.
 *
 * @example
 * ```typescript
 * import { defineDomain, buildServiceTopology } from "@apogeelabs/hoppity-contracts";
 * import { z } from "zod";
 *
 * const Inventory = defineDomain("inventory", {
 *     events: { created: z.object({ id: z.string() }) },
 * });
 *
 * const topology = buildServiceTopology(baseConfig, "warehouse", (t) => {
 *     t.publishesEvent(Inventory.events.created);
 * });
 * ```
 */
export { defineDomain } from "./defineDomain";
export { buildServiceTopology } from "./buildServiceTopology";
export { withOutboundExchange } from "./withOutboundExchange";

export type {
    EventContract,
    CommandContract,
    RpcContract,
    DomainDefinition,
    DomainDefinitionInput,
    EventsDefinition,
    CommandsDefinition,
    RpcDefinition,
    EventContracts,
    CommandContracts,
    RpcContracts,
    HandlerOptions,
    SubscriptionOptions,
    TopologyBuilder,
} from "./types";
