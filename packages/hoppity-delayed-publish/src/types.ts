/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerAsPromised, PublicationConfig } from "rascal";

/**
 * Configuration options for the delayed publish middleware
 */
export interface DelayedPublishOptions {
    /** The name of the service (used for queue naming) */
    serviceName: string;
    /** Unique instance identifier (used for queue naming) */
    instanceId: string;
    /** Default delay in milliseconds when no delay is specified in delayedPublish call */
    defaultDelay?: number;
    /** Max retry attempts when re-publish fails (default: 5) */
    maxRetries?: number;
    /** Delay in ms between retry attempts (default: 1000) */
    retryDelay?: number;
    /** Whether queues and messages should survive broker restarts (default: true) */
    durable?: boolean;
}

/**
 * Structure of a delayed message as stored in the wait queue
 * The original message is in the body, metadata is in headers
 */
export interface DelayedMessage {
    /** The original message payload */
    originalMessage: any;
    /** The original publication name to use when re-publishing */
    originalPublication: string;
    /** The original publication overrides */
    originalOverrides?: PublicationConfig;
    /** The delay in milliseconds */
    targetDelay: number;
    /** Timestamp when the message was created */
    createdAt: number;
    /** Number of retry attempts (for error handling) */
    retryCount?: number;
}

/**
 * Extended broker interface with delayed publish capabilities
 */
export interface DelayedPublishBroker extends BrokerAsPromised {
    /**
     * Publishes a message with a delay before it gets re-published
     *
     * @param publication - The original publication name to use when re-publishing
     * @param message - The message to publish
     * @param overrides - Optional publication configuration overrides
     * @param delay - Delay in milliseconds (uses defaultDelay if not specified)
     * @returns Promise that resolves when the message is published to the wait queue
     */
    delayedPublish(
        publication: string,
        message: any,
        overrides?: PublicationConfig,
        delay?: number
    ): Promise<void>;
}

/**
 * Standard delayed publish error codes
 */
export enum DelayedPublishErrorCode {
    /** Wait queue is full */
    QUEUE_FULL = "DELAYED_PUBLISH_QUEUE_FULL",
    /** Failed to re-publish message */
    REPUBLISH_FAILED = "DELAYED_PUBLISH_REPUBLISH_FAILED",
    /** Maximum retry attempts exceeded */
    MAX_RETRIES_EXCEEDED = "DELAYED_PUBLISH_MAX_RETRIES_EXCEEDED",
    /** Invalid delay value */
    INVALID_DELAY = "DELAYED_PUBLISH_INVALID_DELAY",
}

/**
 * Custom error class for delayed publish operations
 */
export class DelayedPublishError extends Error {
    public readonly code: DelayedPublishErrorCode;
    public readonly details?: any;

    constructor(code: DelayedPublishErrorCode, message: string, details?: any) {
        super(message);
        this.name = "DelayedPublishError";
        this.code = code;
        this.details = details;
    }
}
