/* eslint-disable @typescript-eslint/no-explicit-any */
export default {};

// OTel metrics mock infrastructure — declared at module level, configured per-test
const mockHandlerDurationRecord = jest.fn();
const mockHandlerCountAdd = jest.fn();
const mockHandlerErrorsAdd = jest.fn();
const mockPublishDurationRecord = jest.fn();
const mockPublishCountAdd = jest.fn();
const mockPublishErrorsAdd = jest.fn();
const mockCreateHistogram = jest.fn();
const mockCreateCounter = jest.fn();
const mockGetMeter = jest.fn();

jest.mock("@opentelemetry/api", () => ({
    metrics: {
        getMeter: mockGetMeter,
    },
}));

import type { InboundMetadata, OutboundMetadata, Interceptor } from "@apogeelabs/hoppity";

const MOCK_EVENT_CONTRACT = {
    _type: "event" as const,
    _domain: "orders",
    _name: "orderCreated",
    exchange: "orders_exchange",
    routingKey: "orders.event.order_created",
    publicationName: "orders_event_order_created",
    subscriptionName: "orders_event_order_created",
    schema: {} as any,
};

const MOCK_INBOUND_META: InboundMetadata = {
    contract: MOCK_EVENT_CONTRACT,
    kind: "event",
    serviceName: "order-service",
    message: { headers: {}, properties: {} },
};

const MOCK_OUTBOUND_META: OutboundMetadata = {
    contract: MOCK_EVENT_CONTRACT,
    kind: "event",
    serviceName: "order-service",
};

const MOCK_HANDLER_CONTEXT = { broker: {} as any };

describe("withMetrics", () => {
    let withMetrics: typeof import("./withMetrics").withMetrics;
    let mockHandlerDurationHistogram: any,
        mockHandlerCountCounter: any,
        mockHandlerErrorsCounter: any,
        mockPublishDurationHistogram: any,
        mockPublishCountCounter: any,
        mockPublishErrorsCounter: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();

        mockHandlerDurationHistogram = { record: mockHandlerDurationRecord };
        mockHandlerCountCounter = { add: mockHandlerCountAdd };
        mockHandlerErrorsCounter = { add: mockHandlerErrorsAdd };
        mockPublishDurationHistogram = { record: mockPublishDurationRecord };
        mockPublishCountCounter = { add: mockPublishCountAdd };
        mockPublishErrorsCounter = { add: mockPublishErrorsAdd };

        // createHistogram and createCounter return different instruments depending on the name
        mockCreateHistogram.mockImplementation((name: string) => {
            if (name === "hoppity.handler.duration") return mockHandlerDurationHistogram;
            if (name === "hoppity.publish.duration") return mockPublishDurationHistogram;
            return { record: jest.fn() };
        });
        mockCreateCounter.mockImplementation((name: string) => {
            if (name === "hoppity.handler.count") return mockHandlerCountCounter;
            if (name === "hoppity.handler.errors") return mockHandlerErrorsCounter;
            if (name === "hoppity.publish.count") return mockPublishCountCounter;
            if (name === "hoppity.publish.errors") return mockPublishErrorsCounter;
            return { add: jest.fn() };
        });
        mockGetMeter.mockReturnValue({
            createHistogram: mockCreateHistogram,
            createCounter: mockCreateCounter,
        });

        ({ withMetrics } = await import("./withMetrics"));
    });

    describe("when used as a direct interceptor (no options)", () => {
        it("should have name withMetrics", () => {
            expect(withMetrics.name).toBe("withMetrics");
        });

        it("should have an inbound wrapper", () => {
            expect(typeof withMetrics.inbound).toBe("function");
        });

        it("should have an outbound wrapper", () => {
            expect(typeof withMetrics.outbound).toBe("function");
        });
    });

    describe("when called as a factory with meterName", () => {
        let interceptor: Interceptor;

        beforeEach(() => {
            interceptor = withMetrics({ meterName: "order-service-metrics" });
        });

        it("should return an interceptor with name withMetrics", () => {
            expect(interceptor.name).toBe("withMetrics");
        });

        it("should use the provided meterName when creating instruments", async () => {
            const wrappedHandler = interceptor.inbound!(
                jest.fn().mockResolvedValue(undefined),
                MOCK_INBOUND_META
            );
            await wrappedHandler({}, MOCK_HANDLER_CONTEXT);
            expect(mockGetMeter).toHaveBeenCalledWith("order-service-metrics");
        });
    });

    describe("when called as a factory with histogramBuckets", () => {
        let interceptor: Interceptor;

        beforeEach(() => {
            interceptor = withMetrics({ histogramBuckets: [5, 10, 25, 50, 100, 250] });
        });

        it("should pass bucket boundaries to createHistogram via advice", async () => {
            const wrappedHandler = interceptor.inbound!(
                jest.fn().mockResolvedValue(undefined),
                MOCK_INBOUND_META
            );
            await wrappedHandler({}, MOCK_HANDLER_CONTEXT);
            expect(mockCreateHistogram).toHaveBeenCalledWith(
                "hoppity.handler.duration",
                expect.objectContaining({
                    advice: { explicitBucketBoundaries: [5, 10, 25, 50, 100, 250] },
                })
            );
        });
    });

    describe("inbound wrapper", () => {
        describe("when the handler succeeds", () => {
            let mockHandler: jest.Mock;

            beforeEach(async () => {
                mockHandler = jest.fn().mockResolvedValue(undefined);
                const wrappedHandler = withMetrics.inbound!(mockHandler, MOCK_INBOUND_META);
                await wrappedHandler({ orderId: "TK-421" }, MOCK_HANDLER_CONTEXT);
            });

            it("should increment the handler count counter", () => {
                expect(mockHandlerCountAdd).toHaveBeenCalledTimes(1);
                expect(mockHandlerCountAdd).toHaveBeenCalledWith(1, expect.any(Object));
            });

            it("should record the handler duration", () => {
                expect(mockHandlerDurationRecord).toHaveBeenCalledTimes(1);
                expect(mockHandlerDurationRecord).toHaveBeenCalledWith(
                    expect.any(Number),
                    expect.any(Object)
                );
            });

            it("should not increment the error counter on success", () => {
                expect(mockHandlerErrorsAdd).not.toHaveBeenCalled();
            });

            it("should pass expected attributes to the counter", () => {
                expect(mockHandlerCountAdd).toHaveBeenCalledWith(
                    1,
                    expect.objectContaining({
                        "hoppity.domain": "orders",
                        "hoppity.operation": "orderCreated",
                        "hoppity.kind": "event",
                        "service.name": "order-service",
                    })
                );
            });

            it("should use the default meter name", () => {
                expect(mockGetMeter).toHaveBeenCalledWith("hoppity");
            });
        });

        describe("when the handler throws", () => {
            let thrownError: Error, caughtError: Error | undefined;

            beforeEach(async () => {
                thrownError = new Error("E_MISSING_MCRIB");
                const mockHandler = jest.fn().mockRejectedValue(thrownError);
                const wrappedHandler = withMetrics.inbound!(mockHandler, MOCK_INBOUND_META);
                try {
                    await wrappedHandler({}, MOCK_HANDLER_CONTEXT);
                } catch (err: any) {
                    caughtError = err;
                }
            });

            it("should increment the error counter", () => {
                expect(mockHandlerErrorsAdd).toHaveBeenCalledTimes(1);
                expect(mockHandlerErrorsAdd).toHaveBeenCalledWith(1, expect.any(Object));
            });

            it("should still record duration even on error", () => {
                expect(mockHandlerDurationRecord).toHaveBeenCalledTimes(1);
            });

            it("should rethrow the original error", () => {
                expect(caughtError).toBe(thrownError);
            });
        });
    });

    describe("outbound wrapper", () => {
        describe("when the publish succeeds", () => {
            let mockPublish: jest.Mock;

            beforeEach(async () => {
                mockPublish = jest.fn().mockResolvedValue(undefined);
                const wrappedPublish = withMetrics.outbound!(mockPublish, MOCK_OUTBOUND_META);
                await wrappedPublish({ orderId: "NCC-1701" });
            });

            it("should increment the publish count counter", () => {
                expect(mockPublishCountAdd).toHaveBeenCalledTimes(1);
                expect(mockPublishCountAdd).toHaveBeenCalledWith(1, expect.any(Object));
            });

            it("should record the publish duration", () => {
                expect(mockPublishDurationRecord).toHaveBeenCalledTimes(1);
                expect(mockPublishDurationRecord).toHaveBeenCalledWith(
                    expect.any(Number),
                    expect.any(Object)
                );
            });

            it("should not increment the error counter on success", () => {
                expect(mockPublishErrorsAdd).not.toHaveBeenCalled();
            });

            it("should pass expected attributes to the publish counter", () => {
                expect(mockPublishCountAdd).toHaveBeenCalledWith(
                    1,
                    expect.objectContaining({
                        "messaging.operation.type": "publish",
                        "hoppity.domain": "orders",
                    })
                );
            });
        });

        describe("when the publish throws", () => {
            let thrownError: Error, caughtError: Error | undefined;

            beforeEach(async () => {
                thrownError = new Error("E_BORKED_BROKER");
                const mockPublish = jest.fn().mockRejectedValue(thrownError);
                const wrappedPublish = withMetrics.outbound!(mockPublish, MOCK_OUTBOUND_META);
                try {
                    await wrappedPublish({});
                } catch (err: any) {
                    caughtError = err;
                }
            });

            it("should increment the publish error counter", () => {
                expect(mockPublishErrorsAdd).toHaveBeenCalledTimes(1);
                expect(mockPublishErrorsAdd).toHaveBeenCalledWith(1, expect.any(Object));
            });

            it("should still record publish duration on error", () => {
                expect(mockPublishDurationRecord).toHaveBeenCalledTimes(1);
            });

            it("should rethrow the original error", () => {
                expect(caughtError).toBe(thrownError);
            });
        });
    });

    describe("instrument lazy initialisation", () => {
        describe("when the inbound wrapper is called multiple times", () => {
            let mockHandler: jest.Mock;

            beforeEach(async () => {
                mockHandler = jest.fn().mockResolvedValue(undefined);
                // Use a fresh instance from the factory so we control the lifecycle
                const interceptor = withMetrics();
                const wrappedHandler = interceptor.inbound!(mockHandler, MOCK_INBOUND_META);
                await wrappedHandler({}, MOCK_HANDLER_CONTEXT);
                await wrappedHandler({}, MOCK_HANDLER_CONTEXT);
            });

            it("should only call getMeter once (instruments created once per instance)", () => {
                expect(mockGetMeter).toHaveBeenCalledTimes(1);
            });
        });
    });
});
