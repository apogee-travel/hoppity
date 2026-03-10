/* eslint-disable @typescript-eslint/no-explicit-any */
import { MiddlewareContext, MiddlewareFunction, MiddlewareResult } from "@apogeelabs/hoppity";
import { BrokerConfig } from "rascal";
import { setupRpcBroker } from "./setupRpcBroker";
import { RpcMiddlewareOptions } from "./types";
import {
    generateInboundQueueName,
    generateReplyQueueName,
    generateServiceRpcBindingPattern,
} from "./utils/queueNaming";

/**
 * Middleware factory that adds RPC capabilities to a hoppity broker
 *
 * This middleware:
 * 1. Adds an RPC exchange to the topology
 * 2. Creates reply and inbound queues for the service
 * 3. Sets up bindings and subscriptions
 * 4. Extends the broker with RPC methods (request, addRpcListener, cancelRequest)
 *
 * @param options - Configuration options for the RPC middleware
 * @returns A middleware function that can be used with hoppity
 */
export const withRpcSupport = (options: RpcMiddlewareOptions): MiddlewareFunction => {
    // Validate required options
    if (!options.serviceName?.trim()) {
        throw new Error("withRpcSupport: serviceName is required and must be a non-empty string");
    }
    if (!options.instanceId?.trim()) {
        throw new Error("withRpcSupport: instanceId is required and must be a non-empty string");
    }
    if (options.rpcExchange !== undefined && !options.rpcExchange.trim()) {
        throw new Error("withRpcSupport: rpcExchange must be a non-empty string when provided");
    }

    const { serviceName, instanceId, rpcExchange = "rpc_requests" } = options;

    return (topology: BrokerConfig, context: MiddlewareContext): MiddlewareResult => {
        context.logger.info(`[RpcSupport] Applying RPC middleware for service: ${serviceName}`);
        context.logger.debug(
            `[RpcSupport] Previous middleware: ${context.middlewareNames.join(", ") || "none"}`
        );

        // Check for existing RPC configuration to avoid conflicts
        if (context.data.rpcConfig) {
            context.logger.warn(
                `[RpcSupport] Warning: RPC configuration already exists in context from previous middleware`
            );
            context.logger.warn(`[RpcSupport] Existing config:`, context.data.rpcConfig);
        }

        // Store RPC configuration in context for other middleware to use
        context.data.rpcConfig = {
            serviceName,
            instanceId,
            rpcExchange,
            replyQueueName: generateReplyQueueName(serviceName, instanceId),
            inboundQueueName: generateInboundQueueName(serviceName, instanceId),
        };

        // Clone the topology to avoid mutations.
        // structuredClone is used (rather than spread or Object.assign) because
        // BrokerConfig is deeply nested — vhosts contain exchanges, queues, bindings,
        // etc. A shallow copy would share references to inner objects, meaning our
        // modifications here would bleed into other middleware or the original topology.
        const modifiedTopology = structuredClone(topology);

        // Ensure vhosts exist in topology
        if (!modifiedTopology.vhosts) {
            modifiedTopology.vhosts = {};
        }

        // Add RPC infrastructure to each vhost
        Object.keys(modifiedTopology.vhosts).forEach(vhostKey => {
            const vhost = modifiedTopology.vhosts![vhostKey];

            // Topic exchange because RPC routing keys use dot-delimited segments
            // (e.g., "rpc.user-service.getProfile.request") and services bind with
            // wildcard patterns like "rpc.user-service.#.request". A direct exchange
            // couldn't support the multi-segment wildcard matching we need here.
            // Durable so it survives broker restarts — the queues are ephemeral but
            // the exchange should stick around.
            if (!vhost.exchanges) {
                vhost.exchanges = {};
            }
            (vhost.exchanges as any)[rpcExchange] = {
                type: "topic",
                options: {
                    durable: true,
                },
            };

            // Both queues are exclusive + autoDelete:
            // - exclusive: only this connection can consume from them, preventing
            //   another instance from accidentally draining our replies or requests.
            // - autoDelete: RabbitMQ removes them when the connection drops, so we
            //   don't leak queues when services restart. The trade-off is that any
            //   in-flight messages are lost on disconnect — acceptable for RPC where
            //   the requester would timeout anyway.
            if (!vhost.queues) {
                vhost.queues = {};
            }
            const replyQueueName = generateReplyQueueName(serviceName, instanceId);
            (vhost.queues as any)[replyQueueName] = {
                options: {
                    exclusive: true,
                    autoDelete: true,
                },
            };

            const inboundQueueName = generateInboundQueueName(serviceName, instanceId);
            (vhost.queues as any)[inboundQueueName] = {
                options: {
                    exclusive: true,
                    autoDelete: true,
                },
            };

            // Binding pattern uses "#" (multi-word wildcard) so that routing keys
            // like "rpc.user-service.getProfile.request" match the pattern
            // "rpc.user-service.#.request". This lets a single service binding
            // catch all RPC methods targeted at that service.
            if (!vhost.bindings) {
                vhost.bindings = {};
            }
            (vhost.bindings as any)[`${inboundQueueName}_binding`] = {
                source: rpcExchange,
                destination: inboundQueueName,
                destinationType: "queue",
                bindingKey: generateServiceRpcBindingPattern(serviceName),
            };

            // prefetch: 1 on both subscriptions ensures fair dispatch — a service
            // instance won't hoard messages while another sits idle. This matters
            // for RPC where response latency is visible to the caller.
            if (!vhost.subscriptions) {
                vhost.subscriptions = {};
            }
            (vhost.subscriptions as any)[`${inboundQueueName}_subscription`] = {
                queue: inboundQueueName,
                options: {
                    prefetch: 1,
                },
            };
            (vhost.subscriptions as any)[`${replyQueueName}_subscription`] = {
                queue: replyQueueName,
                options: {
                    prefetch: 1,
                },
            };

            // Add service rpc publications
            const requestPublicationName = `rpc_request`;
            if (!vhost.publications) {
                vhost.publications = {};
            }
            (vhost.publications as any)[requestPublicationName] = {
                exchange: rpcExchange,
            };

            // RPC reply publication using RabbitMQ's default exchange
            // The default exchange (empty string "") is a direct exchange that routes messages
            // to queues whose names match the routing key. In RPC patterns, the replyTo field
            // from the original request contains the name of the temporary reply queue created
            // by the requesting service. By using "{{replyTo}}" as the routing key, messages
            // are automatically routed to the correct reply queue for each RPC request.
            (vhost.publications as any)["rpc_reply"] = {
                exchange: "", // Default direct exchange
                routingKey: "{{replyTo}}",
                options: {
                    persistent: false,
                },
            };

            context.logger.debug(`[RpcSupport] Added RPC infrastructure to vhost '${vhostKey}':`);
            context.logger.debug(`  - Exchange: ${rpcExchange}`);
            context.logger.debug(`  - Reply queue: ${replyQueueName}`);
            context.logger.debug(`  - Inbound queue: ${inboundQueueName}`);
            context.logger.debug(`  - Request publication: ${requestPublicationName}`);
            context.logger.debug(`  - Response publication: rpc_reply`);
        });

        // Return the modified topology and a callback for post-broker-creation setup
        return {
            topology: modifiedTopology,
            onBrokerCreated: async broker => {
                await setupRpcBroker(broker, options, context.logger);
            },
        };
    };
};
