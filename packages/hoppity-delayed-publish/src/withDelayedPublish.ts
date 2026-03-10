/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MiddlewareContext, MiddlewareFunction, MiddlewareResult } from "@apogeelabs/hoppity";
import type { BrokerConfig } from "rascal";
import { setupDelayedPublishBroker } from "./setupDelayedPublishBroker";
import type { DelayedPublishOptions } from "./types";

/**
 * Middleware factory that adds delayed publish capabilities to a hoppity broker
 *
 * This middleware:
 * 1. Adds wait and ready queues to the topology
 * 2. Configures dead letter exchange and bindings
 * 3. Sets up publications for delayed messages
 * 4. Extends the broker with delayedPublish method
 *
 * @param options - Configuration options for the delayed publish middleware
 * @returns A middleware function that can be used with hoppity
 */
export const withDelayedPublish = (options: DelayedPublishOptions): MiddlewareFunction => {
    // Validate required options
    if (!options.serviceName?.trim()) {
        throw new Error(
            "withDelayedPublish: serviceName is required and must be a non-empty string"
        );
    }
    if (!options.instanceId?.trim()) {
        throw new Error(
            "withDelayedPublish: instanceId is required and must be a non-empty string"
        );
    }

    const { serviceName, instanceId, defaultDelay = 30_000, durable = true } = options;

    return (topology: BrokerConfig, context: MiddlewareContext): MiddlewareResult => {
        context.logger.info(
            `[DelayedPublish] Applying delayed publish middleware for service: ${serviceName}`
        );
        context.logger.debug(
            `[DelayedPublish] Previous middleware: ${context.middlewareNames.join(", ") || "none"}`
        );

        // Idempotency guard: if another middleware (or a duplicate use() call) has
        // already written delayedPublishConfig to the shared context, warn rather
        // than silently overwrite. Two delayed-publish middlewares in the same
        // pipeline would create duplicate queues and competing subscriptions.
        if (context.data.delayedPublishConfig) {
            context.logger.warn(
                `[DelayedPublish] Warning: Delayed publish configuration already exists in context from previous middleware`
            );
            context.logger.warn(
                `[DelayedPublish] Existing config:`,
                context.data.delayedPublishConfig
            );
        }

        // Store delayed publish configuration in context for other middleware to use
        context.data.delayedPublishConfig = {
            serviceName,
            instanceId,
            defaultDelay,
            waitQueueName: `${serviceName}_wait`,
            readyQueueName: `${serviceName}_ready`,
            errorQueueName: `${serviceName}_delayed_errors`,
        };

        // Clone so that topology modifications made here don't leak back to
        // the caller or affect other middleware that may run after this one.
        // The hoppity core also clones at builder construction, but this second
        // clone ensures this middleware is self-contained regardless of pipeline order.
        const modifiedTopology = structuredClone(topology);

        // Ensure vhosts exist in topology
        if (!modifiedTopology.vhosts) {
            modifiedTopology.vhosts = {};
        }

        // Add delayed publish infrastructure to each vhost
        Object.keys(modifiedTopology.vhosts).forEach(vhostKey => {
            const vhost = modifiedTopology.vhosts![vhostKey];

            // Add wait queue (messages expire and dead letter to ready queue)
            if (!vhost.queues) {
                vhost.queues = {};
            }
            const waitQueueName = `${serviceName}_wait`;
            (vhost.queues as any)[waitQueueName] = {
                options: {
                    durable,
                    autoDelete: false,
                    arguments: {
                        // Uses the default direct exchange ("") rather than declaring
                        // a custom DLX. The default exchange routes by queue name,
                        // so we just set the routing key to the ready queue name.
                        // This avoids creating and managing a dedicated exchange
                        // that would only exist to shuttle dead-lettered messages.
                        "x-dead-letter-exchange": "",
                        "x-dead-letter-routing-key": `${serviceName}_ready`,
                    },
                },
            };

            // Add ready queue (handles expired messages)
            const readyQueueName = `${serviceName}_ready`;
            (vhost.queues as any)[readyQueueName] = {
                options: {
                    durable,
                    autoDelete: false,
                },
            };

            // Add error queue (for failed re-publishes)
            const errorQueueName = `${serviceName}_delayed_errors`;
            (vhost.queues as any)[errorQueueName] = {
                options: {
                    durable,
                    autoDelete: false,
                },
            };

            // Add publications for delayed messages
            if (!vhost.publications) {
                vhost.publications = {};
            }
            (vhost.publications as any)[`${serviceName}_delayed_wait`] = {
                exchange: "", // Default direct exchange
                routingKey: waitQueueName,
                options: {
                    persistent: durable,
                },
            };

            // Add subscriptions for ready queue
            if (!vhost.subscriptions) {
                vhost.subscriptions = {};
            }
            (vhost.subscriptions as any)[`${readyQueueName}_subscription`] = {
                queue: readyQueueName,
                options: {
                    prefetch: 1,
                },
            };

            context.logger.debug(
                `[DelayedPublish] Added delayed publish infrastructure to vhost '${vhostKey}':`
            );
            context.logger.debug(`  - Wait queue: ${waitQueueName}`);
            context.logger.debug(`  - Ready queue: ${readyQueueName}`);
            context.logger.debug(`  - Error queue: ${errorQueueName}`);
            context.logger.debug(`  - Wait publication: ${serviceName}_delayed_wait`);
            context.logger.debug(`  - Ready subscription: ${readyQueueName}_subscription`);
        });

        // Return the modified topology and a callback for post-broker-creation setup
        return {
            topology: modifiedTopology,
            onBrokerCreated: async broker => {
                const logger = context.logger;
                await setupDelayedPublishBroker(broker, options, logger);
            },
        };
    };
};
