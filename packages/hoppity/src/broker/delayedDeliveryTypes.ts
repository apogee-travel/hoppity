/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicationConfig } from "rascal";

/**
 * Wraps the original message during transit through the wait → ready queue pipeline.
 *
 * When publishEvent/sendCommand is called with a delay option, the original payload
 * is wrapped in this envelope and published to the wait queue with per-message TTL
 * equal to the delay. When TTL expires, RabbitMQ dead-letters the envelope to the
 * ready queue, where it is unwrapped and the original message is re-published.
 */
export interface DelayedDeliveryEnvelope {
    /** The original message payload */
    originalMessage: any;
    /** The Rascal publication name to use when re-publishing after the delay */
    originalPublication: string;
    /** Optional Rascal PublicationConfig overrides forwarded to the re-publish call */
    originalOverrides?: PublicationConfig;
    /** The intended delay in milliseconds (used as per-message TTL on the wait queue) */
    targetDelay: number;
    /** Unix timestamp (ms) when the delayed publish was initiated */
    createdAt: number;
    /** Number of re-publish retry attempts so far. Starts at 0. */
    retryCount: number;
}

/**
 * Error codes for delayed delivery operations.
 */
export enum DelayedDeliveryErrorCode {
    /** The delay value was zero or negative */
    INVALID_DELAY = "DELAYED_DELIVERY_INVALID_DELAY",
    /** Publishing to the wait queue failed */
    QUEUE_FULL = "DELAYED_DELIVERY_QUEUE_FULL",
    /** Publishing to the error queue after max retries exhausted failed */
    ERROR_QUEUE_PUBLISH_FAILED = "DELAYED_DELIVERY_ERROR_QUEUE_PUBLISH_FAILED",
    /** All retry attempts exhausted; message routed to the error queue */
    MAX_RETRIES_EXCEEDED = "DELAYED_DELIVERY_MAX_RETRIES_EXCEEDED",
    /**
     * Re-enqueueing to the wait queue failed during a retry attempt.
     * The ready-queue message should be nacked so Rascal's redelivery limit applies —
     * the message is not yet parked anywhere safe.
     */
    RETRY_ENQUEUE_FAILED = "DELAYED_DELIVERY_RETRY_ENQUEUE_FAILED",
}

/**
 * Structured error class for delayed delivery operations.
 */
export class DelayedDeliveryError extends Error {
    public readonly code: DelayedDeliveryErrorCode;
    public readonly details?: any;

    constructor(code: DelayedDeliveryErrorCode, message: string, details?: any) {
        super(message);
        this.name = "DelayedDeliveryError";
        this.code = code;
        this.details = details;
    }
}
