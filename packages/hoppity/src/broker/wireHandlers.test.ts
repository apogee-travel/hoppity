/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

const mockBrokerSubscribe = jest.fn();

describe("hoppity > broker > wireHandlers", () => {
    let mockBroker: any, mockSubscription: any, mockLogger: any, mockContext: any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();

        mockSubscription = {
            on: jest.fn(),
        };

        mockBroker = {
            subscribe: mockBrokerSubscribe,
        };

        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        mockContext = {
            logger: mockLogger,
            serviceName: "taco-service",
            data: {},
            middlewareNames: [],
        };

        mockBrokerSubscribe.mockResolvedValue(mockSubscription);
    });

    describe("wireHandlers", () => {
        describe("when handlers array contains only rpc declarations", () => {
            let wireHandlersFn: typeof import("./wireHandlers").wireHandlers;

            beforeEach(async () => {
                ({ wireHandlers: wireHandlersFn } = await import("./wireHandlers"));

                const rpcDeclaration: any = {
                    _kind: "rpc",
                    contract: {
                        subscriptionName: "grub_rpc_order_taco",
                        schema: { parse: jest.fn() },
                    },
                    handler: jest.fn(),
                };

                await wireHandlersFn(mockBroker, [rpcDeclaration], mockContext, {
                    validateInbound: false,
                });
            });

            it("should not call broker.subscribe for rpc declarations", () => {
                expect(mockBrokerSubscribe).not.toHaveBeenCalled();
            });
        });

        describe("when an event handler succeeds", () => {
            let messageCallback: any,
                mockAckOrNack: any,
                mockHandler: jest.Mock,
                wireHandlersFn: typeof import("./wireHandlers").wireHandlers;

            beforeEach(async () => {
                ({ wireHandlers: wireHandlersFn } = await import("./wireHandlers"));

                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            messageCallback = cb;
                        }
                    }
                );

                mockHandler = jest.fn().mockResolvedValue(undefined);

                const eventDeclaration: any = {
                    _kind: "event",
                    contract: {
                        subscriptionName: "grub_event_taco_ready",
                        schema: { parse: jest.fn().mockReturnValue({ tacoId: "t-1" }) },
                    },
                    handler: mockHandler,
                };

                await wireHandlersFn(mockBroker, [eventDeclaration], mockContext, {
                    validateInbound: true,
                });

                mockAckOrNack = jest.fn();
                await messageCallback(
                    {
                        properties: {
                            headers: { "x-trace": "abc" },
                            contentType: "application/json",
                        },
                    },
                    { tacoId: "t-1" },
                    mockAckOrNack
                );
            });

            it("should call the handler with the parsed payload", () => {
                expect(mockHandler).toHaveBeenCalledTimes(1);
                expect(mockHandler).toHaveBeenCalledWith(
                    { tacoId: "t-1" },
                    expect.objectContaining({ broker: mockBroker })
                );
            });

            it("should ack the message after the handler resolves", () => {
                expect(mockAckOrNack).toHaveBeenCalledTimes(1);
                expect(mockAckOrNack).toHaveBeenCalledWith();
            });
        });

        describe("when validateInbound is false", () => {
            let capturedPayload: any, wireHandlersFn: typeof import("./wireHandlers").wireHandlers;
            const mockParse = jest.fn();

            beforeEach(async () => {
                ({ wireHandlers: wireHandlersFn } = await import("./wireHandlers"));

                let messageCallback: any;
                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            messageCallback = cb;
                        }
                    }
                );

                const eventDeclaration: any = {
                    _kind: "event",
                    contract: {
                        subscriptionName: "grub_event_taco_ready",
                        schema: { parse: mockParse },
                    },
                    handler: jest.fn().mockImplementation(async (payload: any) => {
                        capturedPayload = payload;
                    }),
                };

                await wireHandlersFn(mockBroker, [eventDeclaration], mockContext, {
                    validateInbound: false,
                });

                await messageCallback({ properties: {} }, { raw: "burrito" }, jest.fn());
            });

            it("should not call schema.parse", () => {
                expect(mockParse).not.toHaveBeenCalled();
            });

            it("should pass the raw content to the handler", () => {
                expect(capturedPayload).toEqual({ raw: "burrito" });
            });
        });

        describe("when the handler throws an error", () => {
            let mockAckOrNack: any, wireHandlersFn: typeof import("./wireHandlers").wireHandlers;

            beforeEach(async () => {
                ({ wireHandlers: wireHandlersFn } = await import("./wireHandlers"));

                let messageCallback: any;
                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            messageCallback = cb;
                        }
                    }
                );

                const failingHandler = jest.fn().mockRejectedValue(new Error("E_BURNT_TACO"));

                const eventDeclaration: any = {
                    _kind: "event",
                    contract: {
                        subscriptionName: "grub_event_taco_ready",
                        schema: { parse: jest.fn().mockReturnValue({}) },
                    },
                    handler: failingHandler,
                };

                await wireHandlersFn(mockBroker, [eventDeclaration], mockContext, {
                    validateInbound: false,
                });

                mockAckOrNack = jest.fn();
                await messageCallback({}, {}, mockAckOrNack);
            });

            it("should log the handler error", () => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining("grub_event_taco_ready"),
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

        describe("when invalid_content event fires", () => {
            let invalidContentCallback: any,
                mockAckOrNack: any,
                wireHandlersFn: typeof import("./wireHandlers").wireHandlers;

            beforeEach(async () => {
                ({ wireHandlers: wireHandlersFn } = await import("./wireHandlers"));

                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "invalid_content") {
                            invalidContentCallback = cb;
                        }
                    }
                );

                const eventDeclaration: any = {
                    _kind: "event",
                    contract: {
                        subscriptionName: "grub_event_taco_ready",
                        schema: { parse: jest.fn() },
                    },
                    handler: jest.fn(),
                };

                await wireHandlersFn(mockBroker, [eventDeclaration], mockContext, {
                    validateInbound: true,
                });

                mockAckOrNack = jest.fn();
                invalidContentCallback(new Error("E_GARBAGE_GUAC"), {}, mockAckOrNack);
            });

            it("should log a warning", () => {
                expect(mockLogger.warn).toHaveBeenCalledWith(
                    expect.stringContaining("grub_event_taco_ready"),
                    expect.any(Error)
                );
            });

            it("should nack without requeue", () => {
                expect(mockAckOrNack).toHaveBeenCalledWith(expect.any(Error), [
                    { strategy: "nack", requeue: false },
                ]);
            });
        });

        describe("when broker.subscribe throws during setup", () => {
            let caughtError: any, wireHandlersFn: typeof import("./wireHandlers").wireHandlers;

            beforeEach(async () => {
                mockBrokerSubscribe.mockReset();
                mockBrokerSubscribe.mockRejectedValue(new Error("E_SUBSCRIBE_FAILED"));

                ({ wireHandlers: wireHandlersFn } = await import("./wireHandlers"));

                const eventDeclaration: any = {
                    _kind: "event",
                    contract: {
                        subscriptionName: "grub_event_taco_ready",
                        schema: { parse: jest.fn() },
                    },
                    handler: jest.fn(),
                };

                try {
                    await wireHandlersFn(mockBroker, [eventDeclaration], mockContext, {
                        validateInbound: false,
                    });
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should log the subscription error", () => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining("grub_event_taco_ready"),
                    expect.any(Error)
                );
            });

            it("should rethrow the error", () => {
                expect(caughtError).toBeInstanceOf(Error);
                expect(caughtError.message).toBe("E_SUBSCRIBE_FAILED");
            });
        });

        describe("when interceptors are provided and the message is received", () => {
            let callOrder: string[],
                capturedMeta: any,
                mockAckOrNack: any,
                wireHandlersFn: typeof import("./wireHandlers").wireHandlers;

            beforeEach(async () => {
                ({ wireHandlers: wireHandlersFn } = await import("./wireHandlers"));

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
                });

                const interceptor: any = {
                    name: "test-interceptor",
                    inbound: (handler: any, meta: any) => {
                        capturedMeta = meta;
                        return async (payload: any, ctx: any) => {
                            callOrder.push("interceptor-before");
                            await handler(payload, ctx);
                            callOrder.push("interceptor-after");
                        };
                    },
                };

                const eventDeclaration: any = {
                    _kind: "event",
                    contract: {
                        subscriptionName: "grub_event_taco_ready",
                        schema: { parse: jest.fn().mockImplementation((v: any) => v) },
                        _type: "event",
                        _domain: "grub",
                        _name: "tacoReady",
                    },
                    handler: baseHandler,
                };

                await wireHandlersFn(mockBroker, [eventDeclaration], mockContext, {
                    validateInbound: false,
                    interceptors: [interceptor],
                });

                mockAckOrNack = jest.fn();
                await messageCallback(
                    {
                        properties: {
                            headers: { "x-trace-id": "trace-xyz" },
                            contentType: "application/json",
                        },
                    },
                    { item: "queso" },
                    mockAckOrNack
                );
            });

            it("should call the interceptor before and after the handler", () => {
                expect(callOrder).toEqual(["interceptor-before", "handler", "interceptor-after"]);
            });

            it("should pass headers from the AMQP message to the interceptor metadata", () => {
                expect(capturedMeta.message.headers).toEqual({ "x-trace-id": "trace-xyz" });
            });

            it("should pass the contract to the interceptor metadata", () => {
                expect(capturedMeta.contract.subscriptionName).toBe("grub_event_taco_ready");
            });

            it("should pass the serviceName to the interceptor metadata", () => {
                expect(capturedMeta.serviceName).toBe("taco-service");
            });

            it("should ack after the wrapped handler resolves", () => {
                expect(mockAckOrNack).toHaveBeenCalledTimes(1);
                expect(mockAckOrNack).toHaveBeenCalledWith();
            });
        });

        describe("when message has no headers (undefined properties)", () => {
            let capturedMeta: any, wireHandlersFn: typeof import("./wireHandlers").wireHandlers;

            beforeEach(async () => {
                ({ wireHandlers: wireHandlersFn } = await import("./wireHandlers"));

                capturedMeta = undefined;

                let messageCallback: any;
                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            messageCallback = cb;
                        }
                    }
                );

                const interceptor: any = {
                    name: "meta-capture",
                    inbound: (handler: any, meta: any) => {
                        capturedMeta = meta;
                        return handler;
                    },
                };

                const eventDeclaration: any = {
                    _kind: "event",
                    contract: {
                        subscriptionName: "grub_event_taco_ready",
                        schema: { parse: jest.fn().mockImplementation((v: any) => v) },
                    },
                    handler: jest.fn().mockResolvedValue(undefined),
                };

                await wireHandlersFn(mockBroker, [eventDeclaration], mockContext, {
                    validateInbound: false,
                    interceptors: [interceptor],
                });

                // Simulate a message with no properties at all
                await messageCallback({}, { item: "chips" }, jest.fn());
            });

            it("should default headers to an empty object when message has no properties", () => {
                expect(capturedMeta.message.headers).toEqual({});
            });

            it("should default properties to an empty object", () => {
                expect(capturedMeta.message.properties).toEqual({});
            });
        });

        describe("when message has null headers inside properties", () => {
            let capturedMeta: any, wireHandlersFn: typeof import("./wireHandlers").wireHandlers;

            beforeEach(async () => {
                ({ wireHandlers: wireHandlersFn } = await import("./wireHandlers"));

                capturedMeta = undefined;

                let messageCallback: any;
                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            messageCallback = cb;
                        }
                    }
                );

                const interceptor: any = {
                    name: "null-header-capture",
                    inbound: (handler: any, meta: any) => {
                        capturedMeta = meta;
                        return handler;
                    },
                };

                const eventDeclaration: any = {
                    _kind: "event",
                    contract: {
                        subscriptionName: "grub_event_taco_ready",
                        schema: { parse: jest.fn().mockImplementation((v: any) => v) },
                    },
                    handler: jest.fn().mockResolvedValue(undefined),
                };

                await wireHandlersFn(mockBroker, [eventDeclaration], mockContext, {
                    validateInbound: false,
                    interceptors: [interceptor],
                });

                // Simulate a message where properties exists but headers is null
                await messageCallback(
                    { properties: { headers: null, contentType: "application/json" } },
                    { item: "guac" },
                    jest.fn()
                );
            });

            it("should default headers to an empty object when headers is null", () => {
                expect(capturedMeta.message.headers).toEqual({});
            });

            it("should preserve the non-null properties fields", () => {
                expect(capturedMeta.message.properties).toEqual({
                    headers: null,
                    contentType: "application/json",
                });
            });
        });

        describe("when validateInbound=true and schema.parse throws a ZodError", () => {
            let mockAckOrNack: any, wireHandlersFn: typeof import("./wireHandlers").wireHandlers;

            beforeEach(async () => {
                ({ wireHandlers: wireHandlersFn } = await import("./wireHandlers"));

                const { ZodError, ZodIssueCode } = await import("zod");

                let messageCallback: any;
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
                        path: ["tacoId"],
                        message: "Expected string, received number",
                    },
                ]);

                const eventDeclaration: any = {
                    _kind: "event",
                    contract: {
                        subscriptionName: "grub_event_taco_ready",
                        schema: {
                            parse: jest.fn().mockImplementation(() => {
                                throw zodErr;
                            }),
                        },
                    },
                    handler: jest.fn(),
                };

                await wireHandlersFn(mockBroker, [eventDeclaration], mockContext, {
                    validateInbound: true,
                });

                mockAckOrNack = jest.fn();
                await messageCallback({}, { tacoId: 42 }, mockAckOrNack);
            });

            it("should log the ZodError with field path information", () => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining("Inbound validation failed")
                    // ZodError message contains field paths — no second arg for this branch
                );
            });

            it("should nack without requeue", () => {
                expect(mockAckOrNack).toHaveBeenCalledTimes(1);
                expect(mockAckOrNack).toHaveBeenCalledWith(expect.any(Error), [
                    { strategy: "nack", requeue: false },
                ]);
            });
        });

        describe("when an inbound interceptor short-circuits without calling the handler", () => {
            let mockAckOrNack: any,
                mockHandler: jest.Mock,
                wireHandlersFn: typeof import("./wireHandlers").wireHandlers;

            beforeEach(async () => {
                ({ wireHandlers: wireHandlersFn } = await import("./wireHandlers"));

                let messageCallback: any;
                mockSubscription.on.mockImplementation(
                    (event: string, cb: (...args: any[]) => any) => {
                        if (event === "message") {
                            messageCallback = cb;
                        }
                    }
                );

                mockHandler = jest.fn().mockResolvedValue(undefined);

                const shortCircuitInterceptor: any = {
                    name: "circuit-breaker",
                    inbound: (_handler: any) => async (_payload: any, _ctx: any) => {
                        // does NOT call _handler — simulates a circuit breaker open
                    },
                };

                const eventDeclaration: any = {
                    _kind: "event",
                    contract: {
                        subscriptionName: "grub_event_taco_ready",
                        schema: { parse: jest.fn().mockImplementation((v: any) => v) },
                    },
                    handler: mockHandler,
                };

                await wireHandlersFn(mockBroker, [eventDeclaration], mockContext, {
                    validateInbound: false,
                    interceptors: [shortCircuitInterceptor],
                });

                mockAckOrNack = jest.fn();
                await messageCallback({}, { item: "salsa" }, mockAckOrNack);
            });

            it("should not call the handler", () => {
                expect(mockHandler).not.toHaveBeenCalled();
            });

            it("should still ack the message", () => {
                expect(mockAckOrNack).toHaveBeenCalledTimes(1);
                expect(mockAckOrNack).toHaveBeenCalledWith();
            });
        });
    });
});
