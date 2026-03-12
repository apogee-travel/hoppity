/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerAsPromised, PublicationConfig } from "rascal";
import { randomUUID } from "crypto";
import { ZodError } from "zod";
import { Logger, MiddlewareContext } from "../types";
import { HandlerDeclaration, HandlerContextBroker } from "../handlers/types";
import { CorrelationManager } from "./correlationManager";
import { ServiceBroker } from "./types";
import { Interceptor, InboundMetadata, OutboundMetadata } from "../interceptors/types";
import { composeInboundWrappers, composeOutboundWrappers } from "../interceptors/compose";

// RPC wire formats — preserved from hoppity-operations for interoperability
export interface RpcRequest {
    correlationId: string;
    rpcName: string;
    payload: any;
    replyTo: string;
    headers?: Record<string, any>;
}

export interface RpcResponse {
    correlationId: string;
    payload?: any;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

export const RpcErrorCode = {
    HANDLER_ERROR: "RPC_HANDLER_ERROR",
    TIMEOUT: "RPC_TIMEOUT",
    CANCELLED: "RPC_CANCELLED",
} as const;

export type RpcErrorCodeValue = (typeof RpcErrorCode)[keyof typeof RpcErrorCode];

/**
 * Typed error for RPC failures. Preserves the error code from the responder
 * so callers can distinguish handler errors from timeouts and cancellations.
 */
export class RpcError extends Error {
    readonly code: RpcErrorCodeValue | string;

    constructor(message: string, code: RpcErrorCodeValue | string) {
        super(message);
        this.name = "RpcError";
        this.code = code;
    }
}

interface WireRpcHandlersOptions {
    validateInbound: boolean;
    interceptors?: Interceptor[];
}

interface WireRpcOutboundOptions {
    serviceName: string;
    instanceId: string;
    replyQueueName: string;
    correlationManager: CorrelationManager;
    defaultTimeout: number;
    validateInbound: boolean;
    validateOutbound: boolean;
    logger: Logger;
    interceptors?: Interceptor[];
}

/**
 * Formats a ZodError into a human-readable string for log output.
 */
function formatZodError(error: ZodError): string {
    return error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
}

/**
 * Subscribes all RPC responder handlers declared in the service config.
 *
 * For each onRpc declaration, subscribes to the contract's subscriptionName.
 * On message: parses the RpcRequest envelope, validates the payload optionally,
 * calls the handler (wrapped with interceptors if provided), then publishes
 * an RpcResponse to rpc_reply.
 *
 * The interceptor wrapper sees the unwrapped request payload (after RpcRequest
 * envelope extraction) — same shape as event/command handler wrappers.
 */
export async function wireRpcHandlers(
    broker: BrokerAsPromised,
    handlers: HandlerDeclaration[],
    context: MiddlewareContext,
    options: WireRpcHandlersOptions
): Promise<void> {
    const { validateInbound, interceptors = [] } = options;

    for (const declaration of handlers) {
        if (declaration._kind !== "rpc") {
            continue;
        }

        const { contract, handler } = declaration;
        const { subscriptionName } = contract;

        try {
            const subscription = await broker.subscribe(subscriptionName);

            subscription.on("message", async (message, content, ackOrNack) => {
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
                                    `[Hoppity] RPC inbound validation failed for '${subscriptionName}': ${formatZodError(validationError)}`
                                );
                            }
                            throw validationError;
                        }
                    }

                    // Build per-message metadata for interceptors — RPC kind so wrappers
                    // can distinguish responder invocations from event/command handlers.
                    const metadata: InboundMetadata = {
                        contract,
                        kind: "rpc",
                        serviceName: context.serviceName ?? "",
                        message: {
                            headers: (message as any)?.properties?.headers ?? {},
                            properties: (message as any)?.properties ?? {},
                        },
                    };

                    const wrappedHandler = composeInboundWrappers(
                        async (rpcPayload, ctx) => handler(rpcPayload, ctx),
                        interceptors,
                        metadata
                    );

                    const result = await wrappedHandler(parsedPayload, {
                        broker: broker as HandlerContextBroker,
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
                        `[Hoppity] RPC handler error for '${subscriptionName}':`,
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
                            `[Hoppity] Failed to publish RPC error response for '${subscriptionName}':`,
                            publishError
                        );
                    }

                    ackOrNack();
                }
            });

            subscription.on("error", err => {
                context.logger.warn(
                    `[Hoppity] RPC subscription error on '${subscriptionName}':`,
                    err
                );
            });

            subscription.on("invalid_content", (err, _message, ackOrNack) => {
                context.logger.warn(
                    `[Hoppity] Invalid content on RPC subscription '${subscriptionName}':`,
                    err
                );
                ackOrNack(err, [{ strategy: "nack", requeue: false }]);
            });
        } catch (error) {
            context.logger.error(
                `[Hoppity] Failed to subscribe to RPC '${subscriptionName}':`,
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
 * - Wraps broker.shutdown() to clean up pending requests before shutdown
 *
 * When interceptors are provided, outbound wrappers are composed per-call
 * around the RPC publish. The wrapper sees the RpcRequest envelope publish —
 * same pattern as publishEvent/sendCommand. Response processing (reply queue
 * correlation resolution) is internal plumbing and is not intercepted.
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
        interceptors = [],
    } = options;

    // Subscribe to reply queue — any pending request whose correlationId matches
    // an arriving response gets resolved or rejected here.
    const replySubscription = await broker.subscribe(`${replyQueueName}_subscription`);

    replySubscription.on("message", (_message, content, ackOrNack) => {
        try {
            const response = content as RpcResponse;

            if (response.error) {
                correlationManager.rejectRequest(
                    response.correlationId,
                    new RpcError(response.error.message, response.error.code)
                );
            } else {
                correlationManager.resolveRequest(response.correlationId, response.payload);
            }

            ackOrNack();
        } catch (error) {
            logger.error("[Hoppity] Error processing RPC reply:", error);
            ackOrNack(error instanceof Error ? error : new Error(String(error)));
        }
    });

    replySubscription.on("error", err => {
        logger.error("[Hoppity] Reply subscription error:", err);
    });

    (broker as ServiceBroker).request = async function request<
        TReq extends { parse: (v: any) => any },
        TRes extends { parse: (v: any) => any },
    >(
        contract: {
            publicationName: string;
            requestSchema: TReq;
            responseSchema: TRes;
            _domain: string;
            _name: string;
            _type: string;
        },
        message: any,
        overrides?: PublicationConfig
    ): Promise<any> {
        if (validateOutbound) {
            contract.requestSchema.parse(message);
        }

        const correlationId = randomUUID();
        const requestPromise = correlationManager.addRequest(correlationId, defaultTimeout);

        const meta: OutboundMetadata = {
            contract: contract as any,
            kind: "rpc",
            serviceName,
        };

        // The outbound wrapper wraps the publish of the RpcRequest envelope.
        // Interceptors can inject traceparent headers into overrides here.
        const publish = composeOutboundWrappers(
            async (rpcRequest, ovr) =>
                broker.publish(contract.publicationName, rpcRequest, {
                    ...ovr,
                    options: { persistent: false, ...ovr?.options },
                }),
            interceptors,
            meta
        );

        await publish(
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
            overrides
        );

        const response = await requestPromise;

        if (validateInbound) {
            return contract.responseSchema.parse(response);
        }

        return response;
    };

    (broker as ServiceBroker).cancelRequest = (correlationId: string): boolean => {
        return correlationManager.cancelRequest(correlationId);
    };

    // Drain pending requests before the broker goes away, so callers don't hang.
    const originalShutdown = broker.shutdown.bind(broker);
    broker.shutdown = async () => {
        correlationManager.cleanup();
        await originalShutdown();
    };
}
