/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Logger,
    MiddlewareContext,
    MiddlewareFunction,
    MiddlewareResult,
} from "@apogeelabs/hoppity";
import { BrokerConfig } from "rascal";
import { HandlerDeclaration, OperationsMiddlewareOptions } from "./types";
import { createCorrelationManager } from "./correlationManager";
import { wireEventCommandOutbound, wireHandlers } from "./wireHandlers";
import { wireRpcHandlers, wireRpcOutbound } from "./rpc";

/**
 * Middleware factory that wires contract-based operations into the broker.
 *
 * Topology phase: adds RPC reply infrastructure (reply queue + subscription +
 * rpc_reply publication) when any RpcHandlerDeclaration is present, then stores
 * config in context.data for diagnostics.
 *
 * onBrokerCreated phase: subscribes event/command/rpc handlers and extends the
 * broker with publishEvent, sendCommand, request, and cancelRequest methods.
 */
export function withOperations(options: OperationsMiddlewareOptions): MiddlewareFunction {
    if (!options.serviceName?.trim()) {
        throw new Error("withOperations: serviceName is required and must be a non-empty string");
    }
    if (!options.instanceId?.trim()) {
        throw new Error("withOperations: instanceId is required and must be a non-empty string");
    }

    const {
        serviceName,
        instanceId,
        handlers,
        defaultTimeout = 30_000,
        validateInbound = true,
        validateOutbound = false,
    } = options;

    const hasRpcHandlers = handlers.some(h => h._kind === "rpc");
    const replyQueueName = `${serviceName}_${instanceId}_reply`;

    return (topology: BrokerConfig, context: MiddlewareContext): MiddlewareResult => {
        const modifiedTopology = structuredClone(topology);

        if (!modifiedTopology.vhosts) {
            modifiedTopology.vhosts = {};
        }

        if (hasRpcHandlers) {
            addRpcReplyInfrastructure(modifiedTopology, replyQueueName, context.logger);
        }

        context.data.operationsConfig = {
            serviceName,
            instanceId,
            replyQueueName,
            hasRpcHandlers,
            handlerCount: handlers.length,
        };

        // Correlation manager lives here so it's shared between outbound request()
        // and the inbound reply subscription wired in onBrokerCreated.
        const correlationManager = createCorrelationManager();

        return {
            topology: modifiedTopology,
            onBrokerCreated: async broker => {
                await wireHandlers(broker, handlers, context, { validateInbound });
                wireEventCommandOutbound(broker, { validateOutbound });
                await wireRpcHandlers(broker, handlers, context, { validateInbound });
                await wireRpcOutbound(broker, {
                    serviceName,
                    instanceId,
                    replyQueueName,
                    handlers: handlers.filter(
                        (h): h is Extract<HandlerDeclaration, { _kind: "rpc" }> => h._kind === "rpc"
                    ),
                    correlationManager,
                    defaultTimeout,
                    validateInbound,
                    validateOutbound,
                    logger: context.logger,
                });
            },
        };
    };
}

/**
 * Adds the RPC reply queue, its subscription, and the rpc_reply publication
 * to every vhost in the topology.
 *
 * The reply queue is exclusive + auto-delete: it lives only for the lifetime of
 * this service instance. The rpc_reply publication uses RabbitMQ's default
 * exchange with a dynamic routing key so responses reach the caller's reply queue
 * without an explicit binding.
 */
function addRpcReplyInfrastructure(
    topology: BrokerConfig,
    replyQueueName: string,
    logger: Logger
): void {
    Object.keys(topology.vhosts!).forEach(vhostKey => {
        const vhost = topology.vhosts![vhostKey] as any;

        if (!vhost.queues) vhost.queues = {};
        if (!vhost.subscriptions) vhost.subscriptions = {};
        if (!vhost.publications) vhost.publications = {};

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

        // Guard against overwriting an rpc_reply publication already added by
        // withRpcSupport (gradual migration scenario). Both middlewares use the
        // same default exchange + routing key, so the first one wins.
        if (vhost.publications["rpc_reply"]) {
            logger.warn(
                "[Operations] rpc_reply publication already exists in topology — skipping to avoid overwrite"
            );
        } else {
            // Default exchange ("") routes by queue name — replyTo field in the RpcRequest
            // contains the reply queue name, so {{replyTo}} resolves to the correct queue.
            vhost.publications["rpc_reply"] = {
                exchange: "",
                routingKey: "{{replyTo}}",
                options: { persistent: false },
            };
        }
    });
}
