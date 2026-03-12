/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

const mockBrokerPublish = jest.fn();

describe("hoppity > broker > wireOutbound", () => {
    let mockBroker: any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();

        mockBroker = {
            publish: mockBrokerPublish,
        };

        mockBrokerPublish.mockResolvedValue(undefined);
    });

    describe("wireOutbound", () => {
        describe("when publishEvent is called with no interceptors", () => {
            let wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                wireOutboundFn(mockBroker, { validateOutbound: false });

                await (mockBroker as any).publishEvent(
                    {
                        schema: { parse: jest.fn() },
                        publicationName: "grub_event_taco_ready",
                        _type: "event",
                        _domain: "grub",
                        _name: "tacoReady",
                    },
                    { tacoId: "t-1" }
                );
            });

            it("should call broker.publish with the publication name and message", () => {
                expect(mockBrokerPublish).toHaveBeenCalledTimes(1);
                expect(mockBrokerPublish).toHaveBeenCalledWith(
                    "grub_event_taco_ready",
                    { tacoId: "t-1" },
                    undefined
                );
            });
        });

        describe("when publishEvent is called with validateOutbound=true", () => {
            const mockParse = jest.fn();
            let wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                wireOutboundFn(mockBroker, { validateOutbound: true });

                await (mockBroker as any).publishEvent(
                    {
                        schema: { parse: mockParse },
                        publicationName: "grub_event_taco_ready",
                        _type: "event",
                        _domain: "grub",
                        _name: "tacoReady",
                    },
                    { tacoId: "t-1" }
                );
            });

            it("should call schema.parse before publishing", () => {
                expect(mockParse).toHaveBeenCalledTimes(1);
                expect(mockParse).toHaveBeenCalledWith({ tacoId: "t-1" });
            });
        });

        describe("when sendCommand is called with no interceptors", () => {
            let wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                wireOutboundFn(mockBroker, { validateOutbound: false });

                await (mockBroker as any).sendCommand(
                    {
                        schema: { parse: jest.fn() },
                        publicationName: "grub_command_make_taco",
                        _type: "command",
                        _domain: "grub",
                        _name: "makeTaco",
                    },
                    { size: "large" },
                    { options: { persistent: true } }
                );
            });

            it("should call broker.publish with the publication name, message and overrides", () => {
                expect(mockBrokerPublish).toHaveBeenCalledTimes(1);
                expect(mockBrokerPublish).toHaveBeenCalledWith(
                    "grub_command_make_taco",
                    { size: "large" },
                    { options: { persistent: true } }
                );
            });
        });

        describe("when publishEvent is called with an outbound interceptor", () => {
            let capturedMeta: any,
                callOrder: string[],
                wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                callOrder = [];
                capturedMeta = undefined;

                const interceptor: any = {
                    name: "trace-interceptor",
                    outbound: (publish: any, meta: any) => {
                        capturedMeta = meta;
                        return async (msg: any, ovr: any) => {
                            callOrder.push("interceptor-before");
                            await publish(msg, ovr);
                            callOrder.push("interceptor-after");
                        };
                    },
                };

                wireOutboundFn(mockBroker, {
                    validateOutbound: false,
                    interceptors: [interceptor],
                    serviceName: "taco-service",
                });

                await (mockBroker as any).publishEvent(
                    {
                        schema: { parse: jest.fn() },
                        publicationName: "grub_event_taco_ready",
                        _type: "event",
                        _domain: "grub",
                        _name: "tacoReady",
                    },
                    { tacoId: "t-1" }
                );
            });

            it("should call the interceptor before and after publish", () => {
                expect(callOrder).toEqual(["interceptor-before", "interceptor-after"]);
            });

            it("should pass the correct kind to the interceptor metadata", () => {
                expect(capturedMeta.kind).toBe("event");
            });

            it("should pass the serviceName to the interceptor metadata", () => {
                expect(capturedMeta.serviceName).toBe("taco-service");
            });

            it("should pass the contract to the interceptor metadata", () => {
                expect(capturedMeta.contract.publicationName).toBe("grub_event_taco_ready");
            });
        });

        describe("when validateOutbound=true and schema.parse throws", () => {
            let caughtError: any,
                mockInterceptorOutbound: jest.Mock,
                wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                mockInterceptorOutbound = jest.fn().mockImplementation((publish: any) => publish);

                const interceptor: any = {
                    name: "should-not-run",
                    outbound: mockInterceptorOutbound,
                };

                wireOutboundFn(mockBroker, {
                    validateOutbound: true,
                    interceptors: [interceptor],
                });

                try {
                    await (mockBroker as any).publishEvent(
                        {
                            schema: {
                                parse: jest.fn().mockImplementation(() => {
                                    throw new Error("E_SOGGY_STROMBOLI");
                                }),
                            },
                            publicationName: "grub_event_taco_ready",
                            _type: "event",
                            _domain: "grub",
                            _name: "tacoReady",
                        },
                        { tacoId: "bad-taco" }
                    );
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should throw the validation error", () => {
                expect(caughtError).toBeInstanceOf(Error);
                expect(caughtError.message).toBe("E_SOGGY_STROMBOLI");
            });

            it("should never call the interceptor", () => {
                expect(mockInterceptorOutbound).not.toHaveBeenCalled();
            });
        });

        describe("when sendCommand is called with an outbound interceptor", () => {
            let capturedMeta: any, wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                capturedMeta = undefined;

                const interceptor: any = {
                    name: "meta-capture",
                    outbound: (publish: any, meta: any) => {
                        capturedMeta = meta;
                        return publish;
                    },
                };

                wireOutboundFn(mockBroker, {
                    validateOutbound: false,
                    interceptors: [interceptor],
                    serviceName: "burrito-service",
                });

                await (mockBroker as any).sendCommand(
                    {
                        schema: { parse: jest.fn() },
                        publicationName: "grub_command_make_taco",
                        _type: "command",
                        _domain: "grub",
                        _name: "makeTaco",
                    },
                    { size: "medium" }
                );
            });

            it("should pass kind=command to the interceptor metadata", () => {
                expect(capturedMeta.kind).toBe("command");
            });

            it("should pass the serviceName to the interceptor metadata", () => {
                expect(capturedMeta.serviceName).toBe("burrito-service");
            });
        });

        describe("when an outbound interceptor modifies the message before publishing", () => {
            let wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                const messageEnricher: any = {
                    name: "message-enricher",
                    outbound: (publish: any, _meta: any) => {
                        return async (msg: any, ovr: any) => {
                            // Enrich the message before forwarding to the broker
                            await publish({ ...msg, _enriched: true, _version: 2 }, ovr);
                        };
                    },
                };

                wireOutboundFn(mockBroker, {
                    validateOutbound: false,
                    interceptors: [messageEnricher],
                });

                await (mockBroker as any).publishEvent(
                    {
                        schema: { parse: jest.fn() },
                        publicationName: "grub_event_taco_ready",
                        _type: "event",
                        _domain: "grub",
                        _name: "tacoReady",
                    },
                    { tacoId: "t-42" }
                );
            });

            it("should publish the modified message to the broker", () => {
                expect(mockBrokerPublish).toHaveBeenCalledWith(
                    "grub_event_taco_ready",
                    { tacoId: "t-42", _enriched: true, _version: 2 },
                    undefined
                );
            });
        });

        describe("when publishEvent is called with delay: number on a delay-capable contract", () => {
            let wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                wireOutboundFn(mockBroker, { validateOutbound: false });

                await (mockBroker as any).publishEvent(
                    {
                        schema: { parse: jest.fn() },
                        publicationName: "grub_event_taco_ready",
                        _type: "event",
                        _domain: "grub",
                        _name: "tacoReady",
                        delay: { default: 5_000 },
                    },
                    { tacoId: "t-delayed" },
                    { delay: 3_000 }
                );
            });

            it("should publish to the wait publication, not the original", () => {
                expect(mockBrokerPublish).toHaveBeenCalledTimes(1);
                expect(mockBrokerPublish).toHaveBeenCalledWith(
                    "grub_event_taco_ready_delayed",
                    expect.objectContaining({
                        originalMessage: { tacoId: "t-delayed" },
                        originalPublication: "grub_event_taco_ready",
                        targetDelay: 3_000,
                        retryCount: 0,
                    }),
                    expect.objectContaining({ options: { expiration: 3_000, persistent: true } })
                );
            });
        });

        describe("when publishEvent is called with delay: true (use contract default)", () => {
            let wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                wireOutboundFn(mockBroker, { validateOutbound: false });

                await (mockBroker as any).publishEvent(
                    {
                        schema: { parse: jest.fn() },
                        publicationName: "grub_event_taco_ready",
                        _type: "event",
                        _domain: "grub",
                        _name: "tacoReady",
                        delay: { default: 60_000 },
                    },
                    { tacoId: "t-default-delay" },
                    { delay: true }
                );
            });

            it("should use the contract default delay as the TTL", () => {
                expect(mockBrokerPublish).toHaveBeenCalledWith(
                    "grub_event_taco_ready_delayed",
                    expect.objectContaining({ targetDelay: 60_000 }),
                    expect.objectContaining({ options: { expiration: 60_000, persistent: true } })
                );
            });
        });

        describe("when publishEvent is called with delay: true but contract has no default", () => {
            let caughtError: any, wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                wireOutboundFn(mockBroker, { validateOutbound: false });

                try {
                    await (mockBroker as any).publishEvent(
                        {
                            schema: { parse: jest.fn() },
                            publicationName: "grub_event_taco_ready",
                            _type: "event",
                            _domain: "grub",
                            _name: "tacoReady",
                            // delay: true means no default — caller must always specify
                            delay: true,
                        },
                        { tacoId: "t-no-default" },
                        { delay: true }
                    );
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should throw a DelayedDeliveryError", () => {
                expect(caughtError).toBeDefined();
                expect(caughtError.name).toBe("DelayedDeliveryError");
            });

            it("should use the INVALID_DELAY error code", () => {
                expect(caughtError.code).toBe("DELAYED_DELIVERY_INVALID_DELAY");
            });
        });

        describe("when publishEvent is called with delay on a non-delay contract", () => {
            let caughtError: any, wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                wireOutboundFn(mockBroker, { validateOutbound: false });

                try {
                    await (mockBroker as any).publishEvent(
                        {
                            schema: { parse: jest.fn() },
                            publicationName: "grub_event_taco_ready",
                            _type: "event",
                            _domain: "grub",
                            _name: "tacoReady",
                            // no delay field — contract doesn't support it
                        },
                        { tacoId: "t-bad" },
                        { delay: 5_000 }
                    );
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should throw a DelayedDeliveryError", () => {
                expect(caughtError).toBeDefined();
                expect(caughtError.name).toBe("DelayedDeliveryError");
            });

            it("should use the INVALID_DELAY error code", () => {
                expect(caughtError.code).toBe("DELAYED_DELIVERY_INVALID_DELAY");
            });
        });

        describe("when publishEvent is called with delay: 0 (invalid)", () => {
            let caughtError: any, wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                wireOutboundFn(mockBroker, { validateOutbound: false });

                try {
                    await (mockBroker as any).publishEvent(
                        {
                            schema: { parse: jest.fn() },
                            publicationName: "grub_event_taco_ready",
                            _type: "event",
                            _domain: "grub",
                            _name: "tacoReady",
                            delay: { default: 5_000 },
                        },
                        { tacoId: "t-zero-delay" },
                        { delay: 0 }
                    );
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should throw a DelayedDeliveryError with INVALID_DELAY code", () => {
                expect(caughtError.name).toBe("DelayedDeliveryError");
                expect(caughtError.code).toBe("DELAYED_DELIVERY_INVALID_DELAY");
            });
        });

        describe("when sendCommand is called with delay: number on a delay-capable contract", () => {
            let wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                wireOutboundFn(mockBroker, { validateOutbound: false });

                await (mockBroker as any).sendCommand(
                    {
                        schema: { parse: jest.fn() },
                        publicationName: "admin_command_purge_sessions",
                        _type: "command",
                        _domain: "admin",
                        _name: "purgeSessions",
                        delay: { default: 300_000 },
                    },
                    { olderThan: "2026-01-01" },
                    { delay: 10_000 }
                );
            });

            it("should publish to the wait publication for the command", () => {
                expect(mockBrokerPublish).toHaveBeenCalledWith(
                    "admin_command_purge_sessions_delayed",
                    expect.objectContaining({
                        originalMessage: { olderThan: "2026-01-01" },
                        originalPublication: "admin_command_purge_sessions",
                        targetDelay: 10_000,
                    }),
                    expect.objectContaining({ options: { expiration: 10_000, persistent: true } })
                );
            });
        });

        describe("when publishEvent is called with delay: -1 (negative number)", () => {
            let caughtError: any, wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                wireOutboundFn(mockBroker, { validateOutbound: false });

                try {
                    await (mockBroker as any).publishEvent(
                        {
                            schema: { parse: jest.fn() },
                            publicationName: "grub_event_taco_ready",
                            _type: "event",
                            _domain: "grub",
                            _name: "tacoReady",
                            delay: { default: 5_000 },
                        },
                        { tacoId: "t-negative-delay" },
                        { delay: -1 }
                    );
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should throw a DelayedDeliveryError with INVALID_DELAY code", () => {
                expect(caughtError.name).toBe("DelayedDeliveryError");
                expect(caughtError.code).toBe("DELAYED_DELIVERY_INVALID_DELAY");
            });
        });

        describe("when publishEvent is called with delay: NaN (invalid)", () => {
            let caughtError: any, wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                wireOutboundFn(mockBroker, { validateOutbound: false });

                try {
                    await (mockBroker as any).publishEvent(
                        {
                            schema: { parse: jest.fn() },
                            publicationName: "grub_event_taco_ready",
                            _type: "event",
                            _domain: "grub",
                            _name: "tacoReady",
                            delay: { default: 5_000 },
                        },
                        { tacoId: "t-nan-delay" },
                        { delay: NaN }
                    );
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should throw a DelayedDeliveryError with INVALID_DELAY code", () => {
                expect(caughtError.name).toBe("DelayedDeliveryError");
                expect(caughtError.code).toBe("DELAYED_DELIVERY_INVALID_DELAY");
            });
        });

        describe("when publishEvent is called with delay: Infinity (invalid)", () => {
            let caughtError: any, wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                wireOutboundFn(mockBroker, { validateOutbound: false });

                try {
                    await (mockBroker as any).publishEvent(
                        {
                            schema: { parse: jest.fn() },
                            publicationName: "grub_event_taco_ready",
                            _type: "event",
                            _domain: "grub",
                            _name: "tacoReady",
                            delay: { default: 5_000 },
                        },
                        { tacoId: "t-infinity-delay" },
                        { delay: Infinity }
                    );
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should throw a DelayedDeliveryError with INVALID_DELAY code", () => {
                expect(caughtError.name).toBe("DelayedDeliveryError");
                expect(caughtError.code).toBe("DELAYED_DELIVERY_INVALID_DELAY");
            });
        });

        describe("when publishDelayed broker.publish throws (QUEUE_FULL path)", () => {
            let caughtError: any, wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                wireOutboundFn(mockBroker, { validateOutbound: false, serviceName: "grub-svc" });
                mockBrokerPublish.mockRejectedValue(new Error("E_WAIT_QUEUE_FULL"));

                try {
                    await (mockBroker as any).publishEvent(
                        {
                            schema: { parse: jest.fn() },
                            publicationName: "grub_event_taco_ready",
                            _type: "event",
                            _domain: "grub",
                            _name: "tacoReady",
                            delay: { default: 5_000 },
                        },
                        { tacoId: "t-queuefull" },
                        { delay: 5_000 }
                    );
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should throw a DelayedDeliveryError", () => {
                expect(caughtError.name).toBe("DelayedDeliveryError");
            });

            it("should use the QUEUE_FULL error code", () => {
                expect(caughtError.code).toBe("DELAYED_DELIVERY_QUEUE_FULL");
            });
        });

        describe("when sendCommand is called with delay: true on a contract with delay: true (no default)", () => {
            let caughtError: any, wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                wireOutboundFn(mockBroker, { validateOutbound: false });

                try {
                    await (mockBroker as any).sendCommand(
                        {
                            schema: { parse: jest.fn() },
                            publicationName: "admin_command_purge_sessions",
                            _type: "command",
                            _domain: "admin",
                            _name: "purgeSessions",
                            // delay: true means no default — caller must always specify a number
                            delay: true,
                        },
                        { olderThan: "2026-01-01" },
                        { delay: true }
                    );
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should throw a DelayedDeliveryError", () => {
                expect(caughtError).toBeDefined();
                expect(caughtError.name).toBe("DelayedDeliveryError");
            });

            it("should use the INVALID_DELAY error code", () => {
                expect(caughtError.code).toBe("DELAYED_DELIVERY_INVALID_DELAY");
            });
        });

        describe("when sendCommand is called with delay on a non-delay contract", () => {
            let caughtError: any, wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                wireOutboundFn(mockBroker, { validateOutbound: false });

                try {
                    await (mockBroker as any).sendCommand(
                        {
                            schema: { parse: jest.fn() },
                            publicationName: "admin_command_purge_sessions",
                            _type: "command",
                            _domain: "admin",
                            _name: "purgeSessions",
                        },
                        { olderThan: "2026-01-01" },
                        { delay: 5_000 }
                    );
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should throw a DelayedDeliveryError with INVALID_DELAY code", () => {
                expect(caughtError.name).toBe("DelayedDeliveryError");
                expect(caughtError.code).toBe("DELAYED_DELIVERY_INVALID_DELAY");
            });
        });

        describe("when an outbound interceptor short-circuits without calling publish", () => {
            let wireOutboundFn: typeof import("./wireOutbound").wireOutbound;

            beforeEach(async () => {
                ({ wireOutbound: wireOutboundFn } = await import("./wireOutbound"));

                const circuitBreaker: any = {
                    name: "circuit-breaker",
                    outbound: (_publish: any, _meta: any) => {
                        // returns a wrapper that never forwards to the broker
                        return async (_msg: any, _ovr: any) => {
                            // intentionally no publish call
                        };
                    },
                };

                wireOutboundFn(mockBroker, {
                    validateOutbound: false,
                    interceptors: [circuitBreaker],
                });

                await (mockBroker as any).publishEvent(
                    {
                        schema: { parse: jest.fn() },
                        publicationName: "grub_event_taco_ready",
                        _type: "event",
                        _domain: "grub",
                        _name: "tacoReady",
                    },
                    { tacoId: "t-99" }
                );
            });

            it("should not call broker.publish", () => {
                expect(mockBrokerPublish).not.toHaveBeenCalled();
            });
        });
    });
});
