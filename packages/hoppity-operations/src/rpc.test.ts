/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import { z } from "zod";
import { wireRpcHandlers, wireRpcOutbound } from "./rpc";
import { createCorrelationManager, CorrelationManager } from "./correlationManager";
import { RpcContract, EventContract } from "@apogeelabs/hoppity-contracts";
import { onRpc, onEvent } from "./handlers";
import { RpcErrorCode } from "./types";

// ---------------------------------------------------------------------------
// Test contracts
// ---------------------------------------------------------------------------

const rpcContract: RpcContract = {
    _type: "rpc",
    _domain: "pricing",
    _name: "getQuote",
    requestSchema: z.object({ itemId: z.string() }),
    responseSchema: z.object({ price: z.number() }),
    exchange: "pricing_rpc",
    routingKey: "pricing.rpc.get_quote",
    publicationName: "pricing_rpc_get_quote",
    subscriptionName: "pricing_rpc_get_quote",
};

const eventContract: EventContract = {
    _type: "event",
    _domain: "order",
    _name: "placed",
    schema: z.object({ orderId: z.string() }),
    exchange: "order",
    routingKey: "order.event.placed",
    publicationName: "order_event_placed",
    subscriptionName: "order_event_placed",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockSubscription() {
    return { on: jest.fn() };
}

function makeMockBroker(subscription?: any) {
    return {
        subscribe: jest.fn().mockResolvedValue(subscription ?? makeMockSubscription()),
        publish: jest.fn().mockResolvedValue(undefined),
        shutdown: jest.fn().mockResolvedValue(undefined),
    };
}

const mockLogger: any = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

const mockContext: any = {
    logger: mockLogger,
    middlewareNames: [],
    data: {},
};

// ---------------------------------------------------------------------------
// wireRpcHandlers tests
// ---------------------------------------------------------------------------

describe("hoppity-operations > src > rpc", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    describe("wireRpcHandlers", () => {
        describe("when given an RPC handler", () => {
            let broker: any, subscription: any;
            const userHandler = jest.fn().mockResolvedValue({ price: 99 });

            beforeEach(async () => {
                subscription = makeMockSubscription();
                broker = makeMockBroker(subscription);
                await wireRpcHandlers(broker, [onRpc(rpcContract, userHandler)], mockContext, {
                    validateInbound: false,
                });
            });

            it("should subscribe to the contract's subscriptionName", () => {
                expect(broker.subscribe).toHaveBeenCalledTimes(1);
                expect(broker.subscribe).toHaveBeenCalledWith("pricing_rpc_get_quote");
            });

            it("should attach a message listener", () => {
                expect(subscription.on).toHaveBeenCalledWith("message", expect.any(Function));
            });

            it("should attach an error listener", () => {
                expect(subscription.on).toHaveBeenCalledWith("error", expect.any(Function));
            });
        });

        describe("when given an RPC handler — invalid_content fires", () => {
            let broker: any, subscription: any, ackOrNack: any;
            const contentError = new Error("E_MALFORMED_ENVELOPE");

            beforeEach(async () => {
                ackOrNack = jest.fn();
                subscription = makeMockSubscription();
                broker = makeMockBroker(subscription);

                subscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "invalid_content") {
                        cb(contentError, {}, ackOrNack);
                    }
                });

                await wireRpcHandlers(broker, [onRpc(rpcContract, jest.fn())], mockContext, {
                    validateInbound: false,
                });
            });

            it("should nack with the error and no-requeue strategy", () => {
                expect(ackOrNack).toHaveBeenCalledTimes(1);
                expect(ackOrNack).toHaveBeenCalledWith(contentError, [
                    { strategy: "nack", requeue: false },
                ]);
            });

            it("should log a warning", () => {
                expect(mockLogger.warn).toHaveBeenCalledWith(
                    expect.stringContaining(
                        "Invalid content on RPC subscription 'pricing_rpc_get_quote'"
                    ),
                    contentError
                );
            });
        });

        describe("when subscribe throws on an RPC handler", () => {
            let broker: any, error: any;
            const subscribeError = new Error("E_RPC_QUEUE_NOT_FOUND");

            beforeEach(async () => {
                broker = makeMockBroker();
                broker.subscribe.mockRejectedValue(subscribeError);

                try {
                    await wireRpcHandlers(broker, [onRpc(rpcContract, jest.fn())], mockContext, {
                        validateInbound: false,
                    });
                } catch (e) {
                    error = e;
                }
            });

            it("should re-throw the subscribe error", () => {
                expect(error).toBe(subscribeError);
            });

            it("should log the subscribe error", () => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining("Failed to subscribe to RPC 'pricing_rpc_get_quote'"),
                    subscribeError
                );
            });
        });

        describe("when handler throws a non-Error value", () => {
            let broker: any, subscription: any, ackOrNack: any;
            const userHandler = jest.fn().mockRejectedValue("raw string error");
            const incomingRequest = {
                correlationId: "corr-non-error",
                rpcName: "pricing.getQuote",
                payload: { itemId: "XJ-9000" },
                replyTo: "warehouse_1_reply",
            };

            beforeEach(async () => {
                ackOrNack = jest.fn();
                subscription = makeMockSubscription();
                broker = makeMockBroker(subscription);

                subscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "message") {
                        cb({}, incomingRequest, ackOrNack);
                    }
                });

                await wireRpcHandlers(broker, [onRpc(rpcContract, userHandler)], mockContext, {
                    validateInbound: false,
                });

                await new Promise(r => setTimeout(r, 0));
            });

            it("should publish an error response with 'Unknown error' message", () => {
                expect(broker.publish).toHaveBeenCalledWith(
                    "rpc_reply",
                    expect.objectContaining({
                        error: expect.objectContaining({ message: "Unknown error" }),
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("when a non-RPC handler is in the list", () => {
            let broker: any;

            beforeEach(async () => {
                broker = makeMockBroker();
                await wireRpcHandlers(broker, [onEvent(eventContract, jest.fn())], mockContext, {
                    validateInbound: false,
                });
            });

            it("should skip non-RPC declarations", () => {
                expect(broker.subscribe).not.toHaveBeenCalled();
            });
        });

        describe("when a message arrives and handler succeeds", () => {
            let broker: any, subscription: any, ackOrNack: any;
            const userHandler = jest.fn().mockResolvedValue({ price: 55 });
            const incomingRequest = {
                correlationId: "corr-abc",
                rpcName: "pricing.getQuote",
                payload: { itemId: "XJ-9000" },
                replyTo: "warehouse_1_reply",
            };

            beforeEach(async () => {
                ackOrNack = jest.fn();
                subscription = makeMockSubscription();
                broker = makeMockBroker(subscription);

                subscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "message") {
                        cb({}, incomingRequest, ackOrNack);
                    }
                });

                await wireRpcHandlers(broker, [onRpc(rpcContract, userHandler)], mockContext, {
                    validateInbound: false,
                });

                await new Promise(r => setTimeout(r, 0));
            });

            it("should call the user handler with the request payload", () => {
                expect(userHandler).toHaveBeenCalledTimes(1);
                expect(userHandler).toHaveBeenCalledWith(
                    { itemId: "XJ-9000" },
                    expect.objectContaining({ broker })
                );
            });

            it("should publish the RpcResponse to rpc_reply with correct correlationId", () => {
                expect(broker.publish).toHaveBeenCalledTimes(1);
                expect(broker.publish).toHaveBeenCalledWith(
                    "rpc_reply",
                    { correlationId: "corr-abc", payload: { price: 55 } },
                    { routingKey: "warehouse_1_reply", options: { mandatory: false } }
                );
            });

            it("should ack after publishing the response", () => {
                expect(ackOrNack).toHaveBeenCalledTimes(1);
                expect(ackOrNack).toHaveBeenCalledWith();
            });
        });

        describe("when handler throws", () => {
            let broker: any, subscription: any, ackOrNack: any;
            const handlerError = new Error("E_PRICE_UNAVAILABLE");
            const userHandler = jest.fn().mockRejectedValue(handlerError);
            const incomingRequest = {
                correlationId: "corr-err",
                rpcName: "pricing.getQuote",
                payload: { itemId: "XJ-9000" },
                replyTo: "warehouse_1_reply",
            };

            beforeEach(async () => {
                ackOrNack = jest.fn();
                subscription = makeMockSubscription();
                broker = makeMockBroker(subscription);

                subscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "message") {
                        cb({}, incomingRequest, ackOrNack);
                    }
                });

                await wireRpcHandlers(broker, [onRpc(rpcContract, userHandler)], mockContext, {
                    validateInbound: false,
                });

                await new Promise(r => setTimeout(r, 0));
            });

            it("should publish an error RpcResponse", () => {
                expect(broker.publish).toHaveBeenCalledTimes(1);
                expect(broker.publish).toHaveBeenCalledWith(
                    "rpc_reply",
                    {
                        correlationId: "corr-err",
                        error: {
                            code: RpcErrorCode.HANDLER_ERROR,
                            message: "E_PRICE_UNAVAILABLE",
                        },
                    },
                    { routingKey: "warehouse_1_reply", options: { mandatory: false } }
                );
            });

            it("should ack after publishing the error response", () => {
                expect(ackOrNack).toHaveBeenCalledTimes(1);
                expect(ackOrNack).toHaveBeenCalledWith();
            });

            it("should log the handler error", () => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining("RPC handler error"),
                    handlerError
                );
            });
        });

        describe("when validateInbound is true and request payload is invalid", () => {
            let broker: any, subscription: any, ackOrNack: any;
            const userHandler = jest.fn().mockResolvedValue({ price: 1 });
            const incomingRequest = {
                correlationId: "corr-validation",
                rpcName: "pricing.getQuote",
                // itemId is required but missing
                payload: { wrongField: 123 },
                replyTo: "warehouse_1_reply",
            };

            beforeEach(async () => {
                ackOrNack = jest.fn();
                subscription = makeMockSubscription();
                broker = makeMockBroker(subscription);

                subscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "message") {
                        cb({}, incomingRequest, ackOrNack);
                    }
                });

                await wireRpcHandlers(broker, [onRpc(rpcContract, userHandler)], mockContext, {
                    validateInbound: true,
                });

                await new Promise(r => setTimeout(r, 0));
            });

            it("should not call the user handler", () => {
                expect(userHandler).not.toHaveBeenCalled();
            });

            it("should publish an error response", () => {
                expect(broker.publish).toHaveBeenCalledWith(
                    "rpc_reply",
                    expect.objectContaining({
                        correlationId: "corr-validation",
                        error: expect.objectContaining({ code: RpcErrorCode.HANDLER_ERROR }),
                    }),
                    expect.any(Object)
                );
            });

            it("should log a validation error", () => {
                expect(mockLogger.error).toHaveBeenNthCalledWith(
                    1,
                    expect.stringContaining(
                        "RPC inbound validation failed for 'pricing_rpc_get_quote'"
                    )
                );
            });
        });
    });

    // ---------------------------------------------------------------------------
    // wireRpcOutbound tests
    // ---------------------------------------------------------------------------

    describe("wireRpcOutbound", () => {
        let correlationManager: CorrelationManager;

        beforeEach(() => {
            jest.useRealTimers();
            correlationManager = createCorrelationManager();
        });

        function makeOptions(broker: any, overrides: Partial<any> = {}) {
            return {
                serviceName: "warehouse",
                instanceId: "1",
                replyQueueName: "warehouse_1_reply",
                handlers: [],
                correlationManager,
                defaultTimeout: 5000,
                validateInbound: false,
                validateOutbound: false,
                logger: mockLogger,
                ...overrides,
            };
        }

        describe("when the reply subscription fires an error event", () => {
            let broker: any, replySubscription: any;
            const replyError = new Error("E_REPLY_CHANNEL_CLOSED");

            beforeEach(async () => {
                replySubscription = makeMockSubscription();
                broker = makeMockBroker(replySubscription);

                replySubscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "error") {
                        cb(replyError);
                    }
                });

                await wireRpcOutbound(broker, makeOptions(broker));
            });

            it("should log the reply subscription error", () => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    "[Operations] Reply subscription error:",
                    replyError
                );
            });
        });

        describe("when the reply subscription message handler throws", () => {
            let broker: any, replySubscription: any, ackOrNack: any;

            beforeEach(async () => {
                ackOrNack = jest.fn();
                replySubscription = makeMockSubscription();
                broker = makeMockBroker(replySubscription);

                // Deliver a response with null correlationId — causes correlationManager
                // to return false, but the content itself is valid. We need the try block
                // to throw. Pass null as content to trigger "Cannot read properties of null".
                replySubscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "message") {
                        cb({}, null, ackOrNack);
                    }
                });

                await wireRpcOutbound(broker, makeOptions(broker));
            });

            it("should call ackOrNack with the error", () => {
                expect(ackOrNack).toHaveBeenCalledTimes(1);
                const callArg = ackOrNack.mock.calls[0][0];
                expect(callArg).toBeInstanceOf(Error);
            });

            it("should log the processing error", () => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    "[Operations] Error processing RPC reply:",
                    expect.any(Error)
                );
            });
        });

        describe("when request() is called", () => {
            let broker: any, replySubscription: any, requestPromise: Promise<any>;

            beforeEach(async () => {
                replySubscription = makeMockSubscription();
                broker = makeMockBroker(replySubscription);

                await wireRpcOutbound(broker, makeOptions(broker));

                // Kick off a request without awaiting yet
                requestPromise = (broker as any).request(rpcContract, { itemId: "XJ-9000" });

                await new Promise(r => setTimeout(r, 0));
            });

            it("should publish an RpcRequest envelope to the contract's publicationName", () => {
                expect(broker.publish).toHaveBeenCalledTimes(1);
                const [pubName, envelope] = broker.publish.mock.calls[0];
                expect(pubName).toBe("pricing_rpc_get_quote");
                expect(envelope.rpcName).toBe("pricing.getQuote");
                expect(envelope.payload).toEqual({ itemId: "XJ-9000" });
                expect(envelope.replyTo).toBe("warehouse_1_reply");
                expect(typeof envelope.correlationId).toBe("string");
            });

            it("should include service headers in the envelope", () => {
                const [, envelope] = broker.publish.mock.calls[0];
                expect(envelope.headers).toEqual({
                    "service-name": "warehouse",
                    "instance-id": "1",
                });
            });

            afterEach(() => {
                // Cancel the pending request so it doesn't leak
                const correlationId = broker.publish.mock.calls[0]?.[1]?.correlationId;
                if (correlationId) correlationManager.cancelRequest(correlationId);
                requestPromise.catch(() => {});
            });
        });

        describe("when the reply subscription receives a success response", () => {
            let broker: any, replySubscription: any, result: any;
            let correlationIdUsed: string;

            beforeEach(async () => {
                replySubscription = makeMockSubscription();
                broker = makeMockBroker(replySubscription);

                // Capture the correlationId from the published envelope and immediately
                // simulate a reply arriving on the subscription
                broker.publish.mockImplementation(async (_name: string, envelope: any) => {
                    correlationIdUsed = envelope.correlationId;
                });

                replySubscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "message") {
                        // Simulate reply arriving after subscribe is set up
                        setImmediate(() => {
                            cb(
                                {},
                                { correlationId: correlationIdUsed, payload: { price: 42 } },
                                jest.fn()
                            );
                        });
                    }
                });

                await wireRpcOutbound(broker, makeOptions(broker));

                result = await (broker as any).request(rpcContract, { itemId: "XJ-9000" });
            });

            it("should resolve with the response payload", () => {
                expect(result).toEqual({ price: 42 });
            });
        });

        describe("when the reply subscription receives an error response", () => {
            let broker: any, replySubscription: any, error: any;
            let correlationIdUsed: string;

            beforeEach(async () => {
                replySubscription = makeMockSubscription();
                broker = makeMockBroker(replySubscription);

                broker.publish.mockImplementation(async (_name: string, envelope: any) => {
                    correlationIdUsed = envelope.correlationId;
                });

                replySubscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "message") {
                        setImmediate(() => {
                            cb(
                                {},
                                {
                                    correlationId: correlationIdUsed,
                                    error: { code: "E_COLD_CALZONE", message: "No pizza for you" },
                                },
                                jest.fn()
                            );
                        });
                    }
                });

                await wireRpcOutbound(broker, makeOptions(broker));

                try {
                    await (broker as any).request(rpcContract, { itemId: "XJ-9000" });
                } catch (e) {
                    error = e;
                }
            });

            it("should reject with the error message from the response", () => {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toBe("No pizza for you");
            });
        });

        describe("when request times out", () => {
            let broker: any, replySubscription: any, error: any;

            beforeEach(done => {
                jest.useFakeTimers();
                replySubscription = makeMockSubscription();
                broker = makeMockBroker(replySubscription);

                // wireRpcOutbound is async; broker.subscribe resolves synchronously in
                // the mock so .then() fires before fake timers are relevant.
                wireRpcOutbound(broker, makeOptions(broker, { defaultTimeout: 1000 })).then(() => {
                    const requestPromise = (broker as any).request(rpcContract, {
                        itemId: "XJ-9000",
                    });
                    requestPromise
                        .catch((e: Error) => {
                            error = e;
                        })
                        .finally(() => {
                            jest.useRealTimers();
                            done();
                        });

                    // Let the publish microtask settle, then advance time past the timeout
                    Promise.resolve().then(() => {
                        jest.advanceTimersByTime(1001);
                    });
                });
            });

            it("should reject with a timeout error", () => {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toContain("timed out");
            });
        });

        describe("cancelRequest", () => {
            let broker: any, replySubscription: any, error: any;
            let pendingPromise: Promise<any>;

            beforeEach(async () => {
                replySubscription = makeMockSubscription();
                broker = makeMockBroker(replySubscription);

                await wireRpcOutbound(broker, makeOptions(broker));

                pendingPromise = (broker as any).request(rpcContract, { itemId: "XJ-9000" });
                await new Promise(r => setTimeout(r, 0));

                const correlationId = broker.publish.mock.calls[0][1].correlationId;
                (broker as any).cancelRequest(correlationId);

                try {
                    await pendingPromise;
                } catch (e) {
                    error = e;
                }
            });

            it("should reject the pending request with a cancellation error", () => {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toBe("RPC request cancelled");
            });
        });

        describe("when validateOutbound is true and payload is invalid", () => {
            let broker: any, replySubscription: any, error: any;

            beforeEach(async () => {
                replySubscription = makeMockSubscription();
                broker = makeMockBroker(replySubscription);

                await wireRpcOutbound(broker, makeOptions(broker, { validateOutbound: true }));

                // rpcContract.requestSchema expects { itemId: string }
                try {
                    await (broker as any).request(rpcContract, { wrongField: 123 });
                } catch (e) {
                    error = e;
                }
            });

            it("should throw a ZodError without publishing", () => {
                expect(error).toBeDefined();
                expect(broker.publish).not.toHaveBeenCalled();
            });
        });

        describe("when validateInbound is true and response payload is invalid", () => {
            let broker: any, replySubscription: any, error: any;
            let correlationIdUsed: string;

            beforeEach(async () => {
                replySubscription = makeMockSubscription();
                broker = makeMockBroker(replySubscription);

                broker.publish.mockImplementation(async (_name: string, envelope: any) => {
                    correlationIdUsed = envelope.correlationId;
                });

                replySubscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "message") {
                        setImmediate(() => {
                            // Response missing required 'price' field
                            cb(
                                {},
                                {
                                    correlationId: correlationIdUsed,
                                    payload: { wrongField: "oops" },
                                },
                                jest.fn()
                            );
                        });
                    }
                });

                await wireRpcOutbound(broker, makeOptions(broker, { validateInbound: true }));

                try {
                    await (broker as any).request(rpcContract, { itemId: "XJ-9000" });
                } catch (e) {
                    error = e;
                }
            });

            it("should reject with a ZodError for the malformed response", () => {
                expect(error).toBeDefined();
            });
        });

        describe("shutdown", () => {
            let broker: any, replySubscription: any, pendingError: any, originalShutdown: any;
            let pendingPromise: Promise<any>;

            beforeEach(async () => {
                replySubscription = makeMockSubscription();
                broker = makeMockBroker(replySubscription);

                // Capture the original shutdown mock before wireRpcOutbound wraps it
                originalShutdown = broker.shutdown;

                await wireRpcOutbound(broker, makeOptions(broker));

                pendingPromise = (broker as any).request(rpcContract, { itemId: "XJ-9000" });
                await new Promise(r => setTimeout(r, 0));

                await broker.shutdown();

                try {
                    await pendingPromise;
                } catch (e) {
                    pendingError = e;
                }
            });

            it("should reject all pending requests on shutdown", () => {
                expect(pendingError).toBeInstanceOf(Error);
                expect(pendingError.message).toBe("RPC manager cleanup");
            });

            it("should call the original shutdown", () => {
                expect(originalShutdown).toHaveBeenCalledTimes(1);
            });
        });
    });
});
