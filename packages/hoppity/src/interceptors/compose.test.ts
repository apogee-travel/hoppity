/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import { composeInboundWrappers, composeOutboundWrappers } from "./compose";
import { Interceptor, InboundMetadata, OutboundMetadata } from "./types";

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const INBOUND_META: InboundMetadata = {
    contract: {
        _type: "event",
        _domain: "grub",
        _name: "tacoReady",
        schema: {} as any,
        exchange: "grub",
        routingKey: "grub.event.taco_ready",
        publicationName: "grub_event_taco_ready",
        subscriptionName: "grub_event_taco_ready",
    },
    kind: "event",
    serviceName: "taco-service",
    message: {
        headers: { "x-trace": "abc-123" },
        properties: { contentType: "application/json" },
    },
};

const OUTBOUND_META: OutboundMetadata = {
    contract: {
        _type: "command",
        _domain: "grub",
        _name: "makeTaco",
        schema: {} as any,
        exchange: "grub",
        routingKey: "grub.command.make_taco",
        publicationName: "grub_command_make_taco",
        subscriptionName: "grub_command_make_taco",
    },
    kind: "command",
    serviceName: "taco-service",
};

describe("hoppity > interceptors > compose", () => {
    describe("composeInboundWrappers", () => {
        describe("when interceptors array is empty", () => {
            let result: any, baseHandler: jest.Mock, composed: any;

            beforeEach(async () => {
                baseHandler = jest.fn().mockResolvedValue("base-result");
                composed = composeInboundWrappers(baseHandler, [], INBOUND_META);
                result = await composed({ item: "nachos" }, { broker: {} as any });
            });

            it("should return a function", () => {
                expect(typeof composed).toBe("function");
            });

            it("should call the base handler directly", () => {
                expect(baseHandler).toHaveBeenCalledTimes(1);
            });

            it("should pass payload and context through to the base handler", () => {
                expect(baseHandler).toHaveBeenCalledWith(
                    { item: "nachos" },
                    { broker: expect.anything() }
                );
            });

            it("should return the base handler result", () => {
                expect(result).toBe("base-result");
            });
        });

        describe("when a single inbound interceptor is provided", () => {
            let callOrder: string[],
                capturedMeta: InboundMetadata | undefined,
                baseHandler: jest.Mock;

            beforeEach(async () => {
                callOrder = [];
                capturedMeta = undefined;
                baseHandler = jest.fn().mockImplementation(async () => {
                    callOrder.push("handler");
                    return "handler-result";
                });

                const interceptorA: Interceptor = {
                    name: "interceptor-a",
                    inbound: (handler, meta) => {
                        capturedMeta = meta;
                        return async (payload, ctx) => {
                            callOrder.push("A-before");
                            const r = await handler(payload, ctx);
                            callOrder.push("A-after");
                            return r;
                        };
                    },
                };

                const composed = composeInboundWrappers(baseHandler, [interceptorA], INBOUND_META);
                await composed({ item: "burrito" }, { broker: {} as any });
            });

            it("should call the interceptor before and after the handler", () => {
                expect(callOrder).toEqual(["A-before", "handler", "A-after"]);
            });

            it("should pass the correct metadata to the interceptor", () => {
                expect(capturedMeta).toBe(INBOUND_META);
            });
        });

        describe("when multiple inbound interceptors are provided", () => {
            let callOrder: string[], baseHandler: jest.Mock;

            beforeEach(async () => {
                callOrder = [];
                baseHandler = jest.fn().mockImplementation(async () => {
                    callOrder.push("handler");
                });

                const makeInterceptor = (name: string): Interceptor => ({
                    name,
                    inbound: handler => async (payload, ctx) => {
                        callOrder.push(`${name}-before`);
                        await handler(payload, ctx);
                        callOrder.push(`${name}-after`);
                    },
                });

                const composed = composeInboundWrappers(
                    baseHandler,
                    [makeInterceptor("A"), makeInterceptor("B")],
                    INBOUND_META
                );
                await composed({}, { broker: {} as any });
            });

            it("should call interceptors outermost-first: A wraps B wraps handler", () => {
                expect(callOrder).toEqual([
                    "A-before",
                    "B-before",
                    "handler",
                    "B-after",
                    "A-after",
                ]);
            });
        });

        describe("when an interceptor has no inbound property", () => {
            let baseHandler: jest.Mock;

            beforeEach(async () => {
                baseHandler = jest.fn().mockResolvedValue(undefined);

                const outboundOnlyInterceptor: Interceptor = {
                    name: "outbound-only",
                    // deliberately no inbound
                    outbound: publish => publish,
                };

                const composed = composeInboundWrappers(
                    baseHandler,
                    [outboundOnlyInterceptor],
                    INBOUND_META
                );
                await composed({ msg: "hello" }, { broker: {} as any });
            });

            it("should skip the interceptor and call the base handler directly", () => {
                expect(baseHandler).toHaveBeenCalledTimes(1);
                expect(baseHandler).toHaveBeenCalledWith({ msg: "hello" }, expect.anything());
            });
        });

        describe("when an interceptor has neither inbound nor outbound (name-only)", () => {
            let baseHandler: jest.Mock;

            beforeEach(async () => {
                baseHandler = jest.fn().mockResolvedValue("empty-result");

                const emptyInterceptor: Interceptor = {
                    name: "empty-noop",
                    // neither inbound nor outbound — valid per the spec
                };

                const composed = composeInboundWrappers(
                    baseHandler,
                    [emptyInterceptor],
                    INBOUND_META
                );
                await composed({ msg: "hello" }, { broker: {} as any });
            });

            it("should call the base handler directly", () => {
                expect(baseHandler).toHaveBeenCalledTimes(1);
            });
        });

        describe("when an inbound interceptor short-circuits without calling the handler", () => {
            let baseHandler: jest.Mock, interceptorRan: boolean;

            beforeEach(async () => {
                baseHandler = jest.fn().mockResolvedValue("should-not-see");
                interceptorRan = false;

                const shortCircuitInterceptor: Interceptor = {
                    name: "circuit-breaker",
                    inbound: _handler => async (_payload, _ctx) => {
                        // deliberately does NOT call _handler
                        interceptorRan = true;
                        return "short-circuited";
                    },
                };

                const composed = composeInboundWrappers(
                    baseHandler,
                    [shortCircuitInterceptor],
                    INBOUND_META
                );
                await composed({ item: "tacos" }, { broker: {} as any });
            });

            it("should not call the base handler", () => {
                expect(baseHandler).not.toHaveBeenCalled();
            });

            it("should run the interceptor", () => {
                expect(interceptorRan).toBe(true);
            });
        });

        describe("when the handler throws and the interceptor has a finally block", () => {
            let caughtError: any, finallyRan: boolean, baseHandler: jest.Mock;

            beforeEach(async () => {
                finallyRan = false;
                baseHandler = jest.fn().mockRejectedValue(new Error("E_HANDLER_MELTDOWN"));

                const interceptorWithFinally: Interceptor = {
                    name: "telemetry",
                    inbound: handler => async (payload, ctx) => {
                        try {
                            return await handler(payload, ctx);
                        } finally {
                            finallyRan = true;
                        }
                    },
                };

                const composed = composeInboundWrappers(
                    baseHandler,
                    [interceptorWithFinally],
                    INBOUND_META
                );

                try {
                    await composed({ item: "nachos" }, { broker: {} as any });
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should propagate the error from the handler", () => {
                expect(caughtError).toBeInstanceOf(Error);
                expect(caughtError.message).toBe("E_HANDLER_MELTDOWN");
            });

            it("should still run the interceptor finally block", () => {
                expect(finallyRan).toBe(true);
            });
        });

        describe("when multiple interceptors are provided and the middle one throws", () => {
            let caughtError: any, outerFinallyRan: boolean, baseHandler: jest.Mock;

            beforeEach(async () => {
                outerFinallyRan = false;
                baseHandler = jest.fn();

                const outerInterceptor: Interceptor = {
                    name: "outer-telemetry",
                    inbound: handler => async (payload, ctx) => {
                        try {
                            return await handler(payload, ctx);
                        } finally {
                            outerFinallyRan = true;
                        }
                    },
                };

                const middleInterceptor: Interceptor = {
                    name: "middle-bomber",
                    inbound: _handler => async (_payload, _ctx) => {
                        throw new Error("E_MIDDLE_INTERCEPTOR_EXPLODED");
                    },
                };

                const innerInterceptor: Interceptor = {
                    name: "inner-passthrough",
                    inbound: handler => handler,
                };

                const composed = composeInboundWrappers(
                    baseHandler,
                    [outerInterceptor, middleInterceptor, innerInterceptor],
                    INBOUND_META
                );

                try {
                    await composed({ item: "queso" }, { broker: {} as any });
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should propagate the error from the middle interceptor", () => {
                expect(caughtError).toBeInstanceOf(Error);
                expect(caughtError.message).toBe("E_MIDDLE_INTERCEPTOR_EXPLODED");
            });

            it("should run the outer interceptor finally block", () => {
                expect(outerFinallyRan).toBe(true);
            });

            it("should not call the base handler", () => {
                expect(baseHandler).not.toHaveBeenCalled();
            });
        });

        describe("when metadata is mutated by the interceptor wrapper factory", () => {
            let baseHandler: jest.Mock, secondCapturedMeta: InboundMetadata | undefined;

            beforeEach(async () => {
                baseHandler = jest.fn().mockResolvedValue(undefined);

                // First interceptor mutates the shared metadata object
                const mutatingInterceptor: Interceptor = {
                    name: "mutator",
                    inbound: (_handler, meta) => {
                        (meta.message.headers as any)["x-injected"] = "mutated-value";
                        return _handler;
                    },
                };

                // Second interceptor captures what it sees — should see the mutation
                const observingInterceptor: Interceptor = {
                    name: "observer",
                    inbound: (handler, meta) => {
                        secondCapturedMeta = meta;
                        return handler;
                    },
                };

                const mutableMeta: InboundMetadata = {
                    ...INBOUND_META,
                    message: {
                        headers: { "x-original": "original-value" },
                        properties: {},
                    },
                };

                const composed = composeInboundWrappers(
                    baseHandler,
                    [mutatingInterceptor, observingInterceptor],
                    mutableMeta
                );
                await composed({}, { broker: {} as any });
            });

            it("should propagate metadata mutations to subsequent interceptors (shared object)", () => {
                expect(secondCapturedMeta?.message.headers["x-injected"]).toBe("mutated-value");
            });
        });
    });

    describe("composeOutboundWrappers", () => {
        describe("when interceptors array is empty", () => {
            let result: any, basePublish: jest.Mock, composed: any;

            beforeEach(async () => {
                basePublish = jest.fn().mockResolvedValue("published");
                composed = composeOutboundWrappers(basePublish, [], OUTBOUND_META);
                result = await composed({ order: "queso" }, { options: { persistent: true } });
            });

            it("should return a function", () => {
                expect(typeof composed).toBe("function");
            });

            it("should call the base publish directly", () => {
                expect(basePublish).toHaveBeenCalledTimes(1);
            });

            it("should pass message and overrides through to the base publish", () => {
                expect(basePublish).toHaveBeenCalledWith(
                    { order: "queso" },
                    { options: { persistent: true } }
                );
            });

            it("should return the base publish result", () => {
                expect(result).toBe("published");
            });
        });

        describe("when a single outbound interceptor is provided", () => {
            let callOrder: string[],
                capturedMeta: OutboundMetadata | undefined,
                basePublish: jest.Mock;

            beforeEach(async () => {
                callOrder = [];
                capturedMeta = undefined;
                basePublish = jest.fn().mockImplementation(async () => {
                    callOrder.push("publish");
                });

                const interceptorA: Interceptor = {
                    name: "interceptor-a",
                    outbound: (publish, meta) => {
                        capturedMeta = meta;
                        return async (msg, ovr) => {
                            callOrder.push("A-before");
                            await publish(msg, ovr);
                            callOrder.push("A-after");
                        };
                    },
                };

                const composed = composeOutboundWrappers(
                    basePublish,
                    [interceptorA],
                    OUTBOUND_META
                );
                await composed({ tacos: 3 });
            });

            it("should call the interceptor before and after publish", () => {
                expect(callOrder).toEqual(["A-before", "publish", "A-after"]);
            });

            it("should pass the correct metadata to the interceptor", () => {
                expect(capturedMeta).toBe(OUTBOUND_META);
            });
        });

        describe("when multiple outbound interceptors are provided", () => {
            let callOrder: string[], basePublish: jest.Mock;

            beforeEach(async () => {
                callOrder = [];
                basePublish = jest.fn().mockImplementation(async () => {
                    callOrder.push("publish");
                });

                const makeInterceptor = (name: string): Interceptor => ({
                    name,
                    outbound: publish => async (msg, ovr) => {
                        callOrder.push(`${name}-before`);
                        await publish(msg, ovr);
                        callOrder.push(`${name}-after`);
                    },
                });

                const composed = composeOutboundWrappers(
                    basePublish,
                    [makeInterceptor("A"), makeInterceptor("B")],
                    OUTBOUND_META
                );
                await composed({});
            });

            it("should call interceptors outermost-first: A wraps B wraps publish", () => {
                expect(callOrder).toEqual([
                    "A-before",
                    "B-before",
                    "publish",
                    "B-after",
                    "A-after",
                ]);
            });
        });

        describe("when an interceptor has no outbound property", () => {
            let basePublish: jest.Mock;

            beforeEach(async () => {
                basePublish = jest.fn().mockResolvedValue(undefined);

                const inboundOnlyInterceptor: Interceptor = {
                    name: "inbound-only",
                    // deliberately no outbound
                    inbound: handler => handler,
                };

                const composed = composeOutboundWrappers(
                    basePublish,
                    [inboundOnlyInterceptor],
                    OUTBOUND_META
                );
                await composed({ msg: "hello" });
            });

            it("should skip the interceptor and call the base publish directly", () => {
                expect(basePublish).toHaveBeenCalledTimes(1);
                expect(basePublish).toHaveBeenCalledWith({ msg: "hello" });
            });
        });

        describe("when an interceptor short-circuits without calling the inner publish", () => {
            let basePublish: jest.Mock, capturedMsg: any;

            beforeEach(async () => {
                basePublish = jest.fn().mockResolvedValue(undefined);

                const shortCircuitInterceptor: Interceptor = {
                    name: "short-circuit",
                    outbound: _publish => async (msg, _ovr) => {
                        // intentionally does NOT call _publish — e.g. a circuit breaker
                        capturedMsg = msg;
                    },
                };

                const composed = composeOutboundWrappers(
                    basePublish,
                    [shortCircuitInterceptor],
                    OUTBOUND_META
                );
                await composed({ order: "nachos" });
            });

            it("should not call the base publish", () => {
                expect(basePublish).not.toHaveBeenCalled();
            });

            it("should receive the message in the interceptor", () => {
                expect(capturedMsg).toEqual({ order: "nachos" });
            });
        });

        describe("when the wrapped publish function throws", () => {
            let caughtError: any, finallyRan: boolean, basePublish: jest.Mock;

            beforeEach(async () => {
                finallyRan = false;
                basePublish = jest.fn().mockRejectedValue(new Error("E_BROKER_OFFLINE"));

                const interceptorWithFinally: Interceptor = {
                    name: "telemetry",
                    outbound: publish => async (msg, ovr) => {
                        try {
                            return await publish(msg, ovr);
                        } finally {
                            finallyRan = true;
                        }
                    },
                };

                const composed = composeOutboundWrappers(
                    basePublish,
                    [interceptorWithFinally],
                    OUTBOUND_META
                );

                try {
                    await composed({ order: "enchilada" });
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should propagate the error from the inner publish", () => {
                expect(caughtError).toBeInstanceOf(Error);
                expect(caughtError.message).toBe("E_BROKER_OFFLINE");
            });

            it("should still run the interceptor finally block", () => {
                expect(finallyRan).toBe(true);
            });
        });

        describe("when middle interceptor throws during wrapping", () => {
            let caughtError: any, outerFinallyRan: boolean, basePublish: jest.Mock;

            beforeEach(async () => {
                outerFinallyRan = false;
                basePublish = jest.fn();

                const outerInterceptor: Interceptor = {
                    name: "outer",
                    outbound: publish => async (msg, ovr) => {
                        try {
                            return await publish(msg, ovr);
                        } finally {
                            outerFinallyRan = true;
                        }
                    },
                };

                const middleInterceptor: Interceptor = {
                    name: "middle",
                    outbound: _publish => async (_msg, _ovr) => {
                        throw new Error("E_MIDDLE_EXPLODED");
                    },
                };

                const innerInterceptor: Interceptor = {
                    name: "inner",
                    outbound: publish => publish,
                };

                const composed = composeOutboundWrappers(
                    basePublish,
                    [outerInterceptor, middleInterceptor, innerInterceptor],
                    OUTBOUND_META
                );

                try {
                    await composed({ order: "burrito" });
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should propagate the error from the middle interceptor", () => {
                expect(caughtError).toBeInstanceOf(Error);
                expect(caughtError.message).toBe("E_MIDDLE_EXPLODED");
            });

            it("should run the outer interceptor finally block", () => {
                expect(outerFinallyRan).toBe(true);
            });

            it("should not call the base publish", () => {
                expect(basePublish).not.toHaveBeenCalled();
            });
        });

        describe("when an outbound interceptor injects headers into overrides", () => {
            let capturedOverrides: any, basePublish: jest.Mock;

            beforeEach(async () => {
                basePublish = jest.fn().mockImplementation(async (_msg: any, ovr: any) => {
                    capturedOverrides = ovr;
                });

                const headerInjector: Interceptor = {
                    name: "header-injector",
                    outbound: (publish, meta) => async (msg, ovr) => {
                        return publish(msg, {
                            ...ovr,
                            options: {
                                ...ovr?.options,
                                headers: {
                                    ...ovr?.options?.headers,
                                    "x-source-service": meta.serviceName,
                                },
                            },
                        });
                    },
                };

                const composed = composeOutboundWrappers(
                    basePublish,
                    [headerInjector],
                    OUTBOUND_META
                );
                await composed({ order: "enchilada" });
            });

            it("should inject the service name header into outbound overrides", () => {
                expect(capturedOverrides).toEqual(
                    expect.objectContaining({
                        options: expect.objectContaining({
                            headers: expect.objectContaining({
                                "x-source-service": "taco-service",
                            }),
                        }),
                    })
                );
            });
        });
    });
});
