import { MiddlewareContext, MiddlewareFunction, MiddlewareResult } from "@apogeelabs/hoppity";
import { BrokerAsPromised, BrokerConfig } from "rascal";
import { SubscriptionHandlers } from "./types";
import { validateSubscriptionHandlers } from "./validation";

/**
 * Middleware function that sets up subscription handlers for a Rascal broker.
 *
 * This middleware uses a two-phase design:
 * 1. **Topology phase** (synchronous) — validates that every handler key maps
 *    to a real subscription in the topology. Fails fast so typos and stale
 *    handler keys are caught before the broker is even created.
 * 2. **`onBrokerCreated` callback** (async) — wires up the actual subscription
 *    listeners on the live broker. This must happen after broker creation
 *    because `broker.subscribe()` requires a running AMQP connection.
 *
 * Because this middleware validates against the finalized topology, it should
 * be the **last** middleware in the pipeline. If earlier middleware (e.g.
 * hoppity-rpc, hoppity-delayed-publish) adds subscriptions to the topology,
 * those must run first or validation will miss them.
 *
 * @param handlers - Object mapping subscription names to their handler functions
 * @returns MiddlewareFunction that can be used in the hoppity pipeline
 */
export function withSubscriptions(handlers: SubscriptionHandlers): MiddlewareFunction {
    return (topology: BrokerConfig, context: MiddlewareContext): MiddlewareResult => {
        // Phase 1: Validate during topology phase — fail fast before broker creation
        const validation = validateSubscriptionHandlers(topology, handlers);

        if (!validation.isValid) {
            throw new Error(validation.errorMessage);
        }

        // Track successfully validated subscriptions for diagnostics
        const validatedSubscriptions = Object.keys(handlers);
        context.data.validatedSubscriptions = validatedSubscriptions;
        context.logger.info(
            `Validated ${validatedSubscriptions.length} subscription handlers: ${validatedSubscriptions.join(", ")}`
        );

        // Phase 2: Defer actual wiring to the onBrokerCreated callback,
        // since we need a live broker to call broker.subscribe().
        return {
            topology,
            onBrokerCreated: async (broker: BrokerAsPromised) => {
                await setupSubscriptionHandlers(broker, handlers, context);
            },
        };
    };
}

/**
 * Sets up subscription handlers on the broker instance.
 *
 * Iterates over every handler entry, subscribes to the corresponding queue,
 * and attaches `message`, `error`, and `invalid_content` event listeners.
 *
 * Errors during setup are re-thrown intentionally. The core pipeline catches
 * errors from `onBrokerCreated` callbacks and triggers `broker.shutdown()`
 * before propagating, ensuring the AMQP connection is cleaned up if any
 * subscription fails to wire up.
 *
 * @param broker - The Rascal broker instance
 * @param handlers - The subscription handlers object
 * @param context - The middleware context for logging
 */
async function setupSubscriptionHandlers(
    broker: BrokerAsPromised,
    handlers: SubscriptionHandlers,
    context: MiddlewareContext
): Promise<void> {
    const subscriptionNames = Object.keys(handlers);

    for (const subscriptionName of subscriptionNames) {
        try {
            // Subscribe to the queue
            const subscription = await broker.subscribe(subscriptionName);
            const handler = handlers[subscriptionName];

            // Set up message event handler with dual sync/async error handling.
            // The outer try/catch handles synchronous throws from the handler.
            // If the handler returns a Promise, we attach a .catch() to handle
            // async rejections. Both paths log the error and nack the message
            // so that unhandled failures don't leave messages stuck in limbo.
            subscription.on("message", (message, content, ackOrNack) => {
                try {
                    const result = handler(message, content, ackOrNack, broker);

                    if (result instanceof Promise) {
                        result.catch(error => {
                            context.logger.error(
                                `Error in subscription handler for '${subscriptionName}':`,
                                error
                            );
                            ackOrNack(error instanceof Error ? error : new Error(String(error)));
                        });
                    }
                } catch (error) {
                    context.logger.error(
                        `Error in subscription handler for '${subscriptionName}':`,
                        error
                    );
                    ackOrNack(error instanceof Error ? error : new Error(String(error)));
                }
            });

            // Set up error event handler with default logging
            subscription.on("error", error => {
                context.logger.warn(`Subscription error for '${subscriptionName}':`, error);
            });

            // Set up invalid_content event handler with default logging
            subscription.on("invalid_content", error => {
                context.logger.warn(
                    `Invalid content for subscription '${subscriptionName}':`,
                    error
                );
            });

            context.logger.info(
                `Successfully set up subscription handler for '${subscriptionName}'`
            );
        } catch (error) {
            context.logger.error(
                `Failed to set up subscription handler for '${subscriptionName}':`,
                error
            );
            // Re-throw so the core pipeline's onBrokerCreated error handling
            // kicks in — it will shut down the broker before propagating.
            throw error;
        }
    }

    context.logger.info(`Successfully set up ${subscriptionNames.length} subscription handlers`);
}
