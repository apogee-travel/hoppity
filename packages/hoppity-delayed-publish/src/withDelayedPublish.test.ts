/* eslint-disable @typescript-eslint/no-explicit-any */
export default {};

const mockSetupDelayedPublishBroker = jest.fn();
jest.mock("./setupDelayedPublishBroker", () => {
    return {
        setupDelayedPublishBroker: mockSetupDelayedPublishBroker,
    };
});

import type { MiddlewareFunction, MiddlewareResult } from "@apogeelabs/hoppity";
import type { DelayedPublishOptions } from "./types";
import { withDelayedPublish } from "./withDelayedPublish";

describe("packages > hoppity-delayed-publish > src > withDelayedPublish", () => {
    let mockLogger: any,
        mockContext: any,
        mockTopology: any,
        mockBroker: any,
        middlewareFunction: MiddlewareFunction,
        result: MiddlewareResult;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
        };
        mockContext = {
            logger: mockLogger,
            middlewareNames: ["test-middleware"],
            data: {},
        };
        mockTopology = {
            vhosts: {
                "/": {
                    queues: {},
                    publications: {},
                    subscriptions: {},
                },
                "/test": {
                    queues: {},
                    publications: {},
                    subscriptions: {},
                },
            },
        };
        mockBroker = {
            publish: jest.fn(),
            subscribe: jest.fn(),
        };
        mockSetupDelayedPublishBroker.mockResolvedValue(undefined);
    });

    describe("withDelayedPublish", () => {
        describe("when serviceName is missing", () => {
            it("should throw an error", () => {
                const options = {
                    instanceId: "INSTANCE_ID",
                } as DelayedPublishOptions;

                expect(() => withDelayedPublish(options)).toThrow(
                    "withDelayedPublish: serviceName is required and must be a non-empty string"
                );
            });
        });

        describe("when serviceName is empty string", () => {
            it("should throw an error", () => {
                const options = {
                    serviceName: "",
                    instanceId: "INSTANCE_ID",
                } as DelayedPublishOptions;

                expect(() => withDelayedPublish(options)).toThrow(
                    "withDelayedPublish: serviceName is required and must be a non-empty string"
                );
            });
        });

        describe("when serviceName is whitespace only", () => {
            it("should throw an error", () => {
                const options = {
                    serviceName: "   ",
                    instanceId: "INSTANCE_ID",
                } as DelayedPublishOptions;

                expect(() => withDelayedPublish(options)).toThrow(
                    "withDelayedPublish: serviceName is required and must be a non-empty string"
                );
            });
        });

        describe("when instanceId is missing", () => {
            it("should throw an error", () => {
                const options = {
                    serviceName: "SERVICE_NAME",
                } as DelayedPublishOptions;

                expect(() => withDelayedPublish(options)).toThrow(
                    "withDelayedPublish: instanceId is required and must be a non-empty string"
                );
            });
        });

        describe("when instanceId is empty string", () => {
            it("should throw an error", () => {
                const options = {
                    serviceName: "SERVICE_NAME",
                    instanceId: "",
                } as DelayedPublishOptions;

                expect(() => withDelayedPublish(options)).toThrow(
                    "withDelayedPublish: instanceId is required and must be a non-empty string"
                );
            });
        });

        describe("when instanceId is whitespace only", () => {
            it("should throw an error", () => {
                const options = {
                    serviceName: "SERVICE_NAME",
                    instanceId: "   ",
                } as DelayedPublishOptions;

                expect(() => withDelayedPublish(options)).toThrow(
                    "withDelayedPublish: instanceId is required and must be a non-empty string"
                );
            });
        });

        describe("when options are valid", () => {
            let options: DelayedPublishOptions;

            beforeEach(() => {
                options = {
                    serviceName: "PIZZA_SERVICE",
                    instanceId: "INSTANCE_8675309",
                    defaultDelay: 60000,
                };
                middlewareFunction = withDelayedPublish(options);
            });

            it("should return a middleware function", () => {
                expect(typeof middlewareFunction).toBe("function");
            });

            describe("when the middleware function is called", () => {
                beforeEach(() => {
                    result = middlewareFunction(mockTopology, mockContext);
                });

                it("should log info message about applying middleware", () => {
                    expect(mockLogger.info).toHaveBeenCalledWith(
                        "[DelayedPublish] Applying delayed publish middleware for service: PIZZA_SERVICE"
                    );
                });

                it("should log debug message about previous middleware", () => {
                    expect(mockLogger.debug).toHaveBeenCalledWith(
                        "[DelayedPublish] Previous middleware: test-middleware"
                    );
                });

                it("should store delayed publish configuration in context", () => {
                    expect(mockContext.data.delayedPublishConfig).toEqual({
                        serviceName: "PIZZA_SERVICE",
                        instanceId: "INSTANCE_8675309",
                        defaultDelay: 60000,
                        waitQueueName: "PIZZA_SERVICE_wait",
                        readyQueueName: "PIZZA_SERVICE_ready",
                        errorQueueName: "PIZZA_SERVICE_delayed_errors",
                    });
                });

                it("should return topology and onBrokerCreated callback", () => {
                    expect(result).toEqual({
                        topology: expect.any(Object),
                        onBrokerCreated: expect.any(Function),
                    });
                });

                describe("when topology has no vhosts", () => {
                    beforeEach(() => {
                        mockTopology.vhosts = undefined;
                        result = middlewareFunction(mockTopology, mockContext);
                    });

                    it("should create vhosts object", () => {
                        expect(result.topology.vhosts).toEqual({});
                    });
                });

                describe("when vhost has no queues", () => {
                    beforeEach(() => {
                        mockTopology.vhosts["/"].queues = undefined;
                        result = middlewareFunction(mockTopology, mockContext);
                    });

                    it("should create queues object", () => {
                        expect(result.topology.vhosts!["/"].queues).toEqual({
                            PIZZA_SERVICE_wait: {
                                options: {
                                    durable: true,
                                    autoDelete: false,
                                    arguments: {
                                        "x-dead-letter-exchange": "",
                                        "x-dead-letter-routing-key": "PIZZA_SERVICE_ready",
                                    },
                                },
                            },
                            PIZZA_SERVICE_ready: {
                                options: {
                                    durable: true,
                                    autoDelete: false,
                                },
                            },
                            PIZZA_SERVICE_delayed_errors: {
                                options: {
                                    durable: true,
                                    autoDelete: false,
                                },
                            },
                        });
                    });
                });

                describe("when vhost has no publications", () => {
                    beforeEach(() => {
                        mockTopology.vhosts["/"].publications = undefined;
                        result = middlewareFunction(mockTopology, mockContext);
                    });

                    it("should create publications object", () => {
                        expect(result.topology.vhosts!["/"].publications).toEqual({
                            PIZZA_SERVICE_delayed_wait: {
                                exchange: "",
                                routingKey: "PIZZA_SERVICE_wait",
                                options: {
                                    persistent: true,
                                },
                            },
                        });
                    });
                });

                describe("when vhost has no subscriptions", () => {
                    beforeEach(() => {
                        mockTopology.vhosts["/"].subscriptions = undefined;
                        result = middlewareFunction(mockTopology, mockContext);
                    });

                    it("should create subscriptions object", () => {
                        expect(result.topology.vhosts!["/"].subscriptions).toEqual({
                            PIZZA_SERVICE_ready_subscription: {
                                queue: "PIZZA_SERVICE_ready",
                                options: {
                                    prefetch: 1,
                                },
                            },
                        });
                    });
                });

                describe("when vhost has existing queues", () => {
                    beforeEach(() => {
                        mockTopology.vhosts["/"].queues = {
                            existing_queue: { options: {} },
                        };
                        result = middlewareFunction(mockTopology, mockContext);
                    });

                    it("should add delayed publish queues to existing queues", () => {
                        expect(result.topology.vhosts!["/"].queues).toEqual({
                            existing_queue: { options: {} },
                            PIZZA_SERVICE_wait: {
                                options: {
                                    durable: true,
                                    autoDelete: false,
                                    arguments: {
                                        "x-dead-letter-exchange": "",
                                        "x-dead-letter-routing-key": "PIZZA_SERVICE_ready",
                                    },
                                },
                            },
                            PIZZA_SERVICE_ready: {
                                options: {
                                    durable: true,
                                    autoDelete: false,
                                },
                            },
                            PIZZA_SERVICE_delayed_errors: {
                                options: {
                                    durable: true,
                                    autoDelete: false,
                                },
                            },
                        });
                    });
                });

                describe("when vhost has existing publications", () => {
                    beforeEach(() => {
                        mockTopology.vhosts["/"].publications = {
                            existing_publication: { exchange: "test" },
                        };
                        result = middlewareFunction(mockTopology, mockContext);
                    });

                    it("should add delayed publish publication to existing publications", () => {
                        expect(result.topology.vhosts!["/"].publications).toEqual({
                            existing_publication: { exchange: "test" },
                            PIZZA_SERVICE_delayed_wait: {
                                exchange: "",
                                routingKey: "PIZZA_SERVICE_wait",
                                options: {
                                    persistent: true,
                                },
                            },
                        });
                    });
                });

                describe("when vhost has existing subscriptions", () => {
                    beforeEach(() => {
                        mockTopology.vhosts["/"].subscriptions = {
                            existing_subscription: { queue: "test" },
                        };
                        result = middlewareFunction(mockTopology, mockContext);
                    });

                    it("should add delayed publish subscription to existing subscriptions", () => {
                        expect(result.topology.vhosts!["/"].subscriptions).toEqual({
                            existing_subscription: { queue: "test" },
                            PIZZA_SERVICE_ready_subscription: {
                                queue: "PIZZA_SERVICE_ready",
                                options: {
                                    prefetch: 1,
                                },
                            },
                        });
                    });
                });

                describe("when multiple vhosts exist", () => {
                    beforeEach(() => {
                        mockTopology.vhosts = {
                            "/": { queues: {}, publications: {}, subscriptions: {} },
                            "/test": { queues: {}, publications: {}, subscriptions: {} },
                        };
                        result = middlewareFunction(mockTopology, mockContext);
                    });

                    it("should add delayed publish infrastructure to all vhosts", () => {
                        expect(result.topology.vhosts!["/"].queues).toHaveProperty(
                            "PIZZA_SERVICE_wait"
                        );
                        expect(result.topology.vhosts!["/test"].queues).toHaveProperty(
                            "PIZZA_SERVICE_wait"
                        );
                    });

                    it("should log debug messages for each vhost", () => {
                        expect(mockLogger.debug).toHaveBeenCalledWith(
                            "[DelayedPublish] Added delayed publish infrastructure to vhost '/':"
                        );
                        expect(mockLogger.debug).toHaveBeenCalledWith(
                            "[DelayedPublish] Added delayed publish infrastructure to vhost '/test':"
                        );
                    });
                });

                describe("when context has no middleware names", () => {
                    beforeEach(() => {
                        mockContext.middlewareNames = [];
                        result = middlewareFunction(mockTopology, mockContext);
                    });

                    it("should log debug message with 'none'", () => {
                        expect(mockLogger.debug).toHaveBeenCalledWith(
                            "[DelayedPublish] Previous middleware: none"
                        );
                    });
                });

                describe("when context has existing delayed publish config", () => {
                    beforeEach(() => {
                        mockContext.data.delayedPublishConfig = {
                            serviceName: "EXISTING_SERVICE",
                            instanceId: "EXISTING_INSTANCE",
                        };
                        result = middlewareFunction(mockTopology, mockContext);
                    });

                    it("should log warning about existing configuration", () => {
                        expect(mockLogger.warn).toHaveBeenCalledWith(
                            "[DelayedPublish] Warning: Delayed publish configuration already exists in context from previous middleware"
                        );
                    });

                    it("should log existing configuration", () => {
                        expect(mockLogger.warn).toHaveBeenCalledWith(
                            "[DelayedPublish] Existing config:",
                            {
                                serviceName: "EXISTING_SERVICE",
                                instanceId: "EXISTING_INSTANCE",
                            }
                        );
                    });
                });

                describe("when defaultDelay is not provided", () => {
                    beforeEach(() => {
                        delete options.defaultDelay;
                        middlewareFunction = withDelayedPublish(options);
                        result = middlewareFunction(mockTopology, mockContext);
                    });

                    it("should use default delay of 30000", () => {
                        expect(mockContext.data.delayedPublishConfig.defaultDelay).toBe(30000);
                    });
                });

                describe("when durable is set to false", () => {
                    beforeEach(() => {
                        options.durable = false;
                        middlewareFunction = withDelayedPublish(options);
                        result = middlewareFunction(mockTopology, mockContext);
                    });

                    it("should set queues as non-durable", () => {
                        const vhost = result.topology.vhosts!["/"];
                        expect((vhost.queues as any).PIZZA_SERVICE_wait.options.durable).toBe(
                            false
                        );
                        expect((vhost.queues as any).PIZZA_SERVICE_ready.options.durable).toBe(
                            false
                        );
                        expect(
                            (vhost.queues as any).PIZZA_SERVICE_delayed_errors.options.durable
                        ).toBe(false);
                    });

                    it("should set publication as non-persistent", () => {
                        const vhost = result.topology.vhosts!["/"];
                        expect(
                            (vhost.publications as any).PIZZA_SERVICE_delayed_wait.options
                                .persistent
                        ).toBe(false);
                    });
                });

                describe("when onBrokerCreated callback is called", () => {
                    beforeEach(() => {
                        result.onBrokerCreated!(mockBroker);
                    });

                    it("should call setupDelayedPublishBroker with broker and options", () => {
                        expect(mockSetupDelayedPublishBroker).toHaveBeenCalledWith(
                            mockBroker,
                            options,
                            mockLogger
                        );
                    });
                });
            });
        });
    });
});
