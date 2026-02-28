# @apogeelabs/hoppity-subscriptions — LLM Usage Guide

Auto-wires subscription handlers to a Rascal broker with topology validation.

## Imports

```typescript
import { withSubscriptions } from "@apogeelabs/hoppity-subscriptions";
import { validateSubscriptionHandlers } from "@apogeelabs/hoppity-subscriptions";
import type {
    SubscriptionHandler,
    SubscriptionHandlers,
    ValidationResult,
} from "@apogeelabs/hoppity-subscriptions";
```

## Type Signatures

```typescript
// Handler receives raw message, parsed content, ack/nack function, and broker instance
type SubscriptionHandler = (
    message: any, // Rascal message object
    content: any, // Parsed message content
    ackOrNackFn: (err?: Error, recovery?: any) => void, // Acknowledge or reject
    broker: BrokerAsPromised // Broker instance
) => Promise<void> | void;

// Map of subscription names to handler functions
type SubscriptionHandlers = Record<string, SubscriptionHandler>;

interface ValidationResult {
    isValid: boolean;
    missingSubscriptions: string[]; // Handler keys with no matching subscription
    availableSubscriptions: string[]; // Subscription names found in topology
    invalidHandlers: string[]; // Handler keys that are not functions
    errorMessage?: string;
}
```

### Function Signatures

```typescript
// Middleware factory — validates and auto-wires handlers
function withSubscriptions(handlers: SubscriptionHandlers): MiddlewareFunction;

// Standalone validation — check handlers without going through the pipeline
function validateSubscriptionHandlers(
    topology: BrokerConfig,
    handlers: SubscriptionHandlers
): ValidationResult;
```

## Usage Examples

### Basic subscription handling

```typescript
import hoppity from "@apogeelabs/hoppity";
import { withSubscriptions, SubscriptionHandler } from "@apogeelabs/hoppity-subscriptions";

const handleOrder: SubscriptionHandler = async (message, content, ackOrNack, broker) => {
    try {
        console.log("Order received:", content);
        // Process the order...
        ackOrNack(); // Acknowledge
    } catch (err) {
        ackOrNack(err as Error); // Reject
    }
};

// "on_order" must be a subscription name defined in the topology
const broker = await hoppity
    .withTopology(topology)
    .use(withSubscriptions({ on_order: handleOrder }))
    .build();
```

### Multiple subscriptions

```typescript
const broker = await hoppity
    .withTopology(topology)
    .use(
        withSubscriptions({
            on_order_created: handleOrderCreated,
            on_order_cancelled: handleOrderCancelled,
            on_payment_received: handlePayment,
        })
    )
    .build();
```

### Standalone validation

```typescript
import { validateSubscriptionHandlers } from "@apogeelabs/hoppity-subscriptions";

const result = validateSubscriptionHandlers(topology, handlers);
if (!result.isValid) {
    console.error(result.errorMessage);
    console.log("Available:", result.availableSubscriptions);
    console.log("Missing:", result.missingSubscriptions);
    console.log("Invalid:", result.invalidHandlers);
}
```

## How It Works

1. **Validation phase** (during middleware execution): Calls `validateSubscriptionHandlers()` to check that every key in `handlers` matches a subscription name in the topology, and every value is a function. Throws immediately if validation fails (fail-fast).

2. **Broker creation phase** (via `onBrokerCreated` callback): For each handler key:
    - Calls `broker.subscribe(subscriptionName)` to get a subscription object
    - Attaches three event listeners:
        - `"message"` — calls the handler with `(message, content, ackOrNack, broker)`
        - `"error"` — logs subscription errors as warnings
        - `"invalid_content"` — logs invalid content as warnings

3. **Async handler support**: If the handler returns a Promise, errors are caught and the message is nacked. Sync handlers are wrapped in try/catch with the same behavior.

4. **Context tracking**: Stores validated subscription names in `context.data.validatedSubscriptions` for downstream middleware.

## Gotchas

- ⚠️ **Handler keys must exactly match subscription names** — `"order_created"` will fail if the topology has `"on_order_created"`. The validation error message lists available subscription names.
- ⚠️ **Topology must be finalized before subscriptions** — if other middleware adds subscriptions to the topology (like RPC or delayed-publish), those middleware must run first. Put `withSubscriptions` last in the chain.
- ⚠️ **Handler has 4 parameters** — `(message, content, ackOrNack, broker)`. The `broker` is the 4th argument and is often needed for publishing responses.
- ⚠️ **`ackOrNack()` with no args = acknowledge** — call with an error to nack: `ackOrNack(new Error("..."))`. You can also pass recovery options as the second arg: `ackOrNack(err, { strategy: "nack", requeue: false })`.
- ⚠️ **Unhandled errors nack the message** — if your handler throws and you didn't call `ackOrNack`, the middleware catches the error and calls `ackOrNack(error)` for you. But you lose control over the recovery strategy.
- ⚠️ **Validation checks across all vhosts** — subscription names from all vhosts are collected. If you have the same subscription name in multiple vhosts, it counts as available.
