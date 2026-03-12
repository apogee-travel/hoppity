/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import { z } from "zod";
import { defineDomain } from "../contracts/defineDomain";
import { DelayedDeliveryErrorCode } from "./delayedDeliveryTypes";

const mockSubscribe = jest.fn();
const mockPublish = jest.fn();
const mockBroker = {
    subscribe: mockSubscribe,
    publish: mockPublish,
};
jest.mock("rascal", () => ({}));

const DelayedDomain = defineDomain("snacks", {
    events: {
        nacho_ready: {
            schema: z.object({ orderId: z.string() }),
            delay: { default: 5_000 },
        },
    },
    commands: {
        prepareNachos: {
            schema: z.object({ orderId: z.string() }),
            delay: true,
        },
    },
});

const MOCK_CONTEXT = {
    data: {},
    middlewareNames: [],
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
    serviceName: "snack-service",
};

describe("hoppity > broker > wireDelayedDelivery", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    describe("when wiring a single delay-capable event contract", () => {
        let mockSub: any;

        beforeEach(async () => {
            mockSub = { on: jest.fn() };
            mockSubscribe.mockResolvedValue(mockSub);
            const { wireDelayedDelivery } = await import("./delayedDelivery");

            await wireDelayedDelivery(
                mockBroker as any,
                [DelayedDomain.events.nacho_ready],
                MOCK_CONTEXT as any
            );
        });

        it("should subscribe to the ready subscription for the contract", () => {
            expect(mockSubscribe).toHaveBeenCalledTimes(1);
            expect(mockSubscribe).toHaveBeenCalledWith("snacks_event_nacho_ready_ready");
        });

        it("should register a message handler on the subscription", () => {
            expect(mockSub.on).toHaveBeenCalledWith("message", expect.any(Function));
        });

        it("should register an error handler on the subscription", () => {
            expect(mockSub.on).toHaveBeenCalledWith("error", expect.any(Function));
        });
    });

    describe("when wiring multiple delay-capable contracts", () => {
        let mockSub: any;

        beforeEach(async () => {
            mockSub = { on: jest.fn() };
            mockSubscribe.mockResolvedValue(mockSub);
            const { wireDelayedDelivery } = await import("./delayedDelivery");

            await wireDelayedDelivery(
                mockBroker as any,
                [DelayedDomain.events.nacho_ready, DelayedDomain.commands.prepareNachos],
                MOCK_CONTEXT as any
            );
        });

        it("should subscribe once per contract", () => {
            expect(mockSubscribe).toHaveBeenCalledTimes(2);
        });
    });

    describe("when a ready queue message is processed successfully", () => {
        let ackOrNackSpy: jest.Mock, mockSub: any;

        beforeEach(async () => {
            ackOrNackSpy = jest.fn();
            mockSub = { on: jest.fn() };
            mockPublish.mockResolvedValue(undefined);
            mockSubscribe.mockImplementation(async (_subName: string) => mockSub);

            const { wireDelayedDelivery } = await import("./delayedDelivery");

            // Capture the message handler so we can invoke it
            mockSub.on.mockImplementation((event: string, cb: any) => {
                if (event === "message") {
                    // Invoke the message handler with a valid envelope
                    const envelope = {
                        originalMessage: { orderId: "ORDER-8675309" },
                        originalPublication: "snacks_event_nacho_ready",
                        targetDelay: 5_000,
                        createdAt: Date.now(),
                        retryCount: 0,
                    };
                    cb({}, envelope, ackOrNackSpy);
                }
            });

            await wireDelayedDelivery(
                mockBroker as any,
                [DelayedDomain.events.nacho_ready],
                MOCK_CONTEXT as any
            );

            // Allow the async message handler to settle
            await new Promise(res => setTimeout(res, 0));
        });

        it("should re-publish to the original publication", () => {
            expect(mockPublish).toHaveBeenCalledTimes(1);
            expect(mockPublish).toHaveBeenCalledWith(
                "snacks_event_nacho_ready",
                { orderId: "ORDER-8675309" },
                expect.objectContaining({ options: { mandatory: true } })
            );
        });

        it("should ack the message", () => {
            expect(ackOrNackSpy).toHaveBeenCalledTimes(1);
            expect(ackOrNackSpy).toHaveBeenCalledWith();
        });
    });

    describe("when a ready queue message re-publish fails and retry-enqueue succeeds", () => {
        let ackOrNackSpy: jest.Mock, mockSub: any;

        beforeEach(async () => {
            ackOrNackSpy = jest.fn();
            mockSub = { on: jest.fn() };
            // First publish (re-publish) fails; second publish (retry to wait queue) succeeds
            mockPublish
                .mockRejectedValueOnce(new Error("E_OVERCOOKED_NACHO"))
                .mockResolvedValueOnce(undefined);
            mockSubscribe.mockResolvedValue(mockSub);

            const { wireDelayedDelivery } = await import("./delayedDelivery");

            mockSub.on.mockImplementation((event: string, cb: any) => {
                if (event === "message") {
                    const envelope = {
                        originalMessage: { orderId: "ORDER-555" },
                        originalPublication: "snacks_event_nacho_ready",
                        targetDelay: 5_000,
                        createdAt: Date.now(),
                        retryCount: 0,
                    };
                    cb({}, envelope, ackOrNackSpy);
                }
            });

            await wireDelayedDelivery(
                mockBroker as any,
                [DelayedDomain.events.nacho_ready],
                MOCK_CONTEXT as any,
                { maxRetries: 5, retryDelay: 500 }
            );

            await new Promise(res => setTimeout(res, 0));
        });

        it("should publish the retry envelope to the wait queue", () => {
            expect(mockPublish).toHaveBeenCalledTimes(2);
            expect(mockPublish).toHaveBeenNthCalledWith(
                2,
                "snacks_event_nacho_ready_delayed",
                expect.objectContaining({ retryCount: 1 }),
                expect.objectContaining({ options: { expiration: 500, persistent: true } })
            );
        });

        it("should ack the ready queue message after successful retry-enqueue", () => {
            expect(ackOrNackSpy).toHaveBeenCalledTimes(1);
            expect(ackOrNackSpy).toHaveBeenCalledWith();
        });

        it("should not log an error when retry-enqueue succeeds", () => {
            expect(MOCK_CONTEXT.logger.error).not.toHaveBeenCalled();
        });
    });

    describe("when a ready queue message re-publish fails and retry-enqueue also fails", () => {
        let ackOrNackSpy: jest.Mock, mockSub: any;

        beforeEach(async () => {
            ackOrNackSpy = jest.fn();
            mockSub = { on: jest.fn() };
            // Both the re-publish and the retry-enqueue fail
            mockPublish
                .mockRejectedValueOnce(new Error("E_OVERCOOKED_NACHO"))
                .mockRejectedValueOnce(new Error("E_WAIT_QUEUE_UNAVAILABLE"));
            mockSubscribe.mockResolvedValue(mockSub);

            const { wireDelayedDelivery } = await import("./delayedDelivery");

            mockSub.on.mockImplementation((event: string, cb: any) => {
                if (event === "message") {
                    const envelope = {
                        originalMessage: { orderId: "ORDER-666" },
                        originalPublication: "snacks_event_nacho_ready",
                        targetDelay: 5_000,
                        createdAt: Date.now(),
                        retryCount: 0,
                    };
                    cb({}, envelope, ackOrNackSpy);
                }
            });

            await wireDelayedDelivery(
                mockBroker as any,
                [DelayedDomain.events.nacho_ready],
                MOCK_CONTEXT as any,
                { maxRetries: 5, retryDelay: 500 }
            );

            await new Promise(res => setTimeout(res, 0));
        });

        it("should attempt both publishes", () => {
            expect(mockPublish).toHaveBeenCalledTimes(2);
        });

        it("should nack the ready queue message so Rascal redelivery applies", () => {
            expect(ackOrNackSpy).toHaveBeenCalledTimes(1);
            expect(ackOrNackSpy).toHaveBeenCalledWith(expect.any(Error));
        });

        it("should log the error", () => {
            expect(MOCK_CONTEXT.logger.error).toHaveBeenCalledTimes(1);
        });
    });

    describe("when a ready queue message exhausts all retries", () => {
        let ackOrNackSpy: jest.Mock, mockSub: any;

        beforeEach(async () => {
            ackOrNackSpy = jest.fn();
            mockSub = { on: jest.fn() };
            // First publish (re-publish) fails; second publish (error queue routing) succeeds
            mockPublish
                .mockRejectedValueOnce(new Error("E_BURNT_BEYOND_RECOGNITION"))
                .mockResolvedValueOnce(undefined);
            mockSubscribe.mockResolvedValue(mockSub);

            const { wireDelayedDelivery } = await import("./delayedDelivery");

            mockSub.on.mockImplementation((event: string, cb: any) => {
                if (event === "message") {
                    const envelope = {
                        originalMessage: { orderId: "ORDER-007" },
                        originalPublication: "snacks_event_nacho_ready",
                        targetDelay: 5_000,
                        createdAt: Date.now(),
                        // retryCount already at maxRetries — this is the last attempt
                        retryCount: 5,
                    };
                    cb({}, envelope, ackOrNackSpy);
                }
            });

            await wireDelayedDelivery(
                mockBroker as any,
                [DelayedDomain.events.nacho_ready],
                MOCK_CONTEXT as any,
                { maxRetries: 5 }
            );

            await new Promise(res => setTimeout(res, 0));
        });

        it("should publish to the error queue", () => {
            expect(mockPublish).toHaveBeenCalledTimes(2);
            expect(mockPublish).toHaveBeenNthCalledWith(
                2,
                "snacks_event_nacho_ready_errors",
                expect.objectContaining({
                    errorCode: DelayedDeliveryErrorCode.MAX_RETRIES_EXCEEDED,
                }),
                expect.objectContaining({ options: { persistent: true } })
            );
        });

        it("should ack the message after routing to error queue", () => {
            expect(ackOrNackSpy).toHaveBeenCalledTimes(1);
            expect(ackOrNackSpy).toHaveBeenCalledWith();
        });

        it("should log the error after routing to the error queue", () => {
            expect(MOCK_CONTEXT.logger.error).toHaveBeenCalledTimes(1);
        });
    });

    describe("when max retries exhausted and error queue publish also fails", () => {
        let ackOrNackSpy: jest.Mock, mockSub: any;

        beforeEach(async () => {
            ackOrNackSpy = jest.fn();
            mockSub = { on: jest.fn() };
            // First publish (re-publish) fails; second publish (error queue) also fails
            mockPublish
                .mockRejectedValueOnce(new Error("E_BURNT_BEYOND_RECOGNITION"))
                .mockRejectedValueOnce(new Error("E_ERROR_QUEUE_UNAVAILABLE"));
            mockSubscribe.mockResolvedValue(mockSub);

            const { wireDelayedDelivery } = await import("./delayedDelivery");

            mockSub.on.mockImplementation((event: string, cb: any) => {
                if (event === "message") {
                    const envelope = {
                        originalMessage: { orderId: "ORDER-404" },
                        originalPublication: "snacks_event_nacho_ready",
                        targetDelay: 5_000,
                        createdAt: Date.now(),
                        // retryCount already at maxRetries — this is the last attempt
                        retryCount: 5,
                    };
                    cb({}, envelope, ackOrNackSpy);
                }
            });

            await wireDelayedDelivery(
                mockBroker as any,
                [DelayedDomain.events.nacho_ready],
                MOCK_CONTEXT as any,
                { maxRetries: 5 }
            );

            await new Promise(res => setTimeout(res, 0));
        });

        it("should attempt both the re-publish and the error queue publish", () => {
            expect(mockPublish).toHaveBeenCalledTimes(2);
        });

        it("should nack the ready queue message so Rascal redelivery applies", () => {
            expect(ackOrNackSpy).toHaveBeenCalledTimes(1);
            expect(ackOrNackSpy).toHaveBeenCalledWith(expect.any(Error));
        });

        it("should log the error", () => {
            expect(MOCK_CONTEXT.logger.error).toHaveBeenCalledTimes(1);
        });
    });

    describe("when the ready subscription emits an error event", () => {
        let mockSub: any;

        beforeEach(async () => {
            mockSub = { on: jest.fn() };
            mockSubscribe.mockResolvedValue(mockSub);

            const { wireDelayedDelivery } = await import("./delayedDelivery");

            mockSub.on.mockImplementation((event: string, cb: any) => {
                if (event === "error") {
                    cb(new Error("E_SUBSCRIPTION_BLEW_UP"));
                }
            });

            await wireDelayedDelivery(
                mockBroker as any,
                [DelayedDomain.events.nacho_ready],
                MOCK_CONTEXT as any
            );
        });

        it("should log the subscription error", () => {
            expect(MOCK_CONTEXT.logger.error).toHaveBeenCalledTimes(1);
            expect(MOCK_CONTEXT.logger.error).toHaveBeenCalledWith(
                expect.stringContaining("snacks_event_nacho_ready_ready"),
                expect.any(Error)
            );
        });
    });

    describe("when no delay-capable contracts are provided", () => {
        beforeEach(async () => {
            const { wireDelayedDelivery } = await import("./delayedDelivery");

            await wireDelayedDelivery(mockBroker as any, [], MOCK_CONTEXT as any);
        });

        it("should not subscribe to anything", () => {
            expect(mockSubscribe).not.toHaveBeenCalled();
        });
    });

    describe("when an envelope has retryCount missing (defaults to 0)", () => {
        let ackOrNackSpy: jest.Mock, mockSub: any;

        beforeEach(async () => {
            ackOrNackSpy = jest.fn();
            mockSub = { on: jest.fn() };
            // Re-publish fails; retry-enqueue succeeds
            mockPublish
                .mockRejectedValueOnce(new Error("E_COLD_CALZONE"))
                .mockResolvedValueOnce(undefined);
            mockSubscribe.mockResolvedValue(mockSub);

            const { wireDelayedDelivery } = await import("./delayedDelivery");

            mockSub.on.mockImplementation((event: string, cb: any) => {
                if (event === "message") {
                    // retryCount intentionally omitted — the handler should default it to 0
                    const envelope = {
                        originalMessage: { orderId: "ORDER-CALZONE-1" },
                        originalPublication: "snacks_event_nacho_ready",
                        targetDelay: 5_000,
                        createdAt: Date.now(),
                        // retryCount deliberately absent
                    };
                    cb({}, envelope, ackOrNackSpy);
                }
            });

            await wireDelayedDelivery(
                mockBroker as any,
                [DelayedDomain.events.nacho_ready],
                MOCK_CONTEXT as any,
                { maxRetries: 5, retryDelay: 250 }
            );

            await new Promise(res => setTimeout(res, 0));
        });

        it("should treat missing retryCount as 0 and enqueue retry with retryCount: 1", () => {
            expect(mockPublish).toHaveBeenNthCalledWith(
                2,
                "snacks_event_nacho_ready_delayed",
                expect.objectContaining({ retryCount: 1 }),
                expect.any(Object)
            );
        });

        it("should ack after successful retry-enqueue", () => {
            expect(ackOrNackSpy).toHaveBeenCalledTimes(1);
            expect(ackOrNackSpy).toHaveBeenCalledWith();
        });
    });

    describe("when retryCount is exactly maxRetries - 1 (one attempt remaining before max)", () => {
        let ackOrNackSpy: jest.Mock, mockSub: any;

        beforeEach(async () => {
            ackOrNackSpy = jest.fn();
            mockSub = { on: jest.fn() };
            // Re-publish fails; retry-enqueue succeeds (still under maxRetries)
            mockPublish
                .mockRejectedValueOnce(new Error("E_STILL_SOGGY"))
                .mockResolvedValueOnce(undefined);
            mockSubscribe.mockResolvedValue(mockSub);

            const { wireDelayedDelivery } = await import("./delayedDelivery");

            mockSub.on.mockImplementation((event: string, cb: any) => {
                if (event === "message") {
                    const envelope = {
                        originalMessage: { orderId: "ORDER-PENNULTIMATE" },
                        originalPublication: "snacks_event_nacho_ready",
                        targetDelay: 5_000,
                        createdAt: Date.now(),
                        // maxRetries is 3; retryCount 2 means one attempt remains
                        retryCount: 2,
                    };
                    cb({}, envelope, ackOrNackSpy);
                }
            });

            await wireDelayedDelivery(
                mockBroker as any,
                [DelayedDomain.events.nacho_ready],
                MOCK_CONTEXT as any,
                { maxRetries: 3, retryDelay: 100 }
            );

            await new Promise(res => setTimeout(res, 0));
        });

        it("should re-enqueue to the wait queue (not the error queue)", () => {
            expect(mockPublish).toHaveBeenNthCalledWith(
                2,
                "snacks_event_nacho_ready_delayed",
                expect.objectContaining({ retryCount: 3 }),
                expect.any(Object)
            );
        });

        it("should ack the ready queue message after re-enqueue", () => {
            expect(ackOrNackSpy).toHaveBeenCalledWith();
        });
    });

    describe("when retryCount is exactly maxRetries (boundary: route to error queue)", () => {
        let ackOrNackSpy: jest.Mock, mockSub: any;

        beforeEach(async () => {
            ackOrNackSpy = jest.fn();
            mockSub = { on: jest.fn() };
            // Re-publish fails; error queue publish succeeds
            mockPublish
                .mockRejectedValueOnce(new Error("E_CRISPY_BEYOND_HOPE"))
                .mockResolvedValueOnce(undefined);
            mockSubscribe.mockResolvedValue(mockSub);

            const { wireDelayedDelivery } = await import("./delayedDelivery");

            mockSub.on.mockImplementation((event: string, cb: any) => {
                if (event === "message") {
                    const envelope = {
                        originalMessage: { orderId: "ORDER-AT-MAX" },
                        originalPublication: "snacks_event_nacho_ready",
                        targetDelay: 5_000,
                        createdAt: Date.now(),
                        // retryCount equals maxRetries — must route to error queue, not re-enqueue
                        retryCount: 3,
                    };
                    cb({}, envelope, ackOrNackSpy);
                }
            });

            await wireDelayedDelivery(
                mockBroker as any,
                [DelayedDomain.events.nacho_ready],
                MOCK_CONTEXT as any,
                { maxRetries: 3 }
            );

            await new Promise(res => setTimeout(res, 0));
        });

        it("should publish to the error queue, not the wait queue", () => {
            expect(mockPublish).toHaveBeenNthCalledWith(
                2,
                "snacks_event_nacho_ready_errors",
                expect.objectContaining({
                    errorCode: DelayedDeliveryErrorCode.MAX_RETRIES_EXCEEDED,
                }),
                expect.any(Object)
            );
        });

        it("should ack after routing to the error queue", () => {
            expect(ackOrNackSpy).toHaveBeenCalledWith();
        });
    });

    describe("when retryCount exceeds maxRetries (defensive: also routes to error queue)", () => {
        let ackOrNackSpy: jest.Mock, mockSub: any;

        beforeEach(async () => {
            ackOrNackSpy = jest.fn();
            mockSub = { on: jest.fn() };
            // Re-publish fails; error queue publish succeeds
            mockPublish
                .mockRejectedValueOnce(new Error("E_BEYOND_MAX"))
                .mockResolvedValueOnce(undefined);
            mockSubscribe.mockResolvedValue(mockSub);

            const { wireDelayedDelivery } = await import("./delayedDelivery");

            mockSub.on.mockImplementation((event: string, cb: any) => {
                if (event === "message") {
                    const envelope = {
                        originalMessage: { orderId: "ORDER-OVER-MAX" },
                        originalPublication: "snacks_event_nacho_ready",
                        targetDelay: 5_000,
                        createdAt: Date.now(),
                        // retryCount beyond maxRetries — still must not re-enqueue
                        retryCount: 99,
                    };
                    cb({}, envelope, ackOrNackSpy);
                }
            });

            await wireDelayedDelivery(
                mockBroker as any,
                [DelayedDomain.events.nacho_ready],
                MOCK_CONTEXT as any,
                { maxRetries: 3 }
            );

            await new Promise(res => setTimeout(res, 0));
        });

        it("should publish to the error queue", () => {
            expect(mockPublish).toHaveBeenNthCalledWith(
                2,
                "snacks_event_nacho_ready_errors",
                expect.objectContaining({
                    errorCode: DelayedDeliveryErrorCode.MAX_RETRIES_EXCEEDED,
                }),
                expect.any(Object)
            );
        });

        it("should ack after routing to the error queue", () => {
            expect(ackOrNackSpy).toHaveBeenCalledWith();
        });
    });

    describe("when an envelope preserves originalOverrides through the retry pipeline", () => {
        let ackOrNackSpy: jest.Mock, mockSub: any;

        beforeEach(async () => {
            ackOrNackSpy = jest.fn();
            mockSub = { on: jest.fn() };
            mockPublish.mockResolvedValue(undefined);
            mockSubscribe.mockResolvedValue(mockSub);

            const { wireDelayedDelivery } = await import("./delayedDelivery");

            mockSub.on.mockImplementation((event: string, cb: any) => {
                if (event === "message") {
                    const envelope = {
                        originalMessage: { orderId: "ORDER-OVERRIDE" },
                        originalPublication: "snacks_event_nacho_ready",
                        originalOverrides: { headers: { "x-trace-id": "TRACE-8675309" } },
                        targetDelay: 5_000,
                        createdAt: Date.now(),
                        retryCount: 0,
                    };
                    cb({}, envelope, ackOrNackSpy);
                }
            });

            await wireDelayedDelivery(
                mockBroker as any,
                [DelayedDomain.events.nacho_ready],
                MOCK_CONTEXT as any
            );

            await new Promise(res => setTimeout(res, 0));
        });

        it("should forward originalOverrides merged with mandatory: true to the re-publish call", () => {
            expect(mockPublish).toHaveBeenCalledWith(
                "snacks_event_nacho_ready",
                { orderId: "ORDER-OVERRIDE" },
                expect.objectContaining({
                    headers: { "x-trace-id": "TRACE-8675309" },
                    options: { mandatory: true },
                })
            );
        });
    });
});
