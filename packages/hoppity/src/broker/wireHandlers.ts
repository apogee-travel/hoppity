/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerAsPromised } from "rascal";
import { ZodError } from "zod";
import { MiddlewareContext } from "../types";
import { HandlerDeclaration, HandlerContextBroker } from "../handlers/types";
import { Interceptor, InboundMetadata } from "../interceptors/types";
import { composeInboundWrappers } from "../interceptors/compose";

interface WireHandlersOptions {
    validateInbound: boolean;
    interceptors?: Interceptor[];
}

/**
 * Formats a ZodError into a human-readable string for log output.
 */
function formatZodError(error: ZodError): string {
    return error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
}

/**
 * Subscribes all event and command handlers to their derived queues.
 * Called from the onBrokerCreated callback — by this point the broker is live
 * and all topology artifacts exist.
 *
 * When interceptors are provided, the handler is wrapped per-message via
 * composeInboundWrappers. Composition happens per-message because InboundMetadata
 * includes per-message headers extracted from the raw AMQP message.
 *
 * Fail-fast on subscription error — lets the ServiceBuilder pipeline shut down
 * the broker rather than leaving it partially wired.
 */
export async function wireHandlers(
    broker: BrokerAsPromised,
    handlers: HandlerDeclaration[],
    context: MiddlewareContext,
    options: WireHandlersOptions
): Promise<void> {
    const { validateInbound, interceptors = [] } = options;

    for (const declaration of handlers) {
        if (declaration._kind !== "event" && declaration._kind !== "command") {
            continue;
        }

        const { contract, handler } = declaration;
        const { subscriptionName } = contract;

        try {
            const subscription = await broker.subscribe(subscriptionName);

            subscription.on("message", async (message, content, ackOrNack) => {
                try {
                    let parsed = content;

                    if (validateInbound) {
                        parsed = (contract as any).schema.parse(content);
                    }

                    // Build per-message metadata so interceptors can access headers
                    // for trace context extraction and other propagated data.
                    const metadata: InboundMetadata = {
                        contract,
                        kind: declaration._kind,
                        serviceName: context.serviceName ?? "",
                        message: {
                            headers: (message as any)?.properties?.headers ?? {},
                            properties: (message as any)?.properties ?? {},
                        },
                    };

                    // Compose wrappers per-message (Approach A from the build plan).
                    // Overhead is negligible — 1-3 function wrappers vs AMQP I/O.
                    const wrappedHandler = composeInboundWrappers(
                        async (payload, ctx) => handler(payload, ctx),
                        interceptors,
                        metadata
                    );

                    await wrappedHandler(parsed, {
                        broker: broker as HandlerContextBroker,
                    });

                    // Auto-ack: handler returned (or resolved) without throwing
                    ackOrNack();
                } catch (error) {
                    if (error instanceof ZodError) {
                        context.logger.error(
                            `[Hoppity] Inbound validation failed for '${subscriptionName}': ${formatZodError(error)}`
                        );
                    } else {
                        context.logger.error(
                            `[Hoppity] Handler error for '${subscriptionName}':`,
                            error
                        );
                    }
                    // Nack without requeue — dead-letter rather than loop forever on
                    // deterministic errors (validation failures, handler bugs, etc.)
                    ackOrNack(error instanceof Error ? error : new Error(String(error)), [
                        { strategy: "nack", requeue: false },
                    ]);
                }
            });

            subscription.on("error", err => {
                context.logger.warn(`[Hoppity] Subscription error on '${subscriptionName}':`, err);
            });

            subscription.on("invalid_content", (err, _message, ackOrNack) => {
                context.logger.warn(
                    `[Hoppity] Invalid content on subscription '${subscriptionName}':`,
                    err
                );
                // Nack without requeue — the message is malformed and can't be recovered
                ackOrNack(err, [{ strategy: "nack", requeue: false }]);
            });
        } catch (error) {
            context.logger.error(`[Hoppity] Failed to subscribe to '${subscriptionName}':`, error);
            throw error;
        }
    }
}
