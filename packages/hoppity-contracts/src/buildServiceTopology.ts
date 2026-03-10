/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerConfig } from "rascal";
import {
    CommandContract,
    EventContract,
    HandlerOptions,
    RpcContract,
    SubscriptionOptions,
    TopologyBuilder,
} from "./types";
import { getBindingName, getPublicationName, getQueueName, getSubscriptionName } from "./naming";

/**
 * A role declaration accumulated by the TopologyBuilder before materialization.
 * Using a discriminated union on `role` lets TypeScript narrow the type in the
 * switch statement, keeping applyDeclaration type-safe without casts.
 */
type Declaration =
    | { role: "publishesEvent"; contract: EventContract }
    | { role: "subscribesToEvent"; contract: EventContract; options?: SubscriptionOptions }
    | { role: "sendsCommand"; contract: CommandContract }
    | { role: "handlesCommand"; contract: CommandContract; options?: HandlerOptions }
    | { role: "callsRpc"; contract: RpcContract }
    | { role: "respondsToRpc"; contract: RpcContract; options?: HandlerOptions };

/**
 * Internal implementation of TopologyBuilder. Accumulates role declarations
 * before the caller's configure callback returns, at which point materialize()
 * is called to convert them into rascal topology artifacts.
 */
class TopologyBuilderImpl implements TopologyBuilder {
    private declarations: Declaration[] = [];

    publishesEvent(contract: EventContract): this {
        this.declarations.push({ role: "publishesEvent", contract });
        return this;
    }

    subscribesToEvent(contract: EventContract, options?: SubscriptionOptions): this {
        this.declarations.push({ role: "subscribesToEvent", contract, options });
        return this;
    }

    sendsCommand(contract: CommandContract): this {
        this.declarations.push({ role: "sendsCommand", contract });
        return this;
    }

    handlesCommand(contract: CommandContract, options?: HandlerOptions): this {
        this.declarations.push({ role: "handlesCommand", contract, options });
        return this;
    }

    callsRpc(contract: RpcContract): this {
        this.declarations.push({ role: "callsRpc", contract });
        return this;
    }

    respondsToRpc(contract: RpcContract, options?: HandlerOptions): this {
        this.declarations.push({ role: "respondsToRpc", contract, options });
        return this;
    }

    /**
     * Materializes accumulated declarations into rascal topology on each vhost.
     * Called after the configure callback returns.
     */
    materialize(topology: BrokerConfig, serviceName: string): void {
        if (!topology.vhosts) {
            return;
        }

        Object.keys(topology.vhosts).forEach(vhostKey => {
            const vhost = topology.vhosts![vhostKey];
            this.ensureTopologyCollections(vhost);

            for (const decl of this.declarations) {
                this.applyDeclaration(vhost, serviceName, decl);
            }
        });
    }

    private ensureTopologyCollections(vhost: any): void {
        if (!vhost.exchanges) vhost.exchanges = {};
        if (!vhost.queues) vhost.queues = {};
        if (!vhost.bindings) vhost.bindings = {};
        if (!vhost.publications) vhost.publications = {};
        if (!vhost.subscriptions) vhost.subscriptions = {};
    }

    private applyDeclaration(vhost: any, serviceName: string, decl: Declaration): void {
        switch (decl.role) {
            case "publishesEvent":
                this.addPublisher(vhost, decl.contract);
                break;
            case "subscribesToEvent":
                this.addSubscriber(vhost, serviceName, decl.contract, decl.options);
                break;
            case "sendsCommand":
                this.addPublisher(vhost, decl.contract);
                break;
            case "handlesCommand":
                this.addSubscriber(vhost, serviceName, decl.contract, decl.options);
                break;
            case "callsRpc":
                this.addRpcCaller(vhost, decl.contract);
                break;
            case "respondsToRpc":
                this.addRpcResponder(vhost, serviceName, decl.contract, decl.options);
                break;
        }
    }

    /**
     * Adds a domain exchange + publication for publisher/sender roles.
     * The exchange is a durable topic exchange — multiple publishers can target it
     * and multiple consumers can bind to it with different routing key patterns.
     */
    private addPublisher(vhost: any, contract: EventContract | CommandContract): void {
        const { exchange, routingKey, _domain: domain, _type: opType, _name: opName } = contract;

        (vhost.exchanges as any)[exchange] = buildTopicExchange();

        const publicationName = getPublicationName(domain, opType, opName);
        (vhost.publications as any)[publicationName] = {
            exchange,
            routingKey,
        };
    }

    /**
     * Adds a domain exchange + queue + binding + subscription for subscriber/handler roles.
     */
    private addSubscriber(
        vhost: any,
        serviceName: string,
        contract: EventContract | CommandContract,
        options?: HandlerOptions
    ): void {
        const { exchange, routingKey, _domain: domain, _type: opType, _name: opName } = contract;

        (vhost.exchanges as any)[exchange] = buildTopicExchange();

        const queueName = getQueueName(serviceName, domain, opType, opName);
        (vhost.queues as any)[queueName] = buildQueue(options);

        const bindingName = getBindingName(queueName);
        (vhost.bindings as any)[bindingName] = {
            source: exchange,
            destination: queueName,
            destinationType: "queue",
            bindingKey: routingKey,
        };

        const subscriptionName = getSubscriptionName(domain, opType, opName);
        (vhost.subscriptions as any)[subscriptionName] = buildSubscription(queueName, options);
    }

    /**
     * Adds an RPC exchange + publication for the calling side.
     * Intentionally does NOT add a reply queue — that is handled by withRpcSupport
     * middleware which manages the reply queue lifecycle independently.
     */
    private addRpcCaller(vhost: any, contract: RpcContract): void {
        const { exchange, routingKey, _domain: domain, _type: opType, _name: opName } = contract;

        (vhost.exchanges as any)[exchange] = buildTopicExchange();

        const publicationName = getPublicationName(domain, opType, opName);
        (vhost.publications as any)[publicationName] = {
            exchange,
            routingKey,
        };
    }

    /**
     * Adds an RPC exchange + request queue + binding + subscription for the responding side.
     */
    private addRpcResponder(
        vhost: any,
        serviceName: string,
        contract: RpcContract,
        options?: HandlerOptions
    ): void {
        const { exchange, routingKey, _domain: domain, _type: opType, _name: opName } = contract;

        (vhost.exchanges as any)[exchange] = buildTopicExchange();

        const queueName = getQueueName(serviceName, domain, opType, opName);
        (vhost.queues as any)[queueName] = buildQueue(options);

        const bindingName = getBindingName(queueName);
        (vhost.bindings as any)[bindingName] = {
            source: exchange,
            destination: queueName,
            destinationType: "queue",
            bindingKey: routingKey,
        };

        const subscriptionName = getSubscriptionName(domain, opType, opName);
        (vhost.subscriptions as any)[subscriptionName] = buildSubscription(queueName, options);
    }
}

/**
 * Generates topology for a service's messaging roles against domain contracts.
 *
 * Takes an initial BrokerConfig (which carries vhost and connection config),
 * a service name, and a configure callback. The callback receives a TopologyBuilder
 * where the service declares its role against each contract. After the callback
 * returns, all declared artifacts are merged into the cloned topology.
 *
 * The initial topology is never mutated — a structuredClone is made upfront.
 *
 * @example
 * ```typescript
 * const topology = buildServiceTopology(baseConfig, "warehouse", (t) => {
 *   t.publishesEvent(DonatedInventory.events.created);
 *   t.handlesCommand(DonatedInventory.commands.reserveItem);
 * });
 * ```
 */
export function buildServiceTopology(
    initialTopology: BrokerConfig,
    serviceName: string,
    configure: (builder: TopologyBuilder) => void
): BrokerConfig {
    if (!serviceName?.trim()) {
        throw new Error(
            "buildServiceTopology: serviceName is required and must be a non-empty string"
        );
    }

    // Clone upfront so the caller's config is never mutated, matching hoppity core's
    // defensive-clone convention. The caller gets a fresh topology with declarations baked in.
    const topology = structuredClone(initialTopology);
    const builder = new TopologyBuilderImpl();

    // Two-phase: accumulate declarations during configure(), then materialize all at once.
    // This lets the builder validate/deduplicate before touching topology.
    configure(builder);
    builder.materialize(topology, serviceName);

    return topology;
}

// ---------------------------------------------------------------------------
// Topology artifact builders
// These are small pure helpers extracted to keep applyDeclaration readable.
// ---------------------------------------------------------------------------

function buildTopicExchange(): object {
    return {
        type: "topic",
        options: { durable: true },
    };
}

function buildQueue(options?: HandlerOptions): object {
    const queueType = options?.queueType ?? "quorum";
    const queueArgs: Record<string, any> = { "x-queue-type": queueType };

    if (options?.deadLetter) {
        queueArgs["x-dead-letter-exchange"] = options.deadLetter.exchange;
        if (options.deadLetter.routingKey) {
            queueArgs["x-dead-letter-routing-key"] = options.deadLetter.routingKey;
        }
    }

    return {
        options: {
            durable: true,
            arguments: queueArgs,
        },
    };
}

function buildSubscription(queueName: string, options?: HandlerOptions): object {
    return {
        queue: queueName,
        redeliveries: options?.redeliveries ?? { limit: 5 },
    };
}
