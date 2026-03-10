/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerAsPromised } from "rascal";

// Rascal doesn't export its internal Message or AckOrNack types from the
// public API surface, so we alias them here. If Rascal ever ships proper
// type exports, these should be replaced with the real thing.
type Message = any;
type AckOrNack = (err?: Error, recovery?: any) => void;

/**
 * Handler function signature for subscription message processing.
 *
 * Handlers can be synchronous or asynchronous. If a handler returns a
 * `Promise`, rejected promises are caught by the middleware and the message
 * is automatically nacked. Synchronous throws are handled the same way.
 *
 * @param message - The raw Rascal message object (AMQP envelope + headers)
 * @param content - The parsed message body (Rascal handles deserialization)
 * @param ackOrNackFn - Call with no args to acknowledge, or pass an `Error`
 *   (and optional recovery options) to nack. See Rascal docs for recovery
 *   strategies like `{ strategy: "nack", requeue: false }`.
 * @param broker - The live `BrokerAsPromised` instance, useful when a handler
 *   needs to publish a response or interact with other broker features.
 * @returns `void` or `Promise<void>`
 *
 * @example
 * ```ts
 * const handler: SubscriptionHandler = async (message, content, ackOrNack, broker) => {
 *     await processOrder(content);
 *     ackOrNack(); // acknowledge
 * };
 * ```
 */
export type SubscriptionHandler = (
    message: Message,
    content: any,
    ackOrNackFn: AckOrNack,
    broker: BrokerAsPromised
) => Promise<void> | void;

/**
 * Map of subscription names to their handler functions.
 *
 * Each key **must** exactly match a subscription name defined in the broker
 * topology. Mismatched keys are caught at validation time (fail-fast) so you
 * don't end up with dead handler code that silently never fires.
 *
 * @example
 * ```ts
 * const handlers: SubscriptionHandlers = {
 *     on_order_created: handleOrderCreated,
 *     on_payment_received: handlePayment,
 * };
 * ```
 */
export type SubscriptionHandlers = Record<string, SubscriptionHandler>;

/**
 * Result of validating subscription handlers against a broker topology.
 *
 * Returned by {@link validateSubscriptionHandlers}. When `isValid` is `false`,
 * `errorMessage` contains a human-readable summary suitable for logging or
 * throwing directly.
 *
 * @example
 * ```ts
 * const result = validateSubscriptionHandlers(topology, handlers);
 * if (!result.isValid) {
 *     console.error(result.errorMessage);
 *     console.log("Available subscriptions:", result.availableSubscriptions);
 * }
 * ```
 */
export interface ValidationResult {
    /** Whether all handler keys matched a topology subscription and all values are functions. */
    isValid: boolean;
    /** Handler keys that have no corresponding subscription in any vhost. */
    missingSubscriptions: string[];
    /** Every subscription name found across all vhosts in the topology. */
    availableSubscriptions: string[];
    /** Handler keys whose values are not functions (e.g. `undefined`, a string, etc.). */
    invalidHandlers: string[];
    /** Human-readable error summary, present only when `isValid` is `false`. */
    errorMessage?: string;
}
