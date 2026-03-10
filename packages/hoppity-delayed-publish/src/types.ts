/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerAsPromised, PublicationConfig } from "rascal";

/**
 * Configuration options for the delayed publish middleware.
 *
 * Controls queue naming, TTL defaults, retry behavior, and durability for the
 * delayed publish infrastructure that gets added to every vhost in your topology.
 *
 * Queue names are derived from `serviceName`:
 * - `{serviceName}_wait` — holds messages until their per-message TTL expires
 * - `{serviceName}_ready` — receives dead-lettered messages for re-publishing
 * - `{serviceName}_delayed_errors` — collects messages that exhaust all retries
 *
 * @example
 * ```typescript
 * const options: DelayedPublishOptions = {
 *     serviceName: "notification-svc",
 *     instanceId: randomUUID(),
 *     defaultDelay: 60_000,  // 1 minute
 *     maxRetries: 3,
 *     retryDelay: 2_000,     // 2 seconds between retry attempts
 *     durable: true,
 * };
 * ```
 *
 * @see {@link withDelayedPublish} — the middleware factory that consumes these options
 * @see {@link DelayedPublishBroker} — the extended broker interface produced by the middleware
 */
export interface DelayedPublishOptions {
    /**
     * The name of the service. Used as the prefix for all queue, publication,
     * and subscription names created by the middleware.
     *
     * Must be a non-empty, non-whitespace string.
     */
    serviceName: string;
    /**
     * Unique identifier for this service instance. Used for queue naming to
     * prevent conflicts when multiple instances of the same service are running.
     *
     * Must be a non-empty, non-whitespace string. Typically a `randomUUID()`.
     */
    instanceId: string;
    /**
     * Default delay in milliseconds applied when `delayedPublish()` is called
     * without an explicit `delay` argument.
     *
     * @defaultValue `30_000` (30 seconds)
     */
    defaultDelay?: number;
    /**
     * Maximum number of retry attempts when re-publishing a message from the
     * ready queue fails. After exhausting retries, the message is routed to
     * the error queue (`{serviceName}_delayed_errors`).
     *
     * @defaultValue `5`
     */
    maxRetries?: number;
    /**
     * Delay in milliseconds between retry attempts. Retries are implemented by
     * re-publishing the message back to the wait queue with this value as the
     * per-message TTL, avoiding tight retry loops.
     *
     * @defaultValue `1_000` (1 second)
     */
    retryDelay?: number;
    /**
     * Controls both queue durability and message persistence. When `true`,
     * queues survive broker restarts and messages are written to disk.
     * Set to `false` for non-persistent queues in dev/test environments.
     *
     * @defaultValue `true`
     */
    durable?: boolean;
}

/**
 * Envelope structure wrapping a delayed message in the wait queue.
 *
 * When `delayedPublish()` is called, the original message payload is wrapped in
 * this envelope along with routing metadata (publication name, overrides) and
 * timing information. The envelope travels through the wait queue -> dead letter ->
 * ready queue pipeline, where it is unwrapped and the original message is
 * re-published to its intended destination.
 *
 * @example
 * ```typescript
 * // You typically don't construct this yourself — delayedPublish() does it.
 * // But if inspecting the wait or error queue contents:
 * const msg: DelayedMessage = {
 *     originalMessage: { orderId: "abc-123" },
 *     originalPublication: "process_order",
 *     targetDelay: 5000,
 *     createdAt: Date.now(),
 *     retryCount: 0,
 * };
 * ```
 *
 * @see {@link DelayedPublishBroker.delayedPublish} — creates and publishes this envelope
 */
export interface DelayedMessage {
    /** The original message payload passed to `delayedPublish()`. */
    originalMessage: any;
    /**
     * The Rascal publication name to use when re-publishing the message
     * after the delay expires. Must reference a publication already defined
     * in the broker topology.
     */
    originalPublication: string;
    /** Optional Rascal `PublicationConfig` overrides passed to `delayedPublish()`. */
    originalOverrides?: PublicationConfig;
    /** The intended delay in milliseconds (used as the per-message TTL on the wait queue). */
    targetDelay: number;
    /** Unix timestamp (ms) when `delayedPublish()` was called. Useful for observability. */
    createdAt: number;
    /**
     * Number of re-publish retry attempts that have occurred so far.
     * Starts at `0` and increments on each failed re-publish attempt.
     * When this reaches `maxRetries`, the message is routed to the error queue.
     *
     * @defaultValue `0`
     */
    retryCount?: number;
}

/**
 * Extended broker interface that adds the `delayedPublish()` method to
 * Rascal's `BrokerAsPromised`.
 *
 * Since hoppity middleware extends the broker at runtime via monkey-patching,
 * the `build()` return type is `BrokerAsPromised`. Cast the result to
 * `DelayedPublishBroker` to access the delayed publish API.
 *
 * @example
 * ```typescript
 * import type { DelayedPublishBroker } from "@apogeelabs/hoppity-delayed-publish";
 *
 * const broker = (await hoppity
 *     .withTopology(topology)
 *     .use(withDelayedPublish({ serviceName: "svc", instanceId: randomUUID() }))
 *     .build()) as DelayedPublishBroker;
 *
 * await broker.delayedPublish("my_publication", payload, undefined, 5_000);
 * ```
 *
 * @see {@link DelayedPublishOptions} — configuration consumed by the middleware
 */
export interface DelayedPublishBroker extends BrokerAsPromised {
    /**
     * Publishes a message with a delay before it gets re-published to its
     * original destination.
     *
     * Under the hood this wraps the message in a {@link DelayedMessage} envelope
     * and publishes it to the wait queue with a per-message TTL equal to the
     * delay. When the TTL expires, RabbitMQ dead-letters the message to the
     * ready queue, where it is unwrapped and re-published.
     *
     * @param publication - Name of an existing Rascal publication in the topology.
     *   This is where the message will be re-published after the delay.
     * @param message - The message payload (any serializable value).
     * @param overrides - Optional Rascal `PublicationConfig` overrides forwarded
     *   to the re-publish call.
     * @param delay - Delay in milliseconds. Falls back to `defaultDelay` from
     *   {@link DelayedPublishOptions} if omitted.
     * @returns Promise that resolves when the message is accepted by the wait queue
     *   (not when it is eventually re-published).
     * @throws {@link DelayedPublishError} with code `INVALID_DELAY` if delay is <= 0.
     * @throws {@link DelayedPublishError} with code `QUEUE_FULL` if publishing to
     *   the wait queue fails.
     */
    delayedPublish(
        publication: string,
        message: any,
        overrides?: PublicationConfig,
        delay?: number
    ): Promise<void>;
}

/**
 * Error codes for delayed publish operations.
 *
 * Each code maps to a specific failure mode in the delayed publish pipeline.
 * These are set on {@link DelayedPublishError.code} and can be used for
 * programmatic error handling.
 *
 * @example
 * ```typescript
 * try {
 *     await broker.delayedPublish("pub", msg, undefined, -1);
 * } catch (err) {
 *     if (err instanceof DelayedPublishError
 *         && err.code === DelayedPublishErrorCode.INVALID_DELAY) {
 *         // handle invalid delay
 *     }
 * }
 * ```
 */
export enum DelayedPublishErrorCode {
    /** Publishing to the wait queue failed (e.g., connection loss, channel error). */
    QUEUE_FULL = "DELAYED_PUBLISH_QUEUE_FULL",
    /** Re-publishing the message from the ready queue to its original destination failed. */
    REPUBLISH_FAILED = "DELAYED_PUBLISH_REPUBLISH_FAILED",
    /** All retry attempts exhausted; the message has been routed to the error queue. */
    MAX_RETRIES_EXCEEDED = "DELAYED_PUBLISH_MAX_RETRIES_EXCEEDED",
    /** The delay value was zero or negative. */
    INVALID_DELAY = "DELAYED_PUBLISH_INVALID_DELAY",
}

/**
 * Structured error class for delayed publish operations.
 *
 * Every error includes a machine-readable {@link DelayedPublishErrorCode} and
 * an optional `details` bag with contextual information (original error,
 * retry count, publication name, etc.).
 *
 * @example
 * ```typescript
 * try {
 *     await broker.delayedPublish("pub", msg);
 * } catch (err) {
 *     if (err instanceof DelayedPublishError) {
 *         console.error(err.code, err.details);
 *     }
 * }
 * ```
 *
 * @see {@link DelayedPublishErrorCode} — the set of possible error codes
 */
export class DelayedPublishError extends Error {
    /** Machine-readable error code identifying the failure mode. */
    public readonly code: DelayedPublishErrorCode;
    /**
     * Optional contextual details about the failure. Shape varies by error code
     * but typically includes `originalError`, `retryCount`, `maxRetries`,
     * `originalPublication`, `targetDelay`, and `createdAt`.
     */
    public readonly details?: any;

    constructor(code: DelayedPublishErrorCode, message: string, details?: any) {
        super(message);
        this.name = "DelayedPublishError";
        this.code = code;
        this.details = details;
    }
}
