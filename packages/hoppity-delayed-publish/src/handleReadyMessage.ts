/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Logger } from "@apogeelabs/hoppity";
import { BrokerAsPromised } from "rascal";
import { type DelayedMessage, DelayedPublishError, DelayedPublishErrorCode } from "./types";

/**
 * Configuration for the retry behavior when re-publishing a delayed message fails.
 *
 * Retries are implemented by re-publishing the message back to the wait queue with
 * a short TTL (`retryDelay`), so the message goes through the same dead-letter cycle
 * again. This avoids tight retry loops and gives the broker time to recover from
 * transient failures (connection blips, channel errors, etc.).
 *
 * @see {@link handleReadyMessage} — the function that uses this config
 */
export interface RetryConfig {
    /** Maximum number of re-publish attempts before routing to the error queue. */
    maxRetries: number;
    /** Delay in ms between attempts — used as per-message TTL on the wait queue. */
    retryDelay: number;
    /**
     * Whether retry messages are persisted to disk.
     * Mirrors the `durable` option from {@link DelayedPublishOptions}.
     *
     * @defaultValue `true`
     */
    persistent?: boolean;
}

/**
 * Handles a message that has expired (reach the wait threshold) and is ready to be re-published
 *
 * RABBITMQ DEAD LETTER FLOW: This function is called when messages expire from the wait
 * queue and are moved to the ready queue via RabbitMQ's dead letter exchange mechanism.
 * The message has already been "delayed" by the TTL expiration, so now we need to
 * re-publish it to its original destination.
 *
 * @param broker - The broker instance (Hoppity's extended broker with delayedPublish)
 * @param delayedMessage - The delayed message to process (contains original message + metadata)
 * @param logger - Optional logger instance for structured logging
 * @param waitPublicationName - The publication name to use for retries (Hoppity's service-based naming)
 * @returns Promise that resolves when the message is re-published
 */
export async function handleReadyMessage(
    broker: BrokerAsPromised,
    delayedMessage: DelayedMessage,
    logger?: Logger,
    waitPublicationName?: string,
    retryConfig?: RetryConfig
): Promise<void> {
    const maxRetries = retryConfig?.maxRetries ?? 5;
    const retryDelay = retryConfig?.retryDelay ?? 1000;
    const persistent = retryConfig?.persistent ?? true;
    const retryCount = delayedMessage.retryCount || 0;

    try {
        // We're re-publishing the original message using the stored publication name and overrides.
        await broker.publish(delayedMessage.originalPublication, delayedMessage.originalMessage, {
            ...delayedMessage.originalOverrides,
            options: {
                ...delayedMessage.originalOverrides?.options,
                mandatory: true, // Ensure routing errors are detected
            },
        });

        logger?.debug(
            `[DelayedPublish] Successfully re-published delayed message from publication: ${delayedMessage.originalPublication}`
        );
    } catch (error) {
        logger?.error(`[DelayedPublish] Failed to re-publish delayed message:`, error);

        // This implements a sophisticated retry mechanism. The retry logic is built into
        // the delayed publish system rather than being handled externally.
        if (retryCount < maxRetries) {
            logger?.warn(
                `[DelayedPublish] Retrying re-publish (attempt ${retryCount + 1}/${maxRetries})`
            );

            // We preserve the original message structure and just increment the retry count.
            // This maintains the full context of the original delayed publish request.
            const retryMessage: DelayedMessage = {
                ...delayedMessage,
                retryCount: retryCount + 1,
            };

            // RETRY STRATEGY: Rather than retrying immediately (which would spin in a
            // tight loop under sustained failure), the message goes back through the
            // wait queue with a short TTL equal to `retryDelay`. This reuses the
            // existing dead-letter pipeline — wait queue TTL expires, message lands
            // back on the ready queue, and we try again. The broker gets breathing
            // room between attempts, and we get retry counting for free via the
            // `retryCount` field in the envelope.
            if (waitPublicationName) {
                await broker.publish(waitPublicationName, retryMessage, {
                    options: {
                        expiration: retryDelay,
                        persistent,
                    },
                });
            }

            throw new DelayedPublishError(
                DelayedPublishErrorCode.REPUBLISH_FAILED,
                `Failed to re-publish delayed message: ${error instanceof Error ? error.message : String(error)}`,
                {
                    originalError: error,
                    retryCount,
                    maxRetries,
                    originalPublication: delayedMessage.originalPublication,
                    targetDelay: delayedMessage.targetDelay,
                    createdAt: delayedMessage.createdAt,
                }
            );
        } else {
            // MAX RETRIES EXHAUSTED: Route to the error queue instead of nacking.
            // Nacking would requeue the message on the ready queue, creating an
            // infinite retry loop. The error queue acts as a dead letter destination
            // where failed messages can be inspected, replayed manually, or
            // consumed by an alerting/monitoring system.
            logger?.error(
                `[DelayedPublish] Max retries exceeded for delayed message, sending to error queue`
            );

            const errorMessage = {
                originalMessage: delayedMessage,
                error: error instanceof Error ? error.message : String(error),
                errorCode: DelayedPublishErrorCode.MAX_RETRIES_EXCEEDED,
                failedAt: Date.now(),
                retryCount: retryCount,
            };

            // Error queues follow the pattern {originalPublication}_delayed_error, making it
            // easy to identify which publication the error originated from.
            await broker.publish(
                `${delayedMessage.originalPublication}_delayed_error`,
                errorMessage,
                {
                    options: {
                        persistent,
                    },
                }
            );

            throw new DelayedPublishError(
                DelayedPublishErrorCode.MAX_RETRIES_EXCEEDED,
                `Max retries exceeded for delayed message. Original error: ${error instanceof Error ? error.message : String(error)}`,
                {
                    originalError: error,
                    retryCount,
                    maxRetries,
                    originalPublication: delayedMessage.originalPublication,
                    targetDelay: delayedMessage.targetDelay,
                    createdAt: delayedMessage.createdAt,
                }
            );
        }
    }
}
