/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import { z } from "zod";
import { wireHandlers, wireEventCommandOutbound } from "./wireHandlers";
import { EventContract, CommandContract, RpcContract } from "@apogeelabs/hoppity-contracts";
import { onEvent, onRpc } from "./handlers";

// ---------------------------------------------------------------------------
// Shared test contracts
// ---------------------------------------------------------------------------

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

const commandContract: CommandContract = {
    _type: "command",
    _domain: "inventory",
    _name: "reserve",
    schema: z.object({ itemId: z.string(), quantity: z.number() }),
    exchange: "inventory",
    routingKey: "inventory.command.reserve",
    publicationName: "inventory_command_reserve",
    subscriptionName: "inventory_command_reserve",
};

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

// ---------------------------------------------------------------------------
// Broker mock helpers
// ---------------------------------------------------------------------------

function makeMockSubscription() {
    return {
        on: jest.fn(),
    };
}

function makeMockBroker(subscription?: any) {
    return {
        subscribe: jest.fn().mockResolvedValue(subscription ?? makeMockSubscription()),
        publish: jest.fn().mockResolvedValue(undefined),
    };
}

const mockContext: any = {
    logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
    middlewareNames: [],
    data: {},
};

// ---------------------------------------------------------------------------
// wireHandlers tests
// ---------------------------------------------------------------------------

describe("hoppity-operations > src > wireHandlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    describe("wireHandlers", () => {
        describe("when given an event handler", () => {
            let broker: any, subscription: any;
            const userHandler = jest.fn();

            beforeEach(async () => {
                subscription = makeMockSubscription();
                broker = makeMockBroker(subscription);
                await wireHandlers(broker, [onEvent(eventContract, userHandler)], mockContext, {
                    validateInbound: false,
                });
            });

            it("should subscribe to the contract's subscriptionName", () => {
                expect(broker.subscribe).toHaveBeenCalledTimes(1);
                expect(broker.subscribe).toHaveBeenCalledWith("order_event_placed");
            });

            it("should attach a message listener", () => {
                expect(subscription.on).toHaveBeenCalledWith("message", expect.any(Function));
            });

            it("should attach an error listener", () => {
                expect(subscription.on).toHaveBeenCalledWith("error", expect.any(Function));
            });

            it("should attach an invalid_content listener", () => {
                expect(subscription.on).toHaveBeenCalledWith(
                    "invalid_content",
                    expect.any(Function)
                );
            });
        });

        describe("when a message arrives and handler succeeds", () => {
            let broker: any, subscription: any, ackOrNack: any;
            const userHandler = jest.fn().mockResolvedValue(undefined);

            beforeEach(async () => {
                ackOrNack = jest.fn();
                subscription = makeMockSubscription();
                broker = makeMockBroker(subscription);

                subscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "message") {
                        cb({}, { orderId: "8675309" }, ackOrNack);
                    }
                });

                await wireHandlers(broker, [onEvent(eventContract, userHandler)], mockContext, {
                    validateInbound: false,
                });
            });

            it("should call the user handler with the message content", () => {
                expect(userHandler).toHaveBeenCalledTimes(1);
                expect(userHandler).toHaveBeenCalledWith(
                    { orderId: "8675309" },
                    expect.objectContaining({ broker })
                );
            });

            it("should auto-ack after the handler resolves", () => {
                expect(ackOrNack).toHaveBeenCalledTimes(1);
                expect(ackOrNack).toHaveBeenCalledWith();
            });
        });

        describe("when a message arrives and handler throws", () => {
            let broker: any, subscription: any, ackOrNack: any;
            const handlerError = new Error("E_SOGGY_STROMBOLI");
            const userHandler = jest.fn().mockRejectedValue(handlerError);

            beforeEach(async () => {
                ackOrNack = jest.fn();
                subscription = makeMockSubscription();
                broker = makeMockBroker(subscription);

                subscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "message") {
                        cb({}, { orderId: "8675309" }, ackOrNack);
                    }
                });

                await wireHandlers(broker, [onEvent(eventContract, userHandler)], mockContext, {
                    validateInbound: false,
                });

                // Give the async handler time to reject
                await new Promise(r => setTimeout(r, 0));
            });

            it("should nack with the error and no-requeue strategy", () => {
                expect(ackOrNack).toHaveBeenCalledTimes(1);
                expect(ackOrNack).toHaveBeenCalledWith(handlerError, [
                    { strategy: "nack", requeue: false },
                ]);
            });

            it("should log the handler error", () => {
                expect(mockContext.logger.error).toHaveBeenCalledWith(
                    expect.stringContaining("Handler error"),
                    handlerError
                );
            });
        });

        describe("when validateInbound is true and content fails schema", () => {
            let broker: any, subscription: any, ackOrNack: any;
            const userHandler = jest.fn();

            beforeEach(async () => {
                ackOrNack = jest.fn();
                subscription = makeMockSubscription();
                broker = makeMockBroker(subscription);

                // orderId is required but missing — zod parse will fail
                subscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "message") {
                        cb({}, { wrongField: "abc" }, ackOrNack);
                    }
                });

                await wireHandlers(broker, [onEvent(eventContract, userHandler)], mockContext, {
                    validateInbound: true,
                });

                await new Promise(r => setTimeout(r, 0));
            });

            it("should not call the user handler", () => {
                expect(userHandler).not.toHaveBeenCalled();
            });

            it("should nack the message", () => {
                expect(ackOrNack).toHaveBeenCalledTimes(1);
                expect(ackOrNack.mock.calls[0][1]).toEqual([{ strategy: "nack", requeue: false }]);
            });

            it("should log a validation error", () => {
                expect(mockContext.logger.error).toHaveBeenCalledWith(
                    expect.stringContaining("Inbound validation failed for 'order_event_placed'")
                );
            });
        });

        describe("when validateInbound is false and content is invalid", () => {
            let broker: any, subscription: any, ackOrNack: any;
            const userHandler = jest.fn().mockResolvedValue(undefined);

            beforeEach(async () => {
                ackOrNack = jest.fn();
                subscription = makeMockSubscription();
                broker = makeMockBroker(subscription);

                subscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "message") {
                        cb({}, { wrongField: "abc" }, ackOrNack);
                    }
                });

                await wireHandlers(broker, [onEvent(eventContract, userHandler)], mockContext, {
                    validateInbound: false,
                });

                await new Promise(r => setTimeout(r, 0));
            });

            it("should still call the user handler (no validation)", () => {
                expect(userHandler).toHaveBeenCalledTimes(1);
            });

            it("should ack the message", () => {
                expect(ackOrNack).toHaveBeenCalledWith();
            });
        });

        describe("when invalid_content fires on the subscription", () => {
            let broker: any, subscription: any, ackOrNack: any;
            const contentError = new Error("E_MALFORMED_JSON");

            beforeEach(async () => {
                ackOrNack = jest.fn();
                subscription = makeMockSubscription();
                broker = makeMockBroker(subscription);

                subscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "invalid_content") {
                        cb(contentError, {}, ackOrNack);
                    }
                });

                await wireHandlers(broker, [onEvent(eventContract, jest.fn())], mockContext, {
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
                expect(mockContext.logger.warn).toHaveBeenCalledWith(
                    expect.stringContaining("Invalid content on subscription 'order_event_placed'"),
                    contentError
                );
            });
        });

        describe("when a message arrives and handler throws a non-Error value", () => {
            let broker: any, subscription: any, ackOrNack: any;
            const userHandler = jest.fn().mockRejectedValue("some plain string error");

            beforeEach(async () => {
                ackOrNack = jest.fn();
                subscription = makeMockSubscription();
                broker = makeMockBroker(subscription);

                subscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "message") {
                        cb({}, { orderId: "8675309" }, ackOrNack);
                    }
                });

                await wireHandlers(broker, [onEvent(eventContract, userHandler)], mockContext, {
                    validateInbound: false,
                });

                await new Promise(r => setTimeout(r, 0));
            });

            it("should nack with a wrapped Error object", () => {
                expect(ackOrNack).toHaveBeenCalledTimes(1);
                const callArgs = ackOrNack.mock.calls[0];
                expect(callArgs[0]).toBeInstanceOf(Error);
                expect(callArgs[1]).toEqual([{ strategy: "nack", requeue: false }]);
            });
        });

        describe("when the subscription error event fires", () => {
            let broker: any, subscription: any;
            const subscriptionError = new Error("E_CHANNEL_GONE");

            beforeEach(async () => {
                subscription = makeMockSubscription();
                broker = makeMockBroker(subscription);

                subscription.on.mockImplementation((event: string, cb: any) => {
                    if (event === "error") {
                        cb(subscriptionError);
                    }
                });

                await wireHandlers(broker, [onEvent(eventContract, jest.fn())], mockContext, {
                    validateInbound: false,
                });
            });

            it("should log a warning with the error", () => {
                expect(mockContext.logger.warn).toHaveBeenCalledWith(
                    expect.stringContaining("Subscription error on 'order_event_placed'"),
                    subscriptionError
                );
            });
        });

        describe("when an RPC handler declaration is present", () => {
            let broker: any;

            beforeEach(async () => {
                broker = makeMockBroker();
                await wireHandlers(broker, [onRpc(rpcContract, jest.fn())], mockContext, {
                    validateInbound: false,
                });
            });

            it("should skip the RPC declaration (not subscribe)", () => {
                expect(broker.subscribe).not.toHaveBeenCalled();
            });
        });

        describe("when subscribe throws", () => {
            let broker: any, error: any;
            const subscribeError = new Error("E_QUEUE_NOT_FOUND");

            beforeEach(async () => {
                broker = makeMockBroker();
                broker.subscribe.mockRejectedValue(subscribeError);

                try {
                    await wireHandlers(broker, [onEvent(eventContract, jest.fn())], mockContext, {
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
                expect(mockContext.logger.error).toHaveBeenCalledWith(
                    expect.stringContaining("Failed to subscribe"),
                    subscribeError
                );
            });
        });
    });

    // ---------------------------------------------------------------------------
    // wireEventCommandOutbound tests
    // ---------------------------------------------------------------------------

    describe("wireEventCommandOutbound", () => {
        describe("when validateOutbound is false", () => {
            describe("publishEvent", () => {
                let broker: any;

                beforeEach(async () => {
                    broker = makeMockBroker();
                    wireEventCommandOutbound(broker, { validateOutbound: false });
                    await (broker as any).publishEvent(eventContract, { orderId: "8675309" });
                });

                it("should publish to the contract's publicationName", () => {
                    expect(broker.publish).toHaveBeenCalledTimes(1);
                    expect(broker.publish).toHaveBeenCalledWith(
                        "order_event_placed",
                        { orderId: "8675309" },
                        undefined
                    );
                });
            });

            describe("sendCommand", () => {
                let broker: any;

                beforeEach(async () => {
                    broker = makeMockBroker();
                    wireEventCommandOutbound(broker, { validateOutbound: false });
                    await (broker as any).sendCommand(commandContract, {
                        itemId: "abc",
                        quantity: 5,
                    });
                });

                it("should publish to the contract's publicationName", () => {
                    expect(broker.publish).toHaveBeenCalledTimes(1);
                    expect(broker.publish).toHaveBeenCalledWith(
                        "inventory_command_reserve",
                        { itemId: "abc", quantity: 5 },
                        undefined
                    );
                });
            });
        });

        describe("when validateOutbound is true and payload is invalid", () => {
            let broker: any, error: any;

            beforeEach(async () => {
                broker = makeMockBroker();
                wireEventCommandOutbound(broker, { validateOutbound: true });

                // eventContract.schema expects { orderId: string } — missing field
                try {
                    await (broker as any).publishEvent(eventContract, { wrongField: 99 });
                } catch (e) {
                    error = e;
                }
            });

            it("should throw a ZodError without calling broker.publish", () => {
                expect(error).toBeDefined();
                expect(broker.publish).not.toHaveBeenCalled();
            });
        });
    });
});
