/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Logger } from "@apogeelabs/hoppity";
import { BrokerAsPromised, type PublicationConfig } from "rascal";
import { handleReadyMessage } from "./handleReadyMessage";
import {
    type DelayedMessage,
    type DelayedPublishBroker,
    DelayedPublishError,
    DelayedPublishErrorCode,
    type DelayedPublishOptions,
} from "./types";

/**
 * Sets up delayed publish functionality on a broker instance
 * This function extends the broker with delayedPublish method and sets up subscriptions
 *
 * This follows Hoppity's extension pattern where middleware functions
 * extend the broker with additional capabilities. Unlike Rascal's direct broker usage,
 * Hoppity uses a builder pattern with middleware that can add methods to the broker.
 *
 * RABBITMQ TTL MECHANICS: This implementation uses RabbitMQ's TTL (Time-To-Live) feature
 * with dead letter exchanges to achieve delayed publishing:
 * 1. Messages are published to a wait queue with TTL set to the desired delay
 * 2. When TTL expires, RabbitMQ automatically moves messages to a ready queue via dead letter exchange
 * 3. A subscription processes the ready queue and re-publishes to the original destination
 *
 * @param broker - The broker instance to extend (Hoppity's BrokerAsPromised wrapper)
 * @param options - Delayed publish configuration options
 * @param logger - Optional logger instance for delayed publish operations
 * @returns Promise that resolves when setup is complete
 */
export async function setupDelayedPublishBroker(
    broker: BrokerAsPromised,
    options: DelayedPublishOptions,
    logger?: Logger
): Promise<void> {
    const {
        serviceName,
        defaultDelay = 30_000,
        maxRetries = 5,
        retryDelay = 1000,
        durable = true,
    } = options;

    // Hoppity uses service-based queue naming to prevent conflicts
    // between different services and instances. This is different from Rascal's direct
    // queue naming where you might use static names.
    const readyQueueName = `${serviceName}_ready`;
    const waitPublicationName = `${serviceName}_delayed_wait`;

    // The subscription *definition* lives in the topology (added by withDelayedPublish),
    // but we *activate* it here in the onBrokerCreated callback because the broker
    // must exist before we can subscribe. The topology defined prefetch: 1 on this
    // subscription so we process one message at a time — this prevents a burst of
    // expired messages from overwhelming the re-publish path and competing for
    // channels/connections under load.
    const readySubscription = await broker.subscribe(`${readyQueueName}_subscription`);

    // this is the message handler callback for when messages are received in the ready queue
    readySubscription.on("message", async (message, content, ackOrNack) => {
        try {
            const delayedMessage = content as DelayedMessage;

            // Handle the delayed message
            await handleReadyMessage(broker, delayedMessage, logger, waitPublicationName, {
                maxRetries,
                retryDelay,
                persistent: durable,
            });
            ackOrNack();
        } catch (error) {
            logger?.error("Error processing delayed message:", error);
            ackOrNack(error instanceof Error ? error : new Error(String(error)));
        }
    });

    readySubscription.on("error", err => {
        logger?.error("Ready subscription error:", err);
    });

    // MONKEY-PATCHING PATTERN: Hoppity middleware extends the broker by assigning
    // new methods directly onto the BrokerAsPromised instance. This is intentional —
    // Rascal's broker is a plain object, not a frozen/sealed class, so property
    // assignment works reliably. The trade-off is that TypeScript doesn't know about
    // the new method, which is why consumers must cast to DelayedPublishBroker.
    // The alternative (subclassing BrokerAsPromised) isn't viable because Rascal's
    // BrokerAsPromised.create() factory returns its own instance, not ours.
    (broker as DelayedPublishBroker).delayedPublish = async function delayedPublish(
        publication: string,
        message: any,
        overrides?: PublicationConfig,
        delay?: number
    ): Promise<void> {
        const actualDelay = delay ?? defaultDelay;

        // Validate delay
        if (actualDelay <= 0) {
            throw new DelayedPublishError(
                DelayedPublishErrorCode.INVALID_DELAY,
                `Invalid delay: ${actualDelay}. Delay must be greater than 0.`,
                { providedDelay: actualDelay, defaultDelay }
            );
        }

        // Hoppity uses structured message objects that contain both the original message and metadata.
        // This is different from Rascal's direct message publishing where you'd typically just send the payload.
        const delayedMessage: DelayedMessage = {
            originalMessage: message,
            originalPublication: publication,
            originalOverrides: overrides,
            targetDelay: actualDelay,
            createdAt: Date.now(),
            retryCount: 0,
        };

        try {
            // RABBITMQ TTL PUBLISHING: The key to delayed publishing is publishing to the wait queue with
            // TTL (the expiration on the message) set to the desired delay. When the TTL expires, RabbitMQ
            // will automatically move the message to the ready queue via the dead letter exchange configuration.
            await broker.publish(waitPublicationName, delayedMessage, {
                options: {
                    expiration: actualDelay, // This is the TTL in milliseconds
                    persistent: durable,
                },
            });

            logger?.debug(`[DelayedPublish] Published delayed message with ${actualDelay}ms delay`);
        } catch (error) {
            logger?.error(`[DelayedPublish] Failed to publish delayed message:`, error);
            throw new DelayedPublishError(
                DelayedPublishErrorCode.QUEUE_FULL,
                `Failed to publish delayed message: ${error instanceof Error ? error.message : String(error)}`,
                {
                    originalError: error,
                    publication,
                    delay: actualDelay,
                    waitPublicationName,
                }
            );
        }
    };

    logger?.info(
        `[DelayedPublish] Broker extended with delayed publish capabilities for service: ${serviceName}`
    );
}
