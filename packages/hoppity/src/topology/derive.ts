/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerConfig } from "rascal";
import { CommandContract, EventContract, HandlerOptions, RpcContract } from "../contracts/types";
import {
    getBindingName,
    getDelayedErrorQueueName,
    getDelayedReadyQueueName,
    getDelayedReadySubscriptionName,
    getDelayedWaitPublicationName,
    getDelayedWaitQueueName,
    getPublicationName,
    getQueueName,
    getSubscriptionName,
} from "../contracts/naming";
import { HandlerDeclaration } from "../handlers/types";

/**
 * Connection configuration for deriving topology.
 */
export interface ConnectionConfig {
    url: string;
    vhost?: string;
    options?: Record<string, any>;
    retry?: {
        factor?: number;
        min?: number;
        max?: number;
    };
}

/**
 * Derives a complete Rascal BrokerConfig from handler declarations and publish contracts.
 *
 * This is the core innovation of v1: topology is no longer manually declared.
 * Given the service name, connection config, handlers (what this service responds to),
 * and publishes (what this service sends outbound), we generate all exchanges, queues,
 * bindings, publications, and subscriptions automatically.
 *
 * If any RPC handler declarations are present, RPC reply infrastructure is also
 * added (reply queue + subscription + rpc_reply publication).
 *
 * @param serviceName - The service identifier, used for queue naming
 * @param handlers - Handler declarations (onEvent, onCommand, onRpc)
 * @param publishes - Outbound contracts (events, commands, RPC calls to send)
 * @param connection - Connection configuration
 * @param instanceId - Unique instance ID, used for the RPC reply queue name
 */
export function deriveTopology(
    serviceName: string,
    handlers: HandlerDeclaration[],
    publishes: (EventContract | CommandContract | RpcContract)[],
    connection: ConnectionConfig,
    instanceId: string
): BrokerConfig {
    const vhost = connection.vhost ?? "/";

    const vhostConfig: any = {
        connection: buildConnectionConfig(connection),
        exchanges: {},
        queues: {},
        bindings: {},
        publications: {},
        subscriptions: {},
    };

    // Subscription-side: wire up each handler
    for (const declaration of handlers) {
        switch (declaration._kind) {
            case "event":
            case "command":
                addEventOrCommandSubscriber(
                    vhostConfig,
                    serviceName,
                    declaration.contract,
                    declaration.options
                );
                // Delay infrastructure is per-handler — each consuming service
                // gets its own wait/ready/error queue triple so delays are isolated.
                if (declaration.contract.delay !== undefined) {
                    addDelayedDeliveryInfrastructure(vhostConfig, declaration.contract);
                }
                break;
            case "rpc":
                addRpcResponder(
                    vhostConfig,
                    serviceName,
                    declaration.contract,
                    declaration.options
                );
                break;
        }
    }

    // Publication-side: wire up each publish declaration
    for (const contract of publishes) {
        switch (contract._type) {
            case "event":
            case "command":
                addPublisher(vhostConfig, contract);
                // Publisher side also needs the wait publication so that publishEvent/sendCommand
                // can route delayed messages to the wait queue.
                if (contract.delay !== undefined) {
                    addDelayedWaitPublication(vhostConfig, contract);
                }
                break;
            case "rpc":
                addRpcCaller(vhostConfig, contract);
                break;
        }
    }

    // Reply queue infrastructure — needed by both RPC responders (handlers) and RPC callers
    // (publish declarations). A caller-only service has no RPC handlers but still needs the
    // reply queue so broker.request() has somewhere to receive responses.
    const hasRpcHandlers = handlers.some(h => h._kind === "rpc");
    const hasRpcCallers = publishes.some(p => p._type === "rpc");
    if (hasRpcHandlers || hasRpcCallers) {
        const replyQueueName = `${serviceName}_${instanceId}_reply`;
        addRpcReplyInfrastructure(vhostConfig, replyQueueName);
    }

    return {
        vhosts: {
            [vhost]: vhostConfig,
        },
    };
}

// ---------------------------------------------------------------------------
// Private topology builders
// ---------------------------------------------------------------------------

function buildConnectionConfig(connection: ConnectionConfig): object {
    const cfg: any = {
        url: connection.url,
    };

    if (connection.options) {
        cfg.options = connection.options;
    }

    if (connection.retry) {
        cfg.retry = connection.retry;
    }

    return cfg;
}

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

/**
 * Adds a domain exchange + publication for publisher roles (publishEvent, sendCommand).
 */
function addPublisher(vhost: any, contract: EventContract | CommandContract): void {
    const { exchange, routingKey, _domain: domain, _type: opType, _name: opName } = contract;

    vhost.exchanges[exchange] = buildTopicExchange();

    const publicationName = getPublicationName(domain, opType, opName);
    vhost.publications[publicationName] = {
        exchange,
        routingKey,
    };
}

/**
 * Adds a domain exchange + queue + binding + subscription for event/command handlers.
 */
function addEventOrCommandSubscriber(
    vhost: any,
    serviceName: string,
    contract: EventContract | CommandContract,
    options?: HandlerOptions
): void {
    const { exchange, routingKey, _domain: domain, _type: opType, _name: opName } = contract;

    vhost.exchanges[exchange] = buildTopicExchange();

    const queueName = getQueueName(serviceName, domain, opType, opName);
    vhost.queues[queueName] = buildQueue(options);

    const bindingName = getBindingName(queueName);
    vhost.bindings[bindingName] = {
        source: exchange,
        destination: queueName,
        destinationType: "queue",
        bindingKey: routingKey,
    };

    const subscriptionName = getSubscriptionName(domain, opType, opName);
    vhost.subscriptions[subscriptionName] = buildSubscription(queueName, options);
}

/**
 * Adds an RPC exchange + publication for the calling side (broker.request()).
 * Does NOT add reply infrastructure here — that's done separately if any RPC handlers exist.
 *
 * Implementation mirrors addPublisher intentionally — RPC caller and event/command publisher
 * both need an exchange + publication, but accept different contract types. NOSONAR S4144
 */
function addRpcCaller(vhost: any, contract: RpcContract): void {
    const { exchange, routingKey, _domain: domain, _type: opType, _name: opName } = contract;

    vhost.exchanges[exchange] = buildTopicExchange();

    const publicationName = getPublicationName(domain, opType, opName);
    vhost.publications[publicationName] = {
        exchange,
        routingKey,
    };
}

/**
 * Adds an RPC exchange + request queue + binding + subscription for the responding side.
 *
 * Implementation mirrors addEventOrCommandSubscriber intentionally — both add the same
 * topology shape but accept different contract types. NOSONAR S4144
 */
function addRpcResponder(
    vhost: any,
    serviceName: string,
    contract: RpcContract,
    options?: HandlerOptions
): void {
    const { exchange, routingKey, _domain: domain, _type: opType, _name: opName } = contract;

    vhost.exchanges[exchange] = buildTopicExchange();

    const queueName = getQueueName(serviceName, domain, opType, opName);
    vhost.queues[queueName] = buildQueue(options);

    const bindingName = getBindingName(queueName);
    vhost.bindings[bindingName] = {
        source: exchange,
        destination: queueName,
        destinationType: "queue",
        bindingKey: routingKey,
    };

    const subscriptionName = getSubscriptionName(domain, opType, opName);
    vhost.subscriptions[subscriptionName] = buildSubscription(queueName, options);
}

/**
 * Builds a quorum queue config without dead-letter routing — used for ready and error
 * queues in the delayed delivery infrastructure.
 */
function buildQuorumQueue(): object {
    return {
        options: {
            durable: true,
            arguments: { "x-queue-type": "quorum" },
        },
    };
}

/**
 * Adds the full delayed delivery queue/publication/subscription triple for a contract.
 *
 * Called on the handler side (consuming service) because the queues are per-service —
 * different services handling the same event get their own isolated delay infrastructure.
 */
function addDelayedDeliveryInfrastructure(
    vhost: any,
    contract: EventContract | CommandContract
): void {
    const { _domain: domain, _type: opType, _name: opName } = contract;

    const waitQueueName = getDelayedWaitQueueName(domain, opType, opName);
    const readyQueueName = getDelayedReadyQueueName(domain, opType, opName);
    const errorQueueName = getDelayedErrorQueueName(domain, opType, opName);

    // Wait queue: quorum, with dead-letter routing to the ready queue.
    // Per-message TTL (set at publish time via `expiration`) expires the message
    // here; RabbitMQ routes it to the ready queue for re-publish.
    vhost.queues[waitQueueName] = {
        options: {
            durable: true,
            arguments: {
                "x-queue-type": "quorum",
                "x-dead-letter-exchange": "",
                "x-dead-letter-routing-key": readyQueueName,
            },
        },
    };

    vhost.queues[readyQueueName] = buildQuorumQueue();
    vhost.queues[errorQueueName] = buildQuorumQueue();

    const waitPublicationName = getDelayedWaitPublicationName(domain, opType, opName);
    vhost.publications[waitPublicationName] = {
        exchange: "",
        routingKey: waitQueueName,
    };

    // Error queue publication uses the default exchange with the queue name as routing key —
    // same pattern as the wait publication. Without this, broker.publish(errorQueueName, ...)
    // in the ready message handler throws "Unknown publication" when max retries are exhausted.
    vhost.publications[errorQueueName] = {
        exchange: "",
        routingKey: errorQueueName,
    };

    const readySubscriptionName = getDelayedReadySubscriptionName(domain, opType, opName);
    vhost.subscriptions[readySubscriptionName] = {
        queue: readyQueueName,
        options: { prefetch: 1 },
    };
}

/**
 * Adds only the wait publication for publisher-only services.
 *
 * When a service only publishes (no handler) for a delay-capable contract,
 * it still needs the wait publication to route delayed messages.
 * The full queue/subscription infrastructure lives on the consuming service.
 *
 * Queue names are operation-scoped (no service prefix) so that the publisher's
 * routing key matches the queue created by whichever service handles the contract.
 */
function addDelayedWaitPublication(vhost: any, contract: EventContract | CommandContract): void {
    const { _domain: domain, _type: opType, _name: opName } = contract;

    const waitQueueName = getDelayedWaitQueueName(domain, opType, opName);
    const waitPublicationName = getDelayedWaitPublicationName(domain, opType, opName);

    // Only add if not already present — a service that both handles and publishes
    // the same contract will have had this added by addDelayedDeliveryInfrastructure.
    if (!vhost.publications[waitPublicationName]) {
        vhost.publications[waitPublicationName] = {
            exchange: "",
            routingKey: waitQueueName,
        };
    }
}

/**
 * Adds the reply queue, subscription, and rpc_reply publication to the vhost.
 *
 * The reply queue is exclusive + auto-delete: it lives only for the lifetime of
 * this service instance. The rpc_reply publication uses RabbitMQ's default
 * exchange with a dynamic routing key so responses reach the caller's reply queue
 * without an explicit binding.
 */
function addRpcReplyInfrastructure(vhost: any, replyQueueName: string): void {
    vhost.queues[replyQueueName] = {
        options: {
            exclusive: true,
            autoDelete: true,
        },
    };

    vhost.subscriptions[`${replyQueueName}_subscription`] = {
        queue: replyQueueName,
        options: { prefetch: 1 },
    };

    // Default exchange ("") routes by queue name — replyTo field in the RpcRequest
    // contains the reply queue name, so {{replyTo}} resolves to the correct queue.
    vhost.publications["rpc_reply"] = {
        exchange: "",
        routingKey: "{{replyTo}}",
        options: { persistent: false },
    };
}
