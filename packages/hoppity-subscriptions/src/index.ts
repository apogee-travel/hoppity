/**
 * @module @apogeelabs/hoppity-subscriptions
 *
 * Hoppity middleware that validates and auto-wires RabbitMQ subscription
 * handlers to a Rascal broker. Ensures every handler key maps to a real
 * subscription in the topology (fail-fast), then attaches message, error,
 * and invalid-content listeners during the `onBrokerCreated` callback phase.
 *
 * Should be the **last** middleware in the pipeline so it validates against
 * the fully-assembled topology.
 */
export type { SubscriptionHandler, SubscriptionHandlers, ValidationResult } from "./types";

export { validateSubscriptionHandlers } from "./validation";
export { withSubscriptions } from "./withSubscriptions";
