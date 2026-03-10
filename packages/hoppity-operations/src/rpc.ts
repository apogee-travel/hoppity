/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger, MiddlewareContext } from "@apogeelabs/hoppity";
import { BrokerAsPromised, PublicationConfig } from "rascal";
import { randomUUID } from "crypto";
import { ZodError } from "zod";
import { CorrelationManager } from "./correlationManager";
import {
    HandlerDeclaration,
    OperationsBroker,
    RpcErrorCode,
    RpcHandlerDeclaration,
    RpcRequest,
    RpcResponse,
} from "./types";
import { formatZodError } from "./utils";

interface WireRpcOutboundOptions {
    serviceName: string;
    instanceId: string;
    replyQueueName: string;
    handlers: RpcHandlerDeclaration[];
    correlationManager: CorrelationManager;
    defaultTimeout: number;
    validateInbound: boolean;
    validateOutbound: boolean;
    logger: Logger;
}

/**
 * Subscribes all RPC responder handlers declared in the middleware config.
 *
 * For each onRpc declaration, subscribes to the contract's subscriptionName.
 * On message: parses the RpcRequest envelope, validates the payload optionally,
 * calls the handler, then publishes an RpcResponse to rpc_reply.
 */
export async function wireRpcHandlers(
    broker: BrokerAsPromised,
    handlers: HandlerDeclaration[],
    context: MiddlewareContext,
    options: { validateInbound: boolean }
): Promise<void> {
    const { validateInbound } = options;

    for (const declaration of handlers) {
        if (declaration._kind !== "rpc") {
            continue;
        }

        const { contract, handler } = declaration;
        const { subscriptionName } = contract;

        try {
            const subscription = await broker.subscribe(subscriptionName);

            subscription.on("message", async (_message, content, ackOrNack) => {
                const request = content as RpcRequest;
                const { correlationId, replyTo, payload } = request;

                try {
                    let parsedPayload = payload;

                    if (validateInbound) {
                        try {
                            parsedPayload = contract.requestSchema.parse(payload);
                        } catch (validationError) {
                            if (validationError instanceof ZodError) {
                                context.logger.error(
                                    `[Operations] RPC inbound validation failed for '${subscriptionName}': ${formatZodError(validationError)}`
                                );
                            }
                            throw validationError;
                        }
                    }

                    const result = await handler(parsedPayload, {
                        broker: broker as OperationsBroker,
                    });

                    await broker.publish(
                        "rpc_reply",
                        {
                            correlationId,
                            payload: result,
                        } as RpcResponse,
                        {
                            routingKey: replyTo,
                            options: { mandatory: false },
                        }
                    );

                    ackOrNack();
                } catch (error) {
                    context.logger.error(
                        `[Operations] RPC handler error for '${subscriptionName}':`,
                        error
                    );

                    try {
                        await broker.publish(
                            "rpc_reply",
                            {
                                correlationId,
                                error: {
                                    code: RpcErrorCode.HANDLER_ERROR,
                                    message:
                                        error instanceof Error ? error.message : "Unknown error",
                                },
                            } as RpcResponse,
                            {
                                routingKey: replyTo,
                                options: { mandatory: false },
                            }
                        );
                    } catch (publishError) {
                        context.logger.error(
                            `[Operations] Failed to publish RPC error response for '${subscriptionName}':`,
                            publishError
                        );
                    }

                    ackOrNack();
                }
            });

            subscription.on("error", err => {
                context.logger.warn(
                    `[Operations] RPC subscription error on '${subscriptionName}':`,
                    err
                );
            });

            subscription.on("invalid_content", (err, _message, ackOrNack) => {
                context.logger.warn(
                    `[Operations] Invalid content on RPC subscription '${subscriptionName}':`,
                    err
                );
                ackOrNack(err, [{ strategy: "nack", requeue: false }]);
            });
        } catch (error) {
            context.logger.error(
                `[Operations] Failed to subscribe to RPC '${subscriptionName}':`,
                error
            );
            throw error;
        }
    }
}

/**
 * Wires RPC outbound capabilities onto the broker:
 * - Sets up the reply queue subscription for correlation resolution
 * - Attaches broker.request() — publishes RpcRequest envelope and returns a
 *   promise that resolves when the matching RpcResponse arrives
 * - Attaches broker.cancelRequest()
 * - Wraps broker.shutdown() to clean up pending requests
 *
 * Async so that a failed reply queue subscription propagates to onBrokerCreated
 * and causes the pipeline to fail-fast rather than silently hanging every request.
 */
export async function wireRpcOutbound(
    broker: BrokerAsPromised,
    options: WireRpcOutboundOptions
): Promise<void> {
    const {
        serviceName,
        instanceId,
        replyQueueName,
        correlationManager,
        defaultTimeout,
        validateInbound,
        validateOutbound,
        logger,
    } = options;

    // Subscribe to reply queue — any pending request whose correlationId matches
    // an arriving response gets resolved or rejected here.
    // Awaiting here means a missing reply queue (topology phase skipped or misconfigured)
    // surfaces immediately rather than causing silent hangs in broker.request().
    const replySubscription = await broker.subscribe(`${replyQueueName}_subscription`);

    replySubscription.on("message", (_message, content, ackOrNack) => {
        try {
            const response = content as RpcResponse;

            if (response.error) {
                correlationManager.rejectRequest(
                    response.correlationId,
                    new Error(response.error.message)
                );
            } else {
                correlationManager.resolveRequest(response.correlationId, response.payload);
            }

            ackOrNack();
        } catch (error) {
            logger.error("[Operations] Error processing RPC reply:", error);
            ackOrNack(error instanceof Error ? error : new Error(String(error)));
        }
    });

    replySubscription.on("error", err => {
        logger.error("[Operations] Reply subscription error:", err);
    });

    (broker as OperationsBroker).request = async function request<
        TReq extends { parse: (v: any) => any },
        TRes extends { parse: (v: any) => any },
    >(
        contract: {
            publicationName: string;
            requestSchema: TReq;
            responseSchema: TRes;
            _domain: string;
            _name: string;
        },
        message: any,
        overrides?: PublicationConfig
    ): Promise<any> {
        if (validateOutbound) {
            contract.requestSchema.parse(message);
        }

        const correlationId = randomUUID();
        const requestPromise = correlationManager.addRequest(correlationId, defaultTimeout);

        await broker.publish(
            contract.publicationName,
            {
                correlationId,
                rpcName: `${contract._domain}.${contract._name}`,
                payload: message,
                replyTo: replyQueueName,
                headers: {
                    "service-name": serviceName,
                    "instance-id": instanceId,
                },
            } as RpcRequest,
            {
                options: { persistent: false },
                ...overrides,
            }
        );

        const response = await requestPromise;

        if (validateInbound) {
            return contract.responseSchema.parse(response);
        }

        return response;
    };

    (broker as OperationsBroker).cancelRequest = (correlationId: string): boolean => {
        return correlationManager.cancelRequest(correlationId);
    };

    // Drain pending requests before the broker goes away, so callers don't hang.
    const originalShutdown = broker.shutdown.bind(broker);
    broker.shutdown = async () => {
        correlationManager.cleanup();
        await originalShutdown();
    };
}
