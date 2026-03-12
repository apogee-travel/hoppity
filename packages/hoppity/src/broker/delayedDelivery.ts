/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerAsPromised } from "rascal";
import { EventContract, CommandContract } from "../contracts/types";
import {
    getDelayedErrorQueueName,
    getDelayedReadySubscriptionName,
    getDelayedWaitPublicationName,
} from "../contracts/naming";
import { MiddlewareContext } from "../types";
import {
    DelayedDeliveryEnvelope,
    DelayedDeliveryError,
    DelayedDeliveryErrorCode,
} from "./delayedDeliveryTypes";

/**
 * Configuration for delayed delivery retry behavior.
 */
export interface DelayedDeliveryConfig {
    /** Maximum re-publish attempts before routing to the error queue. Defaults to 5. */
    maxRetries?: number;
    /** Delay in ms between retry attempts — used as per-message TTL. Defaults to 1000. */
    retryDelay?: number;
}

/**
 * Subscribes to the ready queues for all delay-capable contracts and wires up the
 * re-publish logic. Called from ServiceBuilder after the broker is created.
 *
 * Each contract that declares delay support gets its own ready queue subscription.
 * When a message arrives on the ready queue it is unwrapped from its envelope and
 * re-published to its original destination. On failure the message is retried via
 * the wait queue (short TTL) and eventually routed to the error queue.
 */
export async function wireDelayedDelivery(
    broker: BrokerAsPromised,
    delayContracts: (EventContract | CommandContract)[],
    context: MiddlewareContext,
    config: DelayedDeliveryConfig = {}
): Promise<void> {
    const maxRetries = config.maxRetries ?? 5;
    const retryDelay = config.retryDelay ?? 1_000;

    for (const contract of delayContracts) {
        const { _domain: domain, _type: opType, _name: opName } = contract;

        const readySubscriptionName = getDelayedReadySubscriptionName(domain, opType, opName);
        const waitPublicationName = getDelayedWaitPublicationName(domain, opType, opName);
        const errorQueueName = getDelayedErrorQueueName(domain, opType, opName);

        const subscription = await broker.subscribe(readySubscriptionName);

        subscription.on("message", async (_, content, ackOrNack) => {
            const envelope = content as DelayedDeliveryEnvelope;
            try {
                await handleReadyMessage(broker, envelope, waitPublicationName, {
                    maxRetries,
                    retryDelay,
                    errorQueueName,
                });
                ackOrNack();
            } catch (error) {
                context.logger.error(
                    `[DelayedDelivery] Error processing ready message for '${readySubscriptionName}':`,
                    error
                );
                // Nack only when the message was not safely parked — either the retry-enqueue
                // failed (message not in wait queue) or the error queue publish failed (message
                // not in error queue). In both cases Rascal's redelivery limit applies.
                // In all other cases the message was forwarded, so ack to avoid requeue loops.
                const isUnparkedFailure =
                    error instanceof DelayedDeliveryError &&
                    (error.code === DelayedDeliveryErrorCode.RETRY_ENQUEUE_FAILED ||
                        error.code === DelayedDeliveryErrorCode.ERROR_QUEUE_PUBLISH_FAILED);
                if (isUnparkedFailure) {
                    ackOrNack(error);
                } else {
                    ackOrNack();
                }
            }
        });

        subscription.on("error", err => {
            context.logger.error(
                `[DelayedDelivery] Ready subscription error on '${readySubscriptionName}':`,
                err
            );
        });
    }
}

interface HandleReadyOptions {
    maxRetries: number;
    retryDelay: number;
    errorQueueName: string;
}

/**
 * Processes a single message from a ready queue.
 *
 * Attempts to re-publish the original message to its original publication.
 * On failure, retries via the wait queue with a short TTL (up to maxRetries times).
 * After maxRetries exhausted, routes to the error queue.
 */
async function handleReadyMessage(
    broker: BrokerAsPromised,
    envelope: DelayedDeliveryEnvelope,
    waitPublicationName: string,
    options: HandleReadyOptions
): Promise<void> {
    const { maxRetries, retryDelay, errorQueueName } = options;
    const retryCount = envelope.retryCount ?? 0;

    try {
        await broker.publish(envelope.originalPublication, envelope.originalMessage, {
            ...envelope.originalOverrides,
            options: {
                ...envelope.originalOverrides?.options,
                // mandatory ensures routing errors are surfaced rather than silently dropped
                mandatory: true,
            },
        });
    } catch (republishError) {
        if (retryCount < maxRetries) {
            // Send back through the wait queue with a short TTL so it re-enters the
            // dead-letter pipeline after retryDelay ms. This avoids tight retry loops
            // and reuses the existing infrastructure for free retry counting.
            const retryEnvelope: DelayedDeliveryEnvelope = {
                ...envelope,
                retryCount: retryCount + 1,
            };
            try {
                await broker.publish(waitPublicationName, retryEnvelope, {
                    options: { expiration: retryDelay, persistent: true },
                });
            } catch (enqueueError) {
                // The retry-enqueue failed — the message is not safely parked. Throw a
                // distinct error so the outer handler knows to nack rather than ack.
                throw new DelayedDeliveryError(
                    DelayedDeliveryErrorCode.RETRY_ENQUEUE_FAILED,
                    `Failed to re-enqueue delayed message for retry (attempt ${retryCount + 1}/${maxRetries}): ${enqueueError instanceof Error ? enqueueError.message : String(enqueueError)}`,
                    {
                        originalError: enqueueError,
                        republishError,
                        retryCount,
                        maxRetries,
                        originalPublication: envelope.originalPublication,
                        targetDelay: envelope.targetDelay,
                        createdAt: envelope.createdAt,
                    }
                );
            }
            // Retry successfully enqueued — the message is now in the wait queue.
            // Return without throwing so the caller acks the ready-queue message.
            return;
        }

        // Max retries exhausted — route to the error queue. We ack the ready queue
        // message in the caller so the error queue is the terminal destination.
        const errorRecord = {
            originalEnvelope: envelope,
            error:
                republishError instanceof Error ? republishError.message : String(republishError),
            errorCode: DelayedDeliveryErrorCode.MAX_RETRIES_EXCEEDED,
            failedAt: Date.now(),
            retryCount,
        };

        try {
            await broker.publish(errorQueueName, errorRecord, {
                options: { persistent: true },
            });
        } catch (errorQueueError) {
            // The error queue publish failed — message is not parked anywhere. Throw a distinct
            // error so the outer handler knows to nack rather than ack.
            throw new DelayedDeliveryError(
                DelayedDeliveryErrorCode.ERROR_QUEUE_PUBLISH_FAILED,
                `Failed to publish to error queue after max retries (${maxRetries}): ${errorQueueError instanceof Error ? errorQueueError.message : String(errorQueueError)}`,
                {
                    originalError: republishError,
                    errorQueueError,
                    retryCount,
                    maxRetries,
                    originalPublication: envelope.originalPublication,
                    targetDelay: envelope.targetDelay,
                    createdAt: envelope.createdAt,
                }
            );
        }

        throw new DelayedDeliveryError(
            DelayedDeliveryErrorCode.MAX_RETRIES_EXCEEDED,
            `Max retries (${maxRetries}) exceeded for delayed message. Original error: ${republishError instanceof Error ? republishError.message : String(republishError)}`,
            {
                originalError: republishError,
                retryCount,
                maxRetries,
                originalPublication: envelope.originalPublication,
                targetDelay: envelope.targetDelay,
                createdAt: envelope.createdAt,
            }
        );
    }
}
