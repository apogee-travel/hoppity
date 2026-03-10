import { BrokerConfig } from "rascal";
import { SubscriptionHandlers, ValidationResult } from "./types";

/**
 * Extracts subscription names from a broker topology configuration.
 *
 * @param topology - The broker topology configuration
 * @returns Array of subscription names found across all vhosts
 */
function extractSubscriptionNames(topology: BrokerConfig): string[] {
    const subscriptionNames: string[] = [];

    if (topology.vhosts) {
        // Collect subscription names from every vhost, not just "/".
        // A single Rascal topology can define multiple vhosts, and a handler
        // may target a subscription in any of them. Gathering them all into
        // one flat list lets validation work regardless of vhost layout.
        for (const vhostName in topology.vhosts) {
            const vhost = topology.vhosts[vhostName];
            if (vhost.subscriptions) {
                subscriptionNames.push(...Object.keys(vhost.subscriptions));
            }
        }
    }

    return subscriptionNames;
}

/**
 * Validates subscription handlers against the broker topology.
 *
 * This function performs the following validations:
 * 1. Checks that all handler keys have matching subscriptions in the topology
 * 2. Validates that all handlers are functions
 *
 * @param topology - The broker topology configuration
 * @param handlers - The subscription handlers object
 * @returns ValidationResult with detailed validation information
 */
export function validateSubscriptionHandlers(
    topology: BrokerConfig,
    handlers: SubscriptionHandlers
): ValidationResult {
    const availableSubscriptions = extractSubscriptionNames(topology);
    const handlerKeys = Object.keys(handlers);

    const missingSubscriptions: string[] = [];
    const invalidHandlers: string[] = [];

    // Detect handler keys that don't correspond to any subscription in the
    // topology. This is the primary fail-fast check: a typo in a handler key
    // (e.g. "order_created" vs "on_order_created") would otherwise result in
    // dead handler code that silently never fires — the kind of bug that only
    // surfaces in production when messages pile up unprocessed.
    for (const handlerKey of handlerKeys) {
        if (!availableSubscriptions.includes(handlerKey)) {
            missingSubscriptions.push(handlerKey);
        }
    }

    // Check for invalid handlers (not functions)
    for (const handlerKey of handlerKeys) {
        const handler = handlers[handlerKey];
        if (typeof handler !== "function") {
            invalidHandlers.push(handlerKey);
        }
    }

    // Determine if validation passed
    const isValid = missingSubscriptions.length === 0 && invalidHandlers.length === 0;

    // Build error message if validation failed
    let errorMessage: string | undefined;
    if (!isValid) {
        const errors: string[] = [];

        if (missingSubscriptions.length > 0) {
            errors.push(`Missing subscriptions: ${missingSubscriptions.join(", ")}`);
        }

        if (invalidHandlers.length > 0) {
            errors.push(`Invalid handlers (not functions): ${invalidHandlers.join(", ")}`);
        }

        errorMessage = `Subscription validation failed: ${errors.join("; ")}. Available subscriptions: ${availableSubscriptions.join(", ")}`;
    }

    return {
        isValid,
        missingSubscriptions,
        availableSubscriptions,
        invalidHandlers,
        errorMessage,
    };
}
