/* eslint-disable @typescript-eslint/no-explicit-any */
export default {};

// OTel API mock infrastructure — declared at module level, configured per-test
const mockSpanEnd = jest.fn();
const mockSetStatus = jest.fn();
const mockRecordException = jest.fn();
const mockSpanSetAttribute = jest.fn();
const mockStartActiveSpan = jest.fn();
const mockGetTracer = jest.fn();
const mockInject = jest.fn();
const mockExtract = jest.fn();
const mockContextWith = jest.fn();
const mockContextActive = jest.fn();

jest.mock("@opentelemetry/api", () => ({
    trace: {
        getTracer: mockGetTracer,
    },
    propagation: {
        inject: mockInject,
        extract: mockExtract,
    },
    context: {
        active: mockContextActive,
        with: mockContextWith,
    },
    SpanStatusCode: {
        OK: 1,
        ERROR: 2,
    },
}));

import type { InboundMetadata, OutboundMetadata, Interceptor } from "@apogeelabs/hoppity";

const MOCK_EVENT_CONTRACT = {
    _type: "event" as const,
    _domain: "catalog",
    _name: "bookAdded",
    exchange: "catalog_exchange",
    routingKey: "catalog.event.book_added",
    publicationName: "catalog_event_book_added",
    subscriptionName: "catalog_event_book_added",
    schema: {} as any,
};

const MOCK_INBOUND_META: InboundMetadata = {
    contract: MOCK_EVENT_CONTRACT,
    kind: "event",
    serviceName: "catalog-service",
    message: { headers: { traceparent: "00-abc123-def456-01" }, properties: {} },
};

const MOCK_OUTBOUND_META: OutboundMetadata = {
    contract: MOCK_EVENT_CONTRACT,
    kind: "event",
    serviceName: "catalog-service",
};

const MOCK_HANDLER_CONTEXT = { broker: {} as any };

const EXTRACTED_CONTEXT = { spanContext: { traceId: "abc123" } };
const ACTIVE_CONTEXT = { spanContext: { traceId: "current" } };

describe("withTracing", () => {
    let withTracing: typeof import("./withTracing").withTracing;
    let mockSpan: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();

        mockSpan = {
            end: mockSpanEnd,
            setStatus: mockSetStatus,
            recordException: mockRecordException,
            setAttribute: mockSpanSetAttribute,
        };

        // startActiveSpan takes (name, options, callback) — we invoke the callback with the span
        mockStartActiveSpan.mockImplementation((_name: any, _opts: any, cb: (span: any) => any) =>
            cb(mockSpan)
        );
        mockGetTracer.mockReturnValue({ startActiveSpan: mockStartActiveSpan });
        mockContextActive.mockReturnValue(ACTIVE_CONTEXT);
        mockExtract.mockReturnValue(EXTRACTED_CONTEXT);
        // context.with invokes its callback immediately
        mockContextWith.mockImplementation((_ctx: any, fn: () => any) => fn());

        ({ withTracing } = await import("./withTracing"));
    });

    describe("when used as a direct interceptor (no options)", () => {
        it("should have name withTracing", () => {
            expect(withTracing.name).toBe("withTracing");
        });

        it("should have an inbound wrapper", () => {
            expect(typeof withTracing.inbound).toBe("function");
        });

        it("should have an outbound wrapper", () => {
            expect(typeof withTracing.outbound).toBe("function");
        });
    });

    describe("when called as a factory", () => {
        let interceptor: Interceptor;

        beforeEach(() => {
            interceptor = withTracing({ tracerName: "my-tracer", spanPrefix: "msg" });
        });

        it("should return an interceptor with name withTracing", () => {
            expect(interceptor.name).toBe("withTracing");
        });

        it("should pass tracerName to getTracer when inbound is invoked", async () => {
            const wrappedHandler = interceptor.inbound!(
                jest.fn().mockResolvedValue(undefined),
                MOCK_INBOUND_META
            );
            await wrappedHandler({ bookId: "42" }, MOCK_HANDLER_CONTEXT);
            expect(mockGetTracer).toHaveBeenCalledWith("my-tracer");
        });

        it("should use spanPrefix in span name when inbound is invoked", async () => {
            const wrappedHandler = interceptor.inbound!(
                jest.fn().mockResolvedValue(undefined),
                MOCK_INBOUND_META
            );
            await wrappedHandler({ bookId: "42" }, MOCK_HANDLER_CONTEXT);
            expect(mockStartActiveSpan).toHaveBeenCalledTimes(1);
            expect(mockStartActiveSpan.mock.calls[0][0]).toBe("msg:catalog.bookAdded");
        });
    });

    describe("inbound wrapper", () => {
        describe("when the handler succeeds", () => {
            let mockHandler: jest.Mock;
            let wrappedHandler: (payload: any, ctx: any) => Promise<any>;
            let result: any;

            beforeEach(async () => {
                mockHandler = jest.fn().mockResolvedValue({ status: "ok" });
                wrappedHandler = withTracing.inbound!(mockHandler, MOCK_INBOUND_META);
                result = await wrappedHandler({ bookId: "8675309" }, MOCK_HANDLER_CONTEXT);
            });

            it("should extract parent context from message headers", () => {
                expect(mockExtract).toHaveBeenCalledTimes(1);
                expect(mockExtract).toHaveBeenCalledWith(
                    ACTIVE_CONTEXT,
                    MOCK_INBOUND_META.message.headers
                );
            });

            it("should start a span with the correct name", () => {
                expect(mockStartActiveSpan.mock.calls[0][0]).toBe("event:catalog.bookAdded");
            });

            it("should call the original handler", () => {
                expect(mockHandler).toHaveBeenCalledTimes(1);
                expect(mockHandler).toHaveBeenCalledWith(
                    { bookId: "8675309" },
                    MOCK_HANDLER_CONTEXT
                );
            });

            it("should set span status to OK", () => {
                expect(mockSetStatus).toHaveBeenCalledWith({ code: 1 });
            });

            it("should end the span", () => {
                expect(mockSpanEnd).toHaveBeenCalledTimes(1);
            });

            it("should return the handler result", () => {
                expect(result).toEqual({ status: "ok" });
            });

            it("should use the default tracer name", () => {
                expect(mockGetTracer).toHaveBeenCalledWith("hoppity");
            });
        });

        describe("when the handler throws", () => {
            let mockHandler: jest.Mock;
            let wrappedHandler: (payload: any, ctx: any) => Promise<any>;
            let thrownError: Error;
            let caughtError: Error | undefined;

            beforeEach(async () => {
                thrownError = new Error("E_COLD_CALZONE");
                mockHandler = jest.fn().mockRejectedValue(thrownError);
                wrappedHandler = withTracing.inbound!(mockHandler, MOCK_INBOUND_META);
                try {
                    await wrappedHandler({}, MOCK_HANDLER_CONTEXT);
                } catch (err: any) {
                    caughtError = err;
                }
            });

            it("should record the exception on the span", () => {
                expect(mockRecordException).toHaveBeenCalledTimes(1);
                expect(mockRecordException).toHaveBeenCalledWith(thrownError);
            });

            it("should set span status to ERROR with message", () => {
                expect(mockSetStatus).toHaveBeenCalledWith({ code: 2, message: "E_COLD_CALZONE" });
            });

            it("should end the span even on error", () => {
                expect(mockSpanEnd).toHaveBeenCalledTimes(1);
            });

            it("should rethrow the original error", () => {
                expect(caughtError).toBe(thrownError);
            });
        });

        describe("when kind is command", () => {
            let wrappedHandler: (payload: any, ctx: any) => Promise<any>;

            beforeEach(async () => {
                const commandMeta: InboundMetadata = {
                    ...MOCK_INBOUND_META,
                    kind: "command",
                };
                wrappedHandler = withTracing.inbound!(
                    jest.fn().mockResolvedValue(undefined),
                    commandMeta
                );
                await wrappedHandler({}, MOCK_HANDLER_CONTEXT);
            });

            it("should use command as the span name prefix", () => {
                expect(mockStartActiveSpan.mock.calls[0][0]).toBe("command:catalog.bookAdded");
            });
        });
    });

    describe("outbound wrapper", () => {
        describe("when the publish succeeds", () => {
            let mockPublish: jest.Mock;
            let wrappedPublish: (message: any, overrides?: any) => Promise<any>;
            let result: any;

            beforeEach(async () => {
                mockPublish = jest.fn().mockResolvedValue({ tag: "confirmed" });
                wrappedPublish = withTracing.outbound!(mockPublish, MOCK_OUTBOUND_META);
                result = await wrappedPublish({ bookId: "42" });
            });

            it("should start a span named publish:{domain}.{operation}", () => {
                expect(mockStartActiveSpan.mock.calls[0][0]).toBe("publish:catalog.bookAdded");
            });

            it("should inject trace context into headers", () => {
                expect(mockInject).toHaveBeenCalledTimes(1);
                expect(mockInject).toHaveBeenCalledWith(ACTIVE_CONTEXT, expect.any(Object));
            });

            it("should call the underlying publish with merged headers", () => {
                expect(mockPublish).toHaveBeenCalledTimes(1);
                expect(mockPublish).toHaveBeenCalledWith(
                    { bookId: "42" },
                    expect.objectContaining({
                        options: expect.objectContaining({ headers: expect.any(Object) }),
                    })
                );
            });

            it("should set span status to OK", () => {
                expect(mockSetStatus).toHaveBeenCalledWith({ code: 1 });
            });

            it("should end the span", () => {
                expect(mockSpanEnd).toHaveBeenCalledTimes(1);
            });

            it("should return the publish result", () => {
                expect(result).toEqual({ tag: "confirmed" });
            });
        });

        describe("when publish is called with existing overrides headers", () => {
            let mockPublish: jest.Mock;
            let capturedOverrides: any;

            beforeEach(async () => {
                mockPublish = jest.fn().mockImplementation((_msg: any, overrides: any) => {
                    capturedOverrides = overrides;
                    return Promise.resolve();
                });
                const wrappedPublish = withTracing.outbound!(mockPublish, MOCK_OUTBOUND_META);
                await wrappedPublish(
                    { bookId: "42" },
                    {
                        options: { headers: { "x-correlation-id": "stargate-sg1" } },
                    }
                );
            });

            it("should preserve existing headers when injecting trace context", () => {
                // The inject mock doesn't actually write anything, but we verify
                // the headers object was seeded with the existing headers before injection.
                expect(capturedOverrides.options.headers).toEqual(
                    expect.objectContaining({ "x-correlation-id": "stargate-sg1" })
                );
            });
        });

        describe("when the publish throws", () => {
            let mockPublish: jest.Mock;
            let thrownError: Error;
            let caughtError: Error | undefined;

            beforeEach(async () => {
                thrownError = new Error("E_SOGGY_STROMBOLI");
                mockPublish = jest.fn().mockRejectedValue(thrownError);
                const wrappedPublish = withTracing.outbound!(mockPublish, MOCK_OUTBOUND_META);
                try {
                    await wrappedPublish({ bookId: "42" });
                } catch (err: any) {
                    caughtError = err;
                }
            });

            it("should record the exception on the span", () => {
                expect(mockRecordException).toHaveBeenCalledWith(thrownError);
            });

            it("should set span status to ERROR", () => {
                expect(mockSetStatus).toHaveBeenCalledWith({
                    code: 2,
                    message: "E_SOGGY_STROMBOLI",
                });
            });

            it("should end the span even on error", () => {
                expect(mockSpanEnd).toHaveBeenCalledTimes(1);
            });

            it("should rethrow the original error", () => {
                expect(caughtError).toBe(thrownError);
            });
        });
    });
});
