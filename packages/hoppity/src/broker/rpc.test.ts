/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

const mockBrokerPublish = jest.fn();
const mockBrokerSubscribe = jest.fn();
const mockBrokerShutdown = jest.fn();

describe("hoppity > broker > rpc", () => {
    let mockBroker: any, mockCorrelationManager: any, mockLogger: any, mockSubscription: any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();

        mockSubscription = {
            on: jest.fn(),
        };

        mockBroker = {
            publish: mockBrokerPublish,
            subscribe: mockBrokerSubscribe,
            shutdown: mockBrokerShutdown,
        };

        mockCorrelationManager = {
            addRequest: jest.fn(),
            resolveRequest: jest.fn(),
            rejectRequest: jest.fn(),
            cancelRequest: jest.fn(),
            cleanup: jest.fn(),
        };

        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        mockBrokerSubscribe.mockResolvedValue(mockSubscription);
        mockBrokerPublish.mockResolvedValue(undefined);
        mockBrokerShutdown.mockResolvedValue(undefined);
    });

    describe("wireRpcHandlers", () => {
        describe("when handlers array contains non-rpc declarations", () => {
            let wireRpcHandlersFn: typeof import("./rpc").wireRpcHandlers;

            beforeEach(async () => {
                ({ wireRpcHandlers: wireRpcHandlersFn } = await import("./rpc"));

                const eventDeclaration: any = {
                    _kind: "event",
                    contract: {
                        subscriptionName: "grub_event_taco_ready",
                        requestSchema: { parse: jest.fn() },
                    },
                    handler: jest.fn(),
                };

                const context: any = { logger: mockLogger };
                await wireRpcHandlersFn(mockBroker, [eventDeclaration], context, {
                    validateInbound: true,
                });
            });

            it("should not call broker.subscribe for non-rpc declarations", () => {
                expect(mockBrokerSubscribe).not.toHaveBeenCalled();
            });
        });

        describe("when an rpc handler succeeds and publishes a response", () => {
            let messageCallback: any, wireRpcHandlersFn: typeof import("./rpc").wireRpcHandlers;
            const mockHandler = jest.fn();

            beforeEach(async () => {
                ({ wireRpcHandlers: wireRpcHandlersFn } = await import("./rpc"));

                // Capture the "message" event callback so we can invoke it
                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            messageCallback = cb;
                        }
                    }
                );

                const rpcDeclaration: any = {
                    _kind: "rpc",
                    contract: {
                        subscriptionName: "grub_rpc_order_taco",
                        requestSchema: { parse: jest.fn().mockReturnValue({ size: "large" }) },
                    },
                    handler: mockHandler,
                };

                mockHandler.mockResolvedValue({ tacoId: "t-8675309" });

                const context: any = { logger: mockLogger };
                await wireRpcHandlersFn(mockBroker, [rpcDeclaration], context, {
                    validateInbound: true,
                });

                // Fire the message callback simulating an incoming RPC request
                const mockAckOrNack = jest.fn();
                await messageCallback(
                    {},
                    {
                        correlationId: "corr-abc-123",
                        rpcName: "grub.orderTaco",
                        payload: { size: "large" },
                        replyTo: "caller-reply-queue",
                    },
                    mockAckOrNack
                );
            });

            it("should publish an RPC response with the handler result", () => {
                expect(mockBrokerPublish).toHaveBeenCalledTimes(1);
                expect(mockBrokerPublish).toHaveBeenCalledWith(
                    "rpc_reply",
                    expect.objectContaining({
                        correlationId: "corr-abc-123",
                        payload: { tacoId: "t-8675309" },
                    }),
                    expect.objectContaining({ routingKey: "caller-reply-queue" })
                );
            });
        });

        describe("when an rpc handler throws an error", () => {
            let messageCallback: any,
                mockAckOrNack: any,
                wireRpcHandlersFn: typeof import("./rpc").wireRpcHandlers;

            beforeEach(async () => {
                ({ wireRpcHandlers: wireRpcHandlersFn } = await import("./rpc"));

                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            messageCallback = cb;
                        }
                    }
                );

                const failingHandler = jest.fn().mockRejectedValue(new Error("E_BURNT_TACO"));

                const rpcDeclaration: any = {
                    _kind: "rpc",
                    contract: {
                        subscriptionName: "grub_rpc_order_taco",
                        requestSchema: { parse: jest.fn().mockReturnValue({ size: "medium" }) },
                    },
                    handler: failingHandler,
                };

                const context: any = { logger: mockLogger };
                await wireRpcHandlersFn(mockBroker, [rpcDeclaration], context, {
                    validateInbound: false,
                });

                mockAckOrNack = jest.fn();
                await messageCallback(
                    {},
                    {
                        correlationId: "corr-error-456",
                        rpcName: "grub.orderTaco",
                        payload: { size: "medium" },
                        replyTo: "caller-reply-queue",
                    },
                    mockAckOrNack
                );
            });

            it("should publish an error RPC response", () => {
                expect(mockBrokerPublish).toHaveBeenCalledWith(
                    "rpc_reply",
                    expect.objectContaining({
                        correlationId: "corr-error-456",
                        error: expect.objectContaining({
                            code: "RPC_HANDLER_ERROR",
                            message: "E_BURNT_TACO",
                        }),
                    }),
                    expect.any(Object)
                );
            });

            it("should log the handler error", () => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining("grub_rpc_order_taco"),
                    expect.any(Error)
                );
            });

            it("should acknowledge the message even when the handler fails", () => {
                expect(mockAckOrNack).toHaveBeenCalledTimes(1);
            });
        });

        describe("when inbound validation is disabled", () => {
            let capturedPayload: any, wireRpcHandlersFn: typeof import("./rpc").wireRpcHandlers;
            const mockParse = jest.fn();
            const mockHandler = jest.fn();

            beforeEach(async () => {
                ({ wireRpcHandlers: wireRpcHandlersFn } = await import("./rpc"));

                let messageCallback: any;
                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            messageCallback = cb;
                        }
                    }
                );

                mockHandler.mockImplementation(async (payload: any) => {
                    capturedPayload = payload;
                    return { ok: true };
                });

                const rpcDeclaration: any = {
                    _kind: "rpc",
                    contract: {
                        subscriptionName: "grub_rpc_get_menu",
                        requestSchema: { parse: mockParse },
                    },
                    handler: mockHandler,
                };

                const context: any = { logger: mockLogger };
                await wireRpcHandlersFn(mockBroker, [rpcDeclaration], context, {
                    validateInbound: false,
                });

                await messageCallback(
                    {},
                    {
                        correlationId: "corr-no-validate",
                        rpcName: "grub.getMenu",
                        payload: { raw: true },
                        replyTo: "reply-q",
                    },
                    jest.fn()
                );
            });

            it("should not call parse on the requestSchema", () => {
                expect(mockParse).not.toHaveBeenCalled();
            });

            it("should pass the raw payload to the handler", () => {
                expect(capturedPayload).toEqual({ raw: true });
            });
        });

        describe("when invalid_content event fires", () => {
            let invalidContentCallback: any,
                mockAckOrNack: any,
                wireRpcHandlersFn: typeof import("./rpc").wireRpcHandlers;

            beforeEach(async () => {
                ({ wireRpcHandlers: wireRpcHandlersFn } = await import("./rpc"));

                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "invalid_content") {
                            invalidContentCallback = cb;
                        }
                    }
                );

                const rpcDeclaration: any = {
                    _kind: "rpc",
                    contract: {
                        subscriptionName: "grub_rpc_order_taco",
                        requestSchema: { parse: jest.fn() },
                    },
                    handler: jest.fn(),
                };

                const context: any = { logger: mockLogger };
                await wireRpcHandlersFn(mockBroker, [rpcDeclaration], context, {
                    validateInbound: true,
                });

                mockAckOrNack = jest.fn();
                invalidContentCallback(new Error("E_GARBAGE_JSON"), {}, mockAckOrNack);
            });

            it("should log a warning", () => {
                expect(mockLogger.warn).toHaveBeenCalledWith(
                    expect.stringContaining("grub_rpc_order_taco"),
                    expect.any(Error)
                );
            });

            it("should nack without requeue", () => {
                expect(mockAckOrNack).toHaveBeenCalledTimes(1);
                expect(mockAckOrNack).toHaveBeenCalledWith(expect.any(Error), [
                    { strategy: "nack", requeue: false },
                ]);
            });
        });
    });

    describe("wireRpcOutbound", () => {
        describe("when reply subscription receives a successful response", () => {
            let wireRpcOutboundFn: typeof import("./rpc").wireRpcOutbound;

            beforeEach(async () => {
                ({ wireRpcOutbound: wireRpcOutboundFn } = await import("./rpc"));

                // Capture the "message" callback from the reply subscription
                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            // Invoke it immediately with a success response
                            const mockAckOrNack = jest.fn();
                            cb(
                                {},
                                {
                                    correlationId: "corr-reply-ok",
                                    payload: { burgerId: "whopper-99" },
                                },
                                mockAckOrNack
                            );
                        }
                    }
                );

                await wireRpcOutboundFn(mockBroker, {
                    serviceName: "test-service",
                    instanceId: "test-id",
                    replyQueueName: "test-service_test-id_reply",

                    correlationManager: mockCorrelationManager,
                    defaultTimeout: 5000,
                    validateInbound: false,
                    validateOutbound: false,
                    logger: mockLogger,
                });
            });

            it("should call resolveRequest with the correlation ID and payload", () => {
                expect(mockCorrelationManager.resolveRequest).toHaveBeenCalledTimes(1);
                expect(mockCorrelationManager.resolveRequest).toHaveBeenCalledWith(
                    "corr-reply-ok",
                    { burgerId: "whopper-99" }
                );
            });
        });

        describe("when reply subscription receives an error response", () => {
            let wireRpcOutboundFn: typeof import("./rpc").wireRpcOutbound;

            beforeEach(async () => {
                ({ wireRpcOutbound: wireRpcOutboundFn } = await import("./rpc"));

                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            const mockAckOrNack = jest.fn();
                            cb(
                                {},
                                {
                                    correlationId: "corr-reply-err",
                                    error: {
                                        code: "RPC_HANDLER_ERROR",
                                        message: "E_COLD_CALZONE",
                                    },
                                },
                                mockAckOrNack
                            );
                        }
                    }
                );

                await wireRpcOutboundFn(mockBroker, {
                    serviceName: "test-service",
                    instanceId: "test-id",
                    replyQueueName: "test-service_test-id_reply",

                    correlationManager: mockCorrelationManager,
                    defaultTimeout: 5000,
                    validateInbound: false,
                    validateOutbound: false,
                    logger: mockLogger,
                });
            });

            it("should call rejectRequest with the correlation ID and an RpcError", () => {
                expect(mockCorrelationManager.rejectRequest).toHaveBeenCalledTimes(1);
                expect(mockCorrelationManager.rejectRequest).toHaveBeenCalledWith(
                    "corr-reply-err",
                    expect.objectContaining({
                        name: "RpcError",
                        message: "E_COLD_CALZONE",
                        code: "RPC_HANDLER_ERROR",
                    })
                );
            });

            it("should not call resolveRequest", () => {
                expect(mockCorrelationManager.resolveRequest).not.toHaveBeenCalled();
            });
        });

        describe("when reply subscription receives a response for an unknown correlationId", () => {
            let wireRpcOutboundFn: typeof import("./rpc").wireRpcOutbound;

            beforeEach(async () => {
                ({ wireRpcOutbound: wireRpcOutboundFn } = await import("./rpc"));

                // resolveRequest returns false for unknown IDs — that's fine, no throw
                mockCorrelationManager.resolveRequest.mockReturnValue(false);

                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            const mockAckOrNack = jest.fn();
                            cb(
                                {},
                                {
                                    correlationId: "corr-unknown-xyz",
                                    payload: { stale: true },
                                },
                                mockAckOrNack
                            );
                        }
                    }
                );

                await wireRpcOutboundFn(mockBroker, {
                    serviceName: "test-service",
                    instanceId: "test-id",
                    replyQueueName: "test-service_test-id_reply",

                    correlationManager: mockCorrelationManager,
                    defaultTimeout: 5000,
                    validateInbound: false,
                    validateOutbound: false,
                    logger: mockLogger,
                });
            });

            it("should call resolveRequest (which returns false for unknown IDs)", () => {
                expect(mockCorrelationManager.resolveRequest).toHaveBeenCalledWith(
                    "corr-unknown-xyz",
                    { stale: true }
                );
            });
        });

        describe("when broker.cancelRequest is called", () => {
            let wireRpcOutboundFn: typeof import("./rpc").wireRpcOutbound, cancelResult: boolean;

            beforeEach(async () => {
                ({ wireRpcOutbound: wireRpcOutboundFn } = await import("./rpc"));

                mockCorrelationManager.cancelRequest.mockReturnValue(true);

                await wireRpcOutboundFn(mockBroker, {
                    serviceName: "test-service",
                    instanceId: "test-id",
                    replyQueueName: "test-service_test-id_reply",

                    correlationManager: mockCorrelationManager,
                    defaultTimeout: 5000,
                    validateInbound: false,
                    validateOutbound: false,
                    logger: mockLogger,
                });

                cancelResult = (mockBroker as any).cancelRequest("corr-cancel-me");
            });

            it("should delegate to correlationManager.cancelRequest", () => {
                expect(mockCorrelationManager.cancelRequest).toHaveBeenCalledWith("corr-cancel-me");
            });

            it("should return the result from correlationManager.cancelRequest", () => {
                expect(cancelResult).toBe(true);
            });
        });

        describe("when broker.shutdown is called after wireRpcOutbound", () => {
            let wireRpcOutboundFn: typeof import("./rpc").wireRpcOutbound;

            beforeEach(async () => {
                ({ wireRpcOutbound: wireRpcOutboundFn } = await import("./rpc"));

                await wireRpcOutboundFn(mockBroker, {
                    serviceName: "test-service",
                    instanceId: "test-id",
                    replyQueueName: "test-service_test-id_reply",

                    correlationManager: mockCorrelationManager,
                    defaultTimeout: 5000,
                    validateInbound: false,
                    validateOutbound: false,
                    logger: mockLogger,
                });

                await mockBroker.shutdown();
            });

            it("should call correlationManager.cleanup before shutting down", () => {
                expect(mockCorrelationManager.cleanup).toHaveBeenCalledTimes(1);
            });

            it("should call the original broker.shutdown", () => {
                // mockBrokerShutdown is the original — wireRpcOutbound wraps it.
                // After wrapping, calling broker.shutdown() should invoke the original.
                expect(mockBrokerShutdown).toHaveBeenCalledTimes(1);
            });
        });

        describe("when broker.request is called with validateOutbound=true", () => {
            let wireRpcOutboundFn: typeof import("./rpc").wireRpcOutbound;
            const mockRequestSchema = { parse: jest.fn() };
            const mockResponseSchema = { parse: jest.fn() };

            beforeEach(async () => {
                ({ wireRpcOutbound: wireRpcOutboundFn } = await import("./rpc"));

                mockCorrelationManager.addRequest.mockResolvedValue({ result: "ok" });
                mockResponseSchema.parse.mockReturnValue({ result: "ok" });

                await wireRpcOutboundFn(mockBroker, {
                    serviceName: "test-service",
                    instanceId: "test-id",
                    replyQueueName: "test-service_test-id_reply",

                    correlationManager: mockCorrelationManager,
                    defaultTimeout: 5000,
                    validateInbound: false,
                    validateOutbound: true,
                    logger: mockLogger,
                });

                const contract: any = {
                    publicationName: "grub_rpc_order_taco",
                    requestSchema: mockRequestSchema,
                    responseSchema: mockResponseSchema,
                    _domain: "grub",
                    _name: "orderTaco",
                };

                await (mockBroker as any).request(contract, { size: "large" });
            });

            it("should call requestSchema.parse with the message for outbound validation", () => {
                expect(mockRequestSchema.parse).toHaveBeenCalledWith({ size: "large" });
            });
        });

        describe("when broker.request is called with validateInbound=true", () => {
            let wireRpcOutboundFn: typeof import("./rpc").wireRpcOutbound;
            const mockRequestSchema = { parse: jest.fn() };
            const mockResponseSchema = { parse: jest.fn() };

            beforeEach(async () => {
                ({ wireRpcOutbound: wireRpcOutboundFn } = await import("./rpc"));

                mockCorrelationManager.addRequest.mockResolvedValue({ burgerId: "w-999" });
                mockResponseSchema.parse.mockReturnValue({ burgerId: "w-999-validated" });

                await wireRpcOutboundFn(mockBroker, {
                    serviceName: "test-service",
                    instanceId: "test-id",
                    replyQueueName: "test-service_test-id_reply",

                    correlationManager: mockCorrelationManager,
                    defaultTimeout: 5000,
                    validateInbound: true,
                    validateOutbound: false,
                    logger: mockLogger,
                });

                const contract: any = {
                    publicationName: "grub_rpc_order_taco",
                    requestSchema: mockRequestSchema,
                    responseSchema: mockResponseSchema,
                    _domain: "grub",
                    _name: "orderTaco",
                };

                await (mockBroker as any).request(contract, { size: "medium" });
            });

            it("should call responseSchema.parse with the response for inbound validation", () => {
                expect(mockResponseSchema.parse).toHaveBeenCalledWith({ burgerId: "w-999" });
            });
        });

        describe("when an outbound interceptor is provided for broker.request", () => {
            let capturedMeta: any,
                callOrder: string[],
                wireRpcOutboundFn: typeof import("./rpc").wireRpcOutbound;

            beforeEach(async () => {
                ({ wireRpcOutbound: wireRpcOutboundFn } = await import("./rpc"));

                callOrder = [];
                capturedMeta = undefined;

                mockCorrelationManager.addRequest.mockResolvedValue({ burgerId: "b-42" });

                const interceptor: any = {
                    name: "rpc-trace-interceptor",
                    outbound: (publish: any, meta: any) => {
                        capturedMeta = meta;
                        return async (msg: any, ovr: any) => {
                            callOrder.push("interceptor-before");
                            await publish(msg, ovr);
                            callOrder.push("interceptor-after");
                        };
                    },
                };

                await wireRpcOutboundFn(mockBroker, {
                    serviceName: "test-service",
                    instanceId: "test-id",
                    replyQueueName: "test-service_test-id_reply",
                    correlationManager: mockCorrelationManager,
                    defaultTimeout: 5000,
                    validateInbound: false,
                    validateOutbound: false,
                    logger: mockLogger,
                    interceptors: [interceptor],
                });

                const contract: any = {
                    publicationName: "grub_rpc_order_taco",
                    requestSchema: { parse: jest.fn() },
                    responseSchema: { parse: jest.fn() },
                    _domain: "grub",
                    _name: "orderTaco",
                    _type: "rpc",
                };

                await (mockBroker as any).request(contract, { size: "xl" });
            });

            it("should call the interceptor before and after publish", () => {
                expect(callOrder).toEqual(["interceptor-before", "interceptor-after"]);
            });

            it("should pass kind=rpc to the interceptor metadata", () => {
                expect(capturedMeta.kind).toBe("rpc");
            });

            it("should pass the serviceName to the interceptor metadata", () => {
                expect(capturedMeta.serviceName).toBe("test-service");
            });
        });

        describe("when an outbound interceptor injects options.headers, persistent:false is preserved", () => {
            let wireRpcOutboundFn: typeof import("./rpc").wireRpcOutbound;

            beforeEach(async () => {
                ({ wireRpcOutbound: wireRpcOutboundFn } = await import("./rpc"));

                mockCorrelationManager.addRequest.mockResolvedValue({ ok: true });

                // Interceptor injects options.headers — simulates a tracing interceptor
                // that adds headers without knowing about the persistent flag.
                const interceptor: any = {
                    name: "header-injector",
                    outbound: (publish: any, _meta: any) => {
                        return async (msg: any, ovr: any) => {
                            await publish(msg, {
                                ...ovr,
                                options: {
                                    ...ovr?.options,
                                    headers: { "x-traceparent": "00-abc" },
                                },
                            });
                        };
                    },
                };

                await wireRpcOutboundFn(mockBroker, {
                    serviceName: "test-service",
                    instanceId: "test-id",
                    replyQueueName: "test-service_test-id_reply",
                    correlationManager: mockCorrelationManager,
                    defaultTimeout: 5000,
                    validateInbound: false,
                    validateOutbound: false,
                    logger: mockLogger,
                    interceptors: [interceptor],
                });

                const contract: any = {
                    publicationName: "grub_rpc_order_taco",
                    requestSchema: { parse: jest.fn() },
                    responseSchema: { parse: jest.fn() },
                    _domain: "grub",
                    _name: "orderTaco",
                    _type: "rpc",
                };

                await (mockBroker as any).request(contract, { size: "large" });
            });

            it("should publish with persistent=false even when interceptor injects headers", () => {
                expect(mockBrokerPublish).toHaveBeenCalledWith(
                    "grub_rpc_order_taco",
                    expect.any(Object),
                    expect.objectContaining({
                        options: expect.objectContaining({
                            persistent: false,
                            headers: { "x-traceparent": "00-abc" },
                        }),
                    })
                );
            });
        });
    });

    describe("wireRpcHandlers (additional edge cases)", () => {
        describe("when validateInbound=true and requestSchema.parse throws a ZodError", () => {
            let messageCallback: any,
                mockAckOrNack: any,
                wireRpcHandlersFn: typeof import("./rpc").wireRpcHandlers;

            beforeEach(async () => {
                ({ wireRpcHandlers: wireRpcHandlersFn } = await import("./rpc"));

                const { ZodError, ZodIssueCode } = await import("zod");

                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            messageCallback = cb;
                        }
                    }
                );

                const zodErr = new ZodError([
                    {
                        code: ZodIssueCode.invalid_type,
                        expected: "string",
                        received: "number",
                        path: ["size"],
                        message: "Expected string, received number",
                    },
                ]);

                const rpcDeclaration: any = {
                    _kind: "rpc",
                    contract: {
                        subscriptionName: "grub_rpc_order_taco",
                        requestSchema: {
                            parse: jest.fn().mockImplementation(() => {
                                throw zodErr;
                            }),
                        },
                    },
                    handler: jest.fn(),
                };

                const context: any = { logger: mockLogger };
                await wireRpcHandlersFn(mockBroker, [rpcDeclaration], context, {
                    validateInbound: true,
                });

                mockAckOrNack = jest.fn();
                await messageCallback(
                    {},
                    {
                        correlationId: "corr-zod-fail",
                        rpcName: "grub.orderTaco",
                        payload: { size: 42 },
                        replyTo: "caller-queue",
                    },
                    mockAckOrNack
                );
            });

            it("should log the ZodError with field path information", () => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining("RPC inbound validation failed")
                    // ZodError formats as a string — no second arg for this path
                );
            });

            it("should publish an error RPC response", () => {
                expect(mockBrokerPublish).toHaveBeenCalledWith(
                    "rpc_reply",
                    expect.objectContaining({
                        correlationId: "corr-zod-fail",
                        error: expect.objectContaining({
                            code: "RPC_HANDLER_ERROR",
                        }),
                    }),
                    expect.any(Object)
                );
            });

            it("should acknowledge the message", () => {
                expect(mockAckOrNack).toHaveBeenCalledTimes(1);
            });
        });

        describe("when reply subscription message handler throws during processing", () => {
            let wireRpcOutboundFn: typeof import("./rpc").wireRpcOutbound;

            beforeEach(async () => {
                ({ wireRpcOutbound: wireRpcOutboundFn } = await import("./rpc"));

                // resolveRequest throws to trigger the catch block in the reply handler
                mockCorrelationManager.resolveRequest.mockImplementation(() => {
                    throw new Error("E_CORRELATION_LOOKUP_EXPLODED");
                });

                let replyMessageCallback: any;
                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            replyMessageCallback = cb;
                        }
                    }
                );

                await wireRpcOutboundFn(mockBroker, {
                    serviceName: "test-service",
                    instanceId: "test-id",
                    replyQueueName: "test-service_test-id_reply",
                    correlationManager: mockCorrelationManager,
                    defaultTimeout: 5000,
                    validateInbound: false,
                    validateOutbound: false,
                    logger: mockLogger,
                });

                const mockAckOrNack = jest.fn();
                replyMessageCallback(
                    {},
                    { correlationId: "corr-boom", payload: { ok: true } },
                    mockAckOrNack
                );
            });

            it("should log the processing error", () => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining("Error processing RPC reply"),
                    expect.any(Error)
                );
            });
        });

        describe("when an rpc handler short-circuits the handler via interceptor", () => {
            let messageCallback: any,
                mockAckOrNack: any,
                mockHandler: jest.Mock,
                wireRpcHandlersFn: typeof import("./rpc").wireRpcHandlers;

            beforeEach(async () => {
                ({ wireRpcHandlers: wireRpcHandlersFn } = await import("./rpc"));

                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            messageCallback = cb;
                        }
                    }
                );

                mockHandler = jest.fn().mockResolvedValue({ data: "secret" });

                // Interceptor that blocks the handler entirely
                const circuitBreaker: any = {
                    name: "circuit-breaker",
                    inbound: (_handler: any) => async (_payload: any, _ctx: any) => {
                        return { blocked: true };
                    },
                };

                const rpcDeclaration: any = {
                    _kind: "rpc",
                    contract: {
                        subscriptionName: "grub_rpc_order_taco",
                        requestSchema: { parse: jest.fn().mockReturnValue({ size: "large" }) },
                    },
                    handler: mockHandler,
                };

                const context: any = { logger: mockLogger };
                await wireRpcHandlersFn(mockBroker, [rpcDeclaration], context, {
                    validateInbound: false,
                    interceptors: [circuitBreaker],
                });

                mockAckOrNack = jest.fn();
                await messageCallback(
                    {},
                    {
                        correlationId: "corr-blocked",
                        rpcName: "grub.orderTaco",
                        payload: { size: "large" },
                        replyTo: "caller-queue",
                    },
                    mockAckOrNack
                );
            });

            it("should not call the underlying handler", () => {
                expect(mockHandler).not.toHaveBeenCalled();
            });

            it("should publish a success response with the interceptor's return value", () => {
                expect(mockBrokerPublish).toHaveBeenCalledWith(
                    "rpc_reply",
                    expect.objectContaining({
                        correlationId: "corr-blocked",
                        payload: { blocked: true },
                    }),
                    expect.any(Object)
                );
            });

            it("should ack the message", () => {
                expect(mockAckOrNack).toHaveBeenCalledTimes(1);
                expect(mockAckOrNack).toHaveBeenCalledWith();
            });
        });
    });

    describe("wireRpcHandlers (with interceptors)", () => {
        describe("when an inbound interceptor is provided for an rpc handler", () => {
            let callOrder: string[],
                capturedMeta: any,
                wireRpcHandlersFn: typeof import("./rpc").wireRpcHandlers;

            beforeEach(async () => {
                ({ wireRpcHandlers: wireRpcHandlersFn } = await import("./rpc"));

                callOrder = [];
                capturedMeta = undefined;

                let messageCallback: any;
                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            messageCallback = cb;
                        }
                    }
                );

                const baseHandler = jest.fn().mockImplementation(async () => {
                    callOrder.push("handler");
                    return { ok: true };
                });

                const interceptor: any = {
                    name: "rpc-inbound-interceptor",
                    inbound: (handler: any, meta: any) => {
                        capturedMeta = meta;
                        return async (payload: any, ctx: any) => {
                            callOrder.push("interceptor-before");
                            const result = await handler(payload, ctx);
                            callOrder.push("interceptor-after");
                            return result;
                        };
                    },
                };

                const rpcDeclaration: any = {
                    _kind: "rpc",
                    contract: {
                        subscriptionName: "grub_rpc_order_taco",
                        requestSchema: {
                            parse: jest.fn().mockReturnValue({ size: "large" }),
                        },
                        _type: "rpc",
                        _domain: "grub",
                        _name: "orderTaco",
                    },
                    handler: baseHandler,
                };

                const context: any = { logger: mockLogger, serviceName: "grill-service" };
                await wireRpcHandlersFn(mockBroker, [rpcDeclaration], context, {
                    validateInbound: false,
                    interceptors: [interceptor],
                });

                const mockAckOrNack = jest.fn();
                await messageCallback(
                    {
                        properties: {
                            headers: { "x-trace-parent": "00-abc123" },
                        },
                    },
                    {
                        correlationId: "corr-intercepted",
                        rpcName: "grub.orderTaco",
                        payload: { size: "large" },
                        replyTo: "caller-queue",
                    },
                    mockAckOrNack
                );
            });

            it("should call the interceptor before and after the handler", () => {
                expect(callOrder).toEqual(["interceptor-before", "handler", "interceptor-after"]);
            });

            it("should pass kind=rpc to the interceptor metadata", () => {
                expect(capturedMeta.kind).toBe("rpc");
            });

            it("should pass the serviceName to the interceptor metadata", () => {
                expect(capturedMeta.serviceName).toBe("grill-service");
            });

            it("should pass headers from the AMQP message to the interceptor metadata", () => {
                expect(capturedMeta.message.headers).toEqual({ "x-trace-parent": "00-abc123" });
            });
        });
    });
});
