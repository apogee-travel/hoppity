/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Logger } from "@apogeelabs/hoppity";
import { BrokerAsPromised } from "rascal";
import { type DelayedMessage, DelayedPublishError, DelayedPublishErrorCode } from "./types";

export interface RetryConfig {
    maxRetries: number;
    retryDelay: number;
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

            // RABBITMQ RETRY MECHANISM: Instead of immediate retry, we publish back
            // to the wait queue with a short TTL. This prevents tight retry loops
            // and gives the system time to recover from transient issues.
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
            // When max retries are exceeded, we send the message to a dedicated error queue.
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
