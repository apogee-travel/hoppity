/* eslint-disable @typescript-eslint/no-explicit-any */
import { MiddlewareContext } from "@apogeelabs/hoppity";
import { BrokerAsPromised, PublicationConfig } from "rascal";
import { ZodError, ZodTypeAny } from "zod";
import { HandlerDeclaration, OperationsBroker } from "./types";
import { formatZodError } from "./utils";

interface WireHandlersOptions {
    validateInbound: boolean;
}

interface WireOutboundOptions {
    validateOutbound: boolean;
}

/**
 * Subscribes all event and command handlers declared in the middleware config.
 * Called from the onBrokerCreated callback — by this point the broker is live
 * and all topology artifacts exist.
 *
 * Fail-fast on subscription error — lets the hoppity pipeline shut down the broker
 * rather than leaving it partially wired.
 */
export async function wireHandlers(
    broker: BrokerAsPromised,
    handlers: HandlerDeclaration[],
    context: MiddlewareContext,
    options: WireHandlersOptions
): Promise<void> {
    const { validateInbound } = options;

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

                    const result = handler(parsed, {
                        broker: broker as OperationsBroker,
                    });

                    if (result instanceof Promise) {
                        await result;
                    }

                    // Auto-ack: handler returned (or resolved) without throwing
                    ackOrNack();
                } catch (error) {
                    if (error instanceof ZodError) {
                        context.logger.error(
                            `[Operations] Inbound validation failed for '${subscriptionName}': ${formatZodError(error)}`
                        );
                    } else {
                        context.logger.error(
                            `[Operations] Handler error for '${subscriptionName}':`,
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
                context.logger.warn(
                    `[Operations] Subscription error on '${subscriptionName}':`,
                    err
                );
            });

            subscription.on("invalid_content", (err, _message, ackOrNack) => {
                context.logger.warn(
                    `[Operations] Invalid content on subscription '${subscriptionName}':`,
                    err
                );
                // Nack without requeue — the message is malformed and can't be recovered
                // by retrying; send it to the dead-letter queue.
                ackOrNack(err, [{ strategy: "nack", requeue: false }]);
            });
        } catch (error) {
            context.logger.error(
                `[Operations] Failed to subscribe to '${subscriptionName}':`,
                error
            );
            throw error;
        }
    }
}

/**
 * Attaches publishEvent and sendCommand methods to the broker instance.
 *
 * Both methods resolve the publication name from the contract — no string
 * literals required at the call site.
 */
export function wireEventCommandOutbound(
    broker: BrokerAsPromised,
    options: WireOutboundOptions
): void {
    const { validateOutbound } = options;

    (broker as OperationsBroker).publishEvent = async function publishEvent<
        TSchema extends ZodTypeAny,
    >(
        contract: { schema: TSchema; publicationName: string },
        message: any,
        overrides?: PublicationConfig
    ): Promise<void> {
        if (validateOutbound) {
            contract.schema.parse(message);
        }
        await broker.publish(contract.publicationName, message, overrides);
    };

    (broker as OperationsBroker).sendCommand = async function sendCommand<
        TSchema extends ZodTypeAny,
    >(
        contract: { schema: TSchema; publicationName: string },
        message: any,
        overrides?: PublicationConfig
    ): Promise<void> {
        if (validateOutbound) {
            contract.schema.parse(message);
        }
        await broker.publish(contract.publicationName, message, overrides);
    };
}
