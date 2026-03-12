/**
 * Naming utilities for hoppity contracts.
 *
 * All topology artifact names are derived mechanically from domain + operation
 * metadata. Nothing is hard-coded by callers. These functions are the single
 * source of truth for the naming scheme.
 */

/**
 * Converts a camelCase (or PascalCase) string to snake_case.
 *
 * Handles consecutive capitals correctly so that acronyms like "HTTP" or "RPC"
 * collapse to a single lowercase segment rather than producing multiple
 * underscores: "getHTTPResponse" → "get_http_response".
 *
 * Already-snake-case input is returned unchanged (aside from lowercasing).
 */
export function toSnakeCase(value: string): string {
    // Insert a separator before any uppercase letter that is:
    //   (a) preceded by a lowercase letter or digit, OR
    //   (b) followed by a lowercase letter and preceded by another uppercase
    //       (handles the interior of acronyms like "HTTPResponse" → "http_response")
    return value
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
        .toLowerCase();
}

/**
 * Returns the RabbitMQ exchange name for a domain + operation type.
 *
 * Events and commands share a single topic exchange per domain.
 * RPC operations get their own exchange to keep request/reply mechanics
 * isolated from pub/sub routing.
 *
 * @example
 * getExchangeName("orders", "event")   // → "orders"
 * getExchangeName("orders", "command") // → "orders"
 * getExchangeName("orders", "rpc")     // → "orders_rpc"
 */
export function getExchangeName(
    domain: string,
    operationType: "event" | "command" | "rpc"
): string {
    return operationType === "rpc" ? `${domain}_rpc` : domain;
}

/**
 * Returns the topic routing key for a domain operation.
 *
 * @example
 * getRoutingKey("orders", "event", "orderCreated") // → "orders.event.order_created"
 * getRoutingKey("orders", "command", "cancelOrder") // → "orders.command.cancel_order"
 */
export function getRoutingKey(
    domain: string,
    operationType: string,
    operationName: string
): string {
    return `${domain}.${operationType}.${toSnakeCase(operationName)}`;
}

/**
 * Returns the queue name for a service consuming a domain operation.
 *
 * @example
 * getQueueName("catalog-service", "orders", "event", "orderCreated")
 *   // → "catalog-service_orders_event_order_created"
 */
export function getQueueName(
    service: string,
    domain: string,
    operationType: string,
    operationName: string
): string {
    return `${service}_${domain}_${operationType}_${toSnakeCase(operationName)}`;
}

/**
 * Returns the binding name for a given queue name.
 *
 * @example
 * getBindingName("catalog-service_orders_event_order_created")
 *   // → "catalog-service_orders_event_order_created_binding"
 */
export function getBindingName(queueName: string): string {
    return `${queueName}_binding`;
}

/**
 * Returns the publication name for a domain operation.
 *
 * This is the name used in `broker.publish(publicationName, message)`.
 *
 * @example
 * getPublicationName("orders", "event", "orderCreated")
 *   // → "orders_event_order_created"
 */
export function getPublicationName(
    domain: string,
    operationType: string,
    operationName: string
): string {
    return `${domain}_${operationType}_${toSnakeCase(operationName)}`;
}

/**
 * Returns the subscription name for a domain operation.
 *
 * This is the name used when attaching a message handler.
 *
 * @example
 * getSubscriptionName("orders", "event", "orderCreated")
 *   // → "orders_event_order_created"
 */
export function getSubscriptionName(
    domain: string,
    operationType: string,
    operationName: string
): string {
    return `${domain}_${operationType}_${toSnakeCase(operationName)}`;
}

/**
 * Returns the wait queue name for delayed delivery of a contract.
 *
 * Messages published with a delay are placed here with per-message TTL.
 * When TTL expires, RabbitMQ dead-letters them to the ready queue.
 *
 * Delayed delivery is scoped to the operation, not to the service — both the
 * consuming service (which creates the queue) and any publisher-only services
 * (which only need the wait publication) must reference the same queue name.
 *
 * @example
 * getDelayedWaitQueueName("orders", "event", "reminderDue")
 *   // → "orders_event_reminder_due_wait"
 */
export function getDelayedWaitQueueName(
    domain: string,
    operationType: string,
    operationName: string
): string {
    return `${domain}_${operationType}_${toSnakeCase(operationName)}_wait`;
}

/**
 * Returns the ready queue name for delayed delivery of a contract.
 *
 * Dead-lettered messages from the wait queue land here and are re-published
 * to the original destination by the ready queue subscriber.
 *
 * Scoped to the operation, not the service — see getDelayedWaitQueueName.
 *
 * @example
 * getDelayedReadyQueueName("orders", "event", "reminderDue")
 *   // → "orders_event_reminder_due_ready"
 */
export function getDelayedReadyQueueName(
    domain: string,
    operationType: string,
    operationName: string
): string {
    return `${domain}_${operationType}_${toSnakeCase(operationName)}_ready`;
}

/**
 * Returns the error queue name for delayed delivery of a contract.
 *
 * Messages that exhaust all re-publish retry attempts are routed here for
 * manual inspection, replay, or alerting.
 *
 * Scoped to the operation, not the service — see getDelayedWaitQueueName.
 *
 * @example
 * getDelayedErrorQueueName("orders", "event", "reminderDue")
 *   // → "orders_event_reminder_due_errors"
 */
export function getDelayedErrorQueueName(
    domain: string,
    operationType: string,
    operationName: string
): string {
    return `${domain}_${operationType}_${toSnakeCase(operationName)}_errors`;
}

/**
 * Returns the wait publication name for delayed delivery of a contract.
 *
 * This is the Rascal publication name used to send a message to the wait queue.
 *
 * @example
 * getDelayedWaitPublicationName("orders", "event", "reminderDue")
 *   // → "orders_event_reminder_due_delayed"
 */
export function getDelayedWaitPublicationName(
    domain: string,
    operationType: string,
    operationName: string
): string {
    return `${domain}_${operationType}_${toSnakeCase(operationName)}_delayed`;
}

/**
 * Returns the ready subscription name for delayed delivery of a contract.
 *
 * This is the Rascal subscription name used to consume from the ready queue.
 *
 * @example
 * getDelayedReadySubscriptionName("orders", "event", "reminderDue")
 *   // → "orders_event_reminder_due_ready"
 */
export function getDelayedReadySubscriptionName(
    domain: string,
    operationType: string,
    operationName: string
): string {
    return `${domain}_${operationType}_${toSnakeCase(operationName)}_ready`;
}
