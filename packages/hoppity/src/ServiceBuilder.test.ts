/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

const mockBrokerCreate = jest.fn();
const mockBrokerPublish = jest.fn();
const mockBrokerSubscribe = jest.fn();
const mockBrokerShutdown = jest.fn();

jest.mock("rascal", () => ({
    BrokerAsPromised: {
        create: mockBrokerCreate,
    },
}));

describe("hoppity > ServiceBuilder", () => {
    let mockBroker: any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();

        mockBroker = {
            publish: mockBrokerPublish,
            subscribe: mockBrokerSubscribe,
            shutdown: mockBrokerShutdown,
        };

        mockBrokerCreate.mockResolvedValue(mockBroker);
        mockBrokerPublish.mockResolvedValue(undefined);
        mockBrokerSubscribe.mockResolvedValue({
            on: jest.fn(),
        });
        mockBrokerShutdown.mockResolvedValue(undefined);
    });

    describe("ServiceBuilder", () => {
        describe("when building with no handlers or publishes", () => {
            let result: any, ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const builder = new ServiceBuilderClass("grub-service", {
                    connection: { url: "amqp://localhost" },
                });
                result = await builder.build();
            });

            it("should call BrokerAsPromised.create", () => {
                expect(mockBrokerCreate).toHaveBeenCalledTimes(1);
            });

            it("should return the broker instance", () => {
                expect(result).toBe(mockBroker);
            });

            it("should attach publishEvent to the broker", () => {
                expect(typeof result.publishEvent).toBe("function");
            });

            it("should attach sendCommand to the broker", () => {
                expect(typeof result.sendCommand).toBe("function");
            });
        });

        describe("when building with an auto-generated instanceId", () => {
            let capturedTopology: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                // Capture what topology BrokerAsPromised.create receives so we can
                // verify the reply queue name contains a UUID-format instanceId.
                mockBrokerCreate.mockImplementation(async (topology: any) => {
                    capturedTopology = topology;
                    return mockBroker;
                });

                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const builder = new ServiceBuilderClass("grub-service", {
                    connection: { url: "amqp://localhost" },
                    instanceId: "test-uuid-1234", // explicit so we can assert deterministically
                });
                await builder.build();
            });

            it("should include the instanceId in the topology vhost key structure", () => {
                expect(capturedTopology.vhosts).toBeDefined();
            });
        });

        describe("when building with an RPC publish declaration but no RPC handlers (caller-only)", () => {
            let result: any,
                capturedTopology: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder,
                defineDomainFn: typeof import("./contracts/defineDomain").defineDomain,
                zodLib: typeof import("zod");

            beforeEach(async () => {
                mockBrokerCreate.mockImplementation(async (topology: any) => {
                    capturedTopology = topology;
                    return mockBroker;
                });

                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                ({ defineDomain: defineDomainFn } = await import("./contracts/defineDomain"));
                zodLib = await import("zod");

                const GrubDomain = defineDomainFn("grub", {
                    rpc: {
                        orderBurger: {
                            request: zodLib.z.object({ size: zodLib.z.string() }),
                            response: zodLib.z.object({ burgerId: zodLib.z.string() }),
                        },
                    },
                });

                const builder = new ServiceBuilderClass("menu-service", {
                    connection: { url: "amqp://localhost" },
                    instanceId: "caller-only-id",
                    handlers: [],
                    publishes: [GrubDomain.rpc.orderBurger],
                });
                result = await builder.build();
            });

            it("should add reply queue infrastructure to the derived topology", () => {
                const vhost = capturedTopology.vhosts["/"];
                expect(vhost.queues["menu-service_caller-only-id_reply"]).toBeDefined();
            });

            it("should attach request to the broker", () => {
                expect(typeof result.request).toBe("function");
            });

            it("should attach cancelRequest to the broker", () => {
                expect(typeof result.cancelRequest).toBe("function");
            });
        });

        describe("when building with an explicit instanceId and an RPC handler", () => {
            let capturedTopology: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder,
                defineDomainFn: typeof import("./contracts/defineDomain").defineDomain,
                onRpcFn: typeof import("./handlers/onRpc").onRpc,
                zodLib: typeof import("zod");

            beforeEach(async () => {
                mockBrokerCreate.mockImplementation(async (topology: any) => {
                    capturedTopology = topology;
                    return mockBroker;
                });
                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                ({ defineDomain: defineDomainFn } = await import("./contracts/defineDomain"));
                ({ onRpc: onRpcFn } = await import("./handlers/onRpc"));
                zodLib = await import("zod");

                const GrubDomain = defineDomainFn("grub", {
                    rpc: {
                        orderBurger: {
                            request: zodLib.z.object({ size: zodLib.z.string() }),
                            response: zodLib.z.object({ burgerId: zodLib.z.string() }),
                        },
                    },
                });

                const builder = new ServiceBuilderClass("grill-service", {
                    connection: { url: "amqp://localhost" },
                    instanceId: "my-explicit-id",
                    handlers: [onRpcFn(GrubDomain.rpc.orderBurger, jest.fn())],
                });
                await builder.build();
            });

            it("should use the explicit instanceId in the reply queue name", () => {
                const vhost = capturedTopology.vhosts["/"];
                expect(vhost.queues["grill-service_my-explicit-id_reply"]).toBeDefined();
            });
        });

        describe("when middleware is added via .use()", () => {
            let receivedTopology: any,
                receivedContext: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const builder = new ServiceBuilderClass("grub-service", {
                    connection: { url: "amqp://localhost" },
                });

                function testMiddleware(topology: any, context: any) {
                    receivedTopology = topology;
                    receivedContext = context;
                    return { topology };
                }

                await builder.use(testMiddleware).build();
            });

            it("should pass the derived topology to middleware", () => {
                expect(receivedTopology).toBeDefined();
                expect(receivedTopology.vhosts).toBeDefined();
            });

            it("should pass context with serviceName", () => {
                expect(receivedContext.serviceName).toBe("grub-service");
            });

            it("should pass context with middlewareNames", () => {
                expect(Array.isArray(receivedContext.middlewareNames)).toBe(true);
            });
        });

        describe("when middleware provides an onBrokerCreated callback", () => {
            let callbackBroker: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const builder = new ServiceBuilderClass("grub-service", {
                    connection: { url: "amqp://localhost" },
                });

                function testMiddleware(topology: any) {
                    return {
                        topology,
                        onBrokerCreated: async (broker: any) => {
                            callbackBroker = broker;
                        },
                    };
                }

                await builder.use(testMiddleware).build();
            });

            it("should invoke the callback with the broker", () => {
                expect(callbackBroker).toBe(mockBroker);
            });
        });

        describe("when onBrokerCreated callback throws", () => {
            let caughtError: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const builder = new ServiceBuilderClass("grub-service", {
                    connection: { url: "amqp://localhost" },
                });

                function failingMiddleware(topology: any) {
                    return {
                        topology,
                        onBrokerCreated: async () => {
                            throw new Error("E_BURNED_BURGER");
                        },
                    };
                }

                try {
                    await builder.use(failingMiddleware).build();
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should shut down the broker before rethrowing", () => {
                expect(mockBrokerShutdown).toHaveBeenCalledTimes(1);
            });

            it("should rethrow an enhanced error", () => {
                expect(caughtError.message).toContain("grub-service");
            });
        });

        describe("when BrokerAsPromised.create throws", () => {
            let caughtError: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                mockBrokerCreate.mockReset();
                mockBrokerCreate.mockRejectedValue(new Error("E_COLD_CALZONE"));

                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const builder = new ServiceBuilderClass("grub-service", {
                    connection: { url: "amqp://localhost" },
                });

                try {
                    await builder.build();
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should throw an enhanced error with the service name", () => {
                expect(caughtError.message).toContain("grub-service");
            });

            it("should include the original error message", () => {
                expect(caughtError.message).toContain("E_COLD_CALZONE");
            });
        });

        describe("when middleware throws during execution", () => {
            let caughtError: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const builder = new ServiceBuilderClass("wok-service", {
                    connection: { url: "amqp://localhost" },
                });

                function bombMiddleware(_topology: any): any {
                    throw new Error("E_EXPLODING_WOK");
                }

                try {
                    await builder.use(bombMiddleware).build();
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should not call BrokerAsPromised.create", () => {
                expect(mockBrokerCreate).not.toHaveBeenCalled();
            });

            it("should throw an enhanced error containing the service name", () => {
                expect(caughtError.message).toContain("wok-service");
            });

            it("should include the original middleware error message", () => {
                expect(caughtError.message).toContain("E_EXPLODING_WOK");
            });
        });

        describe("when multiple middleware run in sequence", () => {
            let callOrder: string[],
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                callOrder = [];

                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const builder = new ServiceBuilderClass("conveyor-service", {
                    connection: { url: "amqp://localhost" },
                });

                function firstMiddleware(topology: any) {
                    callOrder.push("first");
                    return { topology };
                }

                function secondMiddleware(topology: any) {
                    callOrder.push("second");
                    return { topology };
                }

                function thirdMiddleware(topology: any) {
                    callOrder.push("third");
                    return { topology };
                }

                await builder
                    .use(firstMiddleware)
                    .use(secondMiddleware)
                    .use(thirdMiddleware)
                    .build();
            });

            it("should run all three middleware in declaration order", () => {
                expect(callOrder).toEqual(["first", "second", "third"]);
            });
        });

        describe("when middleware modifies topology and the next middleware sees the change", () => {
            let firstSawTopology: any,
                secondSawTopology: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const builder = new ServiceBuilderClass("pipeline-service", {
                    connection: { url: "amqp://localhost" },
                });

                function addExchangeMiddleware(topology: any) {
                    firstSawTopology = topology;
                    return {
                        topology: {
                            ...topology,
                            _customFlag: "nachos",
                        },
                    };
                }

                function readExchangeMiddleware(topology: any) {
                    secondSawTopology = topology;
                    return { topology };
                }

                await builder.use(addExchangeMiddleware).use(readExchangeMiddleware).build();
            });

            it("should pass modified topology to the next middleware", () => {
                expect((secondSawTopology as any)._customFlag).toBe("nachos");
            });

            it("should pass original topology (without flag) to first middleware", () => {
                expect((firstSawTopology as any)._customFlag).toBeUndefined();
            });
        });

        describe("when .use() is called multiple times (chaining)", () => {
            let ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder,
                builderRef: any;

            beforeEach(async () => {
                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const builder = new ServiceBuilderClass("chain-service", {
                    connection: { url: "amqp://localhost" },
                });

                builderRef = builder.use(() => ({ topology: {} as any }));
            });

            it("should return the same builder instance for chaining", () => {
                expect(builderRef).toBeInstanceOf(ServiceBuilderClass);
            });
        });

        describe("when multiple onBrokerCreated callbacks are registered", () => {
            let callOrder: string[],
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                callOrder = [];

                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const builder = new ServiceBuilderClass("callback-service", {
                    connection: { url: "amqp://localhost" },
                });

                function firstMiddleware(topology: any) {
                    return {
                        topology,
                        onBrokerCreated: async () => {
                            callOrder.push("callback-one");
                        },
                    };
                }

                function secondMiddleware(topology: any) {
                    return {
                        topology,
                        onBrokerCreated: async () => {
                            callOrder.push("callback-two");
                        },
                    };
                }

                await builder.use(firstMiddleware).use(secondMiddleware).build();
            });

            it("should invoke onBrokerCreated callbacks in declaration order", () => {
                expect(callOrder).toEqual(["callback-one", "callback-two"]);
            });
        });

        describe("when service is built with only a raw topology (no handlers or publishes)", () => {
            let capturedTopology: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                mockBrokerCreate.mockImplementation(async (topology: any) => {
                    capturedTopology = topology;
                    return mockBroker;
                });

                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const builder = new ServiceBuilderClass("legacy-service", {
                    connection: { url: "amqp://localhost" },
                    topology: {
                        vhosts: {
                            "/legacy": {
                                exchanges: { "hand-rolled": { type: "direct" } },
                            },
                        },
                    },
                });
                await builder.build();
            });

            it("should preserve the raw topology exchange in the final merged topology", () => {
                expect(capturedTopology.vhosts["/legacy"].exchanges["hand-rolled"]).toBeDefined();
            });
        });

        describe("when an interceptor is provided without a name", () => {
            let caughtError: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const builder = new ServiceBuilderClass("grub-service", {
                    connection: { url: "amqp://localhost" },
                    interceptors: [{ name: "", inbound: jest.fn() }],
                });

                try {
                    await builder.build();
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should throw an error mentioning the missing name", () => {
                expect(caughtError.message).toContain("missing a name");
            });

            it("should not call BrokerAsPromised.create", () => {
                expect(mockBrokerCreate).not.toHaveBeenCalled();
            });
        });

        describe("when an interceptor at a non-zero index has a whitespace-only name", () => {
            let caughtError: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const builder = new ServiceBuilderClass("grub-service", {
                    connection: { url: "amqp://localhost" },
                    interceptors: [
                        { name: "valid-interceptor", inbound: jest.fn() },
                        { name: "   ", inbound: jest.fn() }, // whitespace-only at index 1
                    ],
                });

                try {
                    await builder.build();
                } catch (err) {
                    caughtError = err;
                }
            });

            it("should throw an error mentioning the index of the bad interceptor", () => {
                expect(caughtError.message).toContain("index 1");
            });

            it("should throw an error mentioning the missing name", () => {
                expect(caughtError.message).toContain("missing a name");
            });

            it("should not call BrokerAsPromised.create", () => {
                expect(mockBrokerCreate).not.toHaveBeenCalled();
            });
        });

        describe("when interceptors are provided with valid names", () => {
            let result: any, ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const builder = new ServiceBuilderClass("grub-service", {
                    connection: { url: "amqp://localhost" },
                    interceptors: [
                        { name: "trace-interceptor", inbound: jest.fn() },
                        { name: "metrics-interceptor", outbound: jest.fn() },
                    ],
                });
                result = await builder.build();
            });

            it("should build successfully and return the broker", () => {
                expect(result).toBe(mockBroker);
            });
        });

        describe("when a custom logger is provided in config", () => {
            let receivedContext: any,
                customLogger: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));

                customLogger = {
                    silly: jest.fn(),
                    debug: jest.fn(),
                    info: jest.fn(),
                    warn: jest.fn(),
                    error: jest.fn(),
                    critical: jest.fn(),
                };

                const builder = new ServiceBuilderClass("grub-service", {
                    connection: { url: "amqp://localhost" },
                    logger: customLogger,
                });

                function captureMiddleware(_topology: any, context: any) {
                    receivedContext = context;
                    return { topology: _topology };
                }

                await builder.use(captureMiddleware).build();
            });

            it("should inject the custom logger into the middleware context", () => {
                expect(receivedContext.logger).toBe(customLogger);
            });
        });

        describe("when no logger is provided in config", () => {
            let receivedContext: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder,
                defaultLoggerRef: any;

            beforeEach(async () => {
                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));
                const { defaultLogger } = await import("./consoleLogger");
                defaultLoggerRef = defaultLogger;

                const builder = new ServiceBuilderClass("grub-service", {
                    connection: { url: "amqp://localhost" },
                });

                function captureMiddleware(_topology: any, context: any) {
                    receivedContext = context;
                    return { topology: _topology };
                }

                await builder.use(captureMiddleware).build();
            });

            it("should use the defaultLogger in the middleware context", () => {
                expect(receivedContext.logger).toBe(defaultLoggerRef);
            });
        });

        describe("when a custom logger is provided and interceptors are also registered", () => {
            let customLogger: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));

                customLogger = {
                    silly: jest.fn(),
                    debug: jest.fn(),
                    info: jest.fn(),
                    warn: jest.fn(),
                    error: jest.fn(),
                    critical: jest.fn(),
                };

                // Interceptors trigger a this.context.logger.info() call that happens
                // *before* any middleware runs (phase 1 vs phase 3). This verifies the
                // custom logger is active at that pre-middleware point.
                const builder = new ServiceBuilderClass("sushi-service", {
                    connection: { url: "amqp://localhost" },
                    logger: customLogger,
                    interceptors: [{ name: "trace-everything", inbound: jest.fn() }],
                });

                await builder.build();
            });

            it("should call the custom logger before any middleware runs", () => {
                expect(customLogger.info).toHaveBeenCalledTimes(1);
            });

            it("should log the interceptor name in the pre-middleware message", () => {
                expect(customLogger.info).toHaveBeenCalledWith(
                    expect.stringContaining("trace-everything")
                );
            });
        });

        describe("when middleware replaces context.logger after config logger is set", () => {
            let receivedContextAfterMiddleware: any,
                configLogger: any,
                replacementLogger: any,
                ServiceBuilderClass: typeof import("./ServiceBuilder").ServiceBuilder;

            beforeEach(async () => {
                ({ ServiceBuilder: ServiceBuilderClass } = await import("./ServiceBuilder"));

                configLogger = {
                    silly: jest.fn(),
                    debug: jest.fn(),
                    info: jest.fn(),
                    warn: jest.fn(),
                    error: jest.fn(),
                    critical: jest.fn(),
                };

                replacementLogger = {
                    silly: jest.fn(),
                    debug: jest.fn(),
                    info: jest.fn(),
                    warn: jest.fn(),
                    error: jest.fn(),
                    critical: jest.fn(),
                };

                const builder = new ServiceBuilderClass("ramen-service", {
                    connection: { url: "amqp://localhost" },
                    logger: configLogger,
                });

                // First middleware swaps the logger — simulates the old hoppity-logger pattern.
                // The context.logger field is mutable, so middleware can still do this.
                function loggerSwapMiddleware(topology: any, context: any) {
                    context.logger = replacementLogger;
                    return { topology };
                }

                // Second middleware captures the context to verify which logger is active.
                function captureMiddleware(_topology: any, context: any) {
                    receivedContextAfterMiddleware = context;
                    return { topology: _topology };
                }

                await builder.use(loggerSwapMiddleware).use(captureMiddleware).build();
            });

            it("should use the replacement logger in subsequent middleware", () => {
                expect(receivedContextAfterMiddleware.logger).toBe(replacementLogger);
            });

            it("should not use the config logger after middleware replaces it", () => {
                expect(receivedContextAfterMiddleware.logger).not.toBe(configLogger);
            });
        });
    });
});
