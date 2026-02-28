/* eslint-disable @typescript-eslint/no-explicit-any */
export default {};

const mockHandleReadyMessage = jest.fn();
jest.mock("./handleReadyMessage", () => {
    return { handleReadyMessage: mockHandleReadyMessage };
});

const mockDelayedPublishError = jest.fn();
const mockDelayedPublishErrorCode = {
    INVALID_DELAY: "DELAYED_PUBLISH_INVALID_DELAY",
    QUEUE_FULL: "DELAYED_PUBLISH_QUEUE_FULL",
};
jest.mock("./types", () => {
    return {
        DelayedPublishError: mockDelayedPublishError,
        DelayedPublishErrorCode: mockDelayedPublishErrorCode,
    };
});

describe("packages > hoppity-delayed-publish > src > setupDelayedPublishBroker", () => {
    let mockBroker: any,
        mockSubscription: any,
        mockLogger: any,
        options: any,
        mockAckOrNack: any,
        mockPublish: any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        mockAckOrNack = jest.fn();
        mockPublish = jest.fn();
        mockSubscription = {
            on: jest.fn(),
        };
        mockBroker = {
            subscribe: jest.fn().mockResolvedValue(mockSubscription),
            publish: mockPublish,
        };
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        };
        options = {
            serviceName: "TEST_SERVICE",
            instanceId: "TEST_INSTANCE",
            defaultDelay: 30000,
        };
        mockHandleReadyMessage.mockResolvedValue(undefined);
        mockDelayedPublishError.mockImplementation((code, message, details) => {
            const error = new Error(message);
            error.name = "DelayedPublishError";
            (error as any).code = code;
            (error as any).details = details;
            return error;
        });
    });

    describe("with setupDelayedPublishBroker", () => {
        beforeEach(async () => {
            const mod = await import("./setupDelayedPublishBroker");
            await mod.setupDelayedPublishBroker(mockBroker, options, mockLogger);
        });

        it("should call subscribe with the expected subscription name", () => {
            expect(mockBroker.subscribe).toHaveBeenCalledWith("TEST_SERVICE_ready_subscription");
        });

        it("should set up message handler on the subscription", () => {
            expect(mockSubscription.on).toHaveBeenNthCalledWith(1, "message", expect.any(Function));
        });

        it("should set up error handler on the subscription", () => {
            expect(mockSubscription.on).toHaveBeenNthCalledWith(2, "error", expect.any(Function));
        });

        it("should extend the broker with delayedPublish method", () => {
            expect(mockBroker.delayedPublish).toBeDefined();
            expect(typeof mockBroker.delayedPublish).toBe("function");
        });

        it("should log info message about broker extension", () => {
            expect(mockLogger.info).toHaveBeenCalledWith(
                "[DelayedPublish] Broker extended with delayed publish capabilities for service: TEST_SERVICE"
            );
        });
    });

    describe("with the subscription message handler", () => {
        let messageHandler: any, content: any;

        beforeEach(async () => {
            const mod = await import("./setupDelayedPublishBroker");
            await mod.setupDelayedPublishBroker(mockBroker, options, mockLogger);
            messageHandler = mockSubscription.on.mock.calls.find(
                (call: any) => call[0] === "message"
            )[1];
            content = {
                originalMessage: "TEST_MESSAGE",
                originalPublication: "TEST_PUBLICATION",
                targetDelay: 5000,
                createdAt: Date.now(),
                retryCount: 0,
            };
        });

        describe("when message processing succeeds", () => {
            beforeEach(async () => {
                await messageHandler({}, content, mockAckOrNack);
            });

            it("should call handleReadyMessage with expected arguments", () => {
                expect(mockHandleReadyMessage).toHaveBeenCalledWith(
                    mockBroker,
                    content,
                    mockLogger,
                    "TEST_SERVICE_delayed_wait",
                    { maxRetries: 5, retryDelay: 1000, persistent: true }
                );
            });

            it("should call ackOrNack without error", () => {
                expect(mockAckOrNack).toHaveBeenCalledWith();
            });
        });

        describe("when message processing throws an error", () => {
            let error: any;

            beforeEach(async () => {
                error = new Error("E_SOGGY_STROMBOLI");
                mockHandleReadyMessage.mockRejectedValueOnce(error);
                await messageHandler({}, content, mockAckOrNack);
            });

            it("should log the error", () => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    "Error processing delayed message:",
                    error
                );
            });

            it("should call ackOrNack with the error", () => {
                expect(mockAckOrNack).toHaveBeenCalledWith(error);
            });
        });

        describe("when message processing throws a non-Error", () => {
            beforeEach(async () => {
                mockHandleReadyMessage.mockRejectedValueOnce("STRING_ERROR");
                await messageHandler({}, content, mockAckOrNack);
            });

            it("should call ackOrNack with a wrapped Error", () => {
                expect(mockAckOrNack).toHaveBeenCalledWith(new Error("STRING_ERROR"));
            });
        });
    });

    describe("with the subscription error handler", () => {
        let errorHandler: any, error: any;

        beforeEach(async () => {
            const mod = await import("./setupDelayedPublishBroker");
            await mod.setupDelayedPublishBroker(mockBroker, options, mockLogger);
            errorHandler = mockSubscription.on.mock.calls.find(
                (call: any) => call[0] === "error"
            )[1];
            error = new Error("E_COLD_CALZONE");
        });

        beforeEach(() => {
            errorHandler(error);
        });

        it("should log the subscription error", () => {
            expect(mockLogger.error).toHaveBeenCalledWith("Ready subscription error:", error);
        });
    });

    describe("with the delayedPublish method", () => {
        let delayedPublish: any;

        beforeEach(async () => {
            const mod = await import("./setupDelayedPublishBroker");
            await mod.setupDelayedPublishBroker(mockBroker, options, mockLogger);
            delayedPublish = mockBroker.delayedPublish;
        });

        describe("when called with valid parameters", () => {
            let message: any, overrides: any;

            beforeEach(async () => {
                message = { data: "TEST_DATA" };
                overrides = { routingKey: "test.route" };
                mockPublish.mockResolvedValue(undefined);
                await delayedPublish("TEST_PUBLICATION", message, overrides, 15000);
            });

            it("should call publish with the expected arguments", () => {
                expect(mockPublish).toHaveBeenCalledWith(
                    "TEST_SERVICE_delayed_wait",
                    {
                        originalMessage: message,
                        originalPublication: "TEST_PUBLICATION",
                        originalOverrides: overrides,
                        targetDelay: 15000,
                        createdAt: expect.any(Number),
                        retryCount: 0,
                    },
                    {
                        options: {
                            expiration: 15000,
                            persistent: true,
                        },
                    }
                );
            });

            it("should log debug message", () => {
                expect(mockLogger.debug).toHaveBeenCalledWith(
                    "[DelayedPublish] Published delayed message with 15000ms delay"
                );
            });
        });

        describe("when called without delay parameter", () => {
            beforeEach(async () => {
                mockPublish.mockResolvedValue(undefined);
                await delayedPublish("TEST_PUBLICATION", "TEST_MESSAGE");
            });

            it("should use the default delay", () => {
                expect(mockPublish).toHaveBeenCalledWith(
                    "TEST_SERVICE_delayed_wait",
                    {
                        originalMessage: "TEST_MESSAGE",
                        originalPublication: "TEST_PUBLICATION",
                        originalOverrides: undefined,
                        targetDelay: 30000,
                        createdAt: expect.any(Number),
                        retryCount: 0,
                    },
                    {
                        options: {
                            expiration: 30000,
                            persistent: true,
                        },
                    }
                );
            });
        });

        describe("when called without overrides parameter", () => {
            beforeEach(async () => {
                mockPublish.mockResolvedValue(undefined);
                await delayedPublish("TEST_PUBLICATION", "TEST_MESSAGE", undefined, 10000);
            });

            it("should handle undefined overrides", () => {
                expect(mockPublish).toHaveBeenCalledWith(
                    "TEST_SERVICE_delayed_wait",
                    {
                        originalMessage: "TEST_MESSAGE",
                        originalPublication: "TEST_PUBLICATION",
                        originalOverrides: undefined,
                        targetDelay: 10000,
                        createdAt: expect.any(Number),
                        retryCount: 0,
                    },
                    {
                        options: {
                            expiration: 10000,
                            persistent: true,
                        },
                    }
                );
            });
        });

        describe("when delay is zero", () => {
            beforeEach(async () => {
                try {
                    await delayedPublish("TEST_PUBLICATION", "TEST_MESSAGE", undefined, 0);
                } catch {
                    // Expected to throw
                }
            });

            it("should throw DelayedPublishError with INVALID_DELAY code", () => {
                expect(mockDelayedPublishError).toHaveBeenCalledWith(
                    mockDelayedPublishErrorCode.INVALID_DELAY,
                    "Invalid delay: 0. Delay must be greater than 0.",
                    { providedDelay: 0, defaultDelay: 30000 }
                );
            });
        });

        describe("when delay is negative", () => {
            beforeEach(async () => {
                try {
                    await delayedPublish("TEST_PUBLICATION", "TEST_MESSAGE", undefined, -1000);
                } catch {
                    // Expected to throw
                }
            });

            it("should throw DelayedPublishError with INVALID_DELAY code", () => {
                expect(mockDelayedPublishError).toHaveBeenCalledWith(
                    mockDelayedPublishErrorCode.INVALID_DELAY,
                    "Invalid delay: -1000. Delay must be greater than 0.",
                    { providedDelay: -1000, defaultDelay: 30000 }
                );
            });
        });

        describe("when publish fails with Error object", () => {
            let publishError: any;

            beforeEach(async () => {
                publishError = new Error("E_QUEUE_FULL");
                mockPublish.mockRejectedValue(publishError);
                try {
                    await delayedPublish("TEST_PUBLICATION", "TEST_MESSAGE", undefined, 5000);
                } catch {
                    // Expected to throw
                }
            });

            it("should log the error", () => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    "[DelayedPublish] Failed to publish delayed message:",
                    publishError
                );
            });

            it("should throw DelayedPublishError with QUEUE_FULL code", () => {
                expect(mockDelayedPublishError).toHaveBeenCalledWith(
                    mockDelayedPublishErrorCode.QUEUE_FULL,
                    "Failed to publish delayed message: E_QUEUE_FULL",
                    {
                        originalError: publishError,
                        publication: "TEST_PUBLICATION",
                        delay: 5000,
                        waitPublicationName: "TEST_SERVICE_delayed_wait",
                    }
                );
            });
        });

        describe("when publish fails with non-Error object", () => {
            let publishError: any;

            beforeEach(async () => {
                publishError = "E_SOGGY_STROMBOLI";
                mockPublish.mockRejectedValue(publishError);
                try {
                    await delayedPublish("TEST_PUBLICATION", "TEST_MESSAGE", undefined, 5000);
                } catch {
                    // Expected to throw
                }
            });

            it("should log the error", () => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    "[DelayedPublish] Failed to publish delayed message:",
                    publishError
                );
            });

            it("should throw DelayedPublishError with QUEUE_FULL code", () => {
                expect(mockDelayedPublishError).toHaveBeenCalledWith(
                    mockDelayedPublishErrorCode.QUEUE_FULL,
                    "Failed to publish delayed message: E_SOGGY_STROMBOLI",
                    {
                        originalError: publishError,
                        publication: "TEST_PUBLICATION",
                        delay: 5000,
                        waitPublicationName: "TEST_SERVICE_delayed_wait",
                    }
                );
            });
        });
    });

    describe("when logger is not provided", () => {
        beforeEach(async () => {
            const mod = await import("./setupDelayedPublishBroker");
            await mod.setupDelayedPublishBroker(mockBroker, options);
        });

        it("should not throw when subscription error occurs", () => {
            const errorHandler = mockSubscription.on.mock.calls.find(
                (call: any) => call[0] === "error"
            )[1];
            expect(() => errorHandler(new Error("TEST_ERROR"))).not.toThrow();
        });

        it("should not throw when message processing fails", async () => {
            const messageHandler = mockSubscription.on.mock.calls.find(
                (call: any) => call[0] === "message"
            )[1];
            mockHandleReadyMessage.mockRejectedValueOnce(new Error("TEST_ERROR"));
            await messageHandler({}, {}, mockAckOrNack);
            expect(mockAckOrNack).toHaveBeenCalledWith(new Error("TEST_ERROR"));
        });

        it("should not throw when delayedPublish fails", async () => {
            const delayedPublish = mockBroker.delayedPublish;
            mockPublish.mockRejectedValue(new Error("TEST_ERROR"));
            try {
                await delayedPublish("TEST_PUBLICATION", "TEST_MESSAGE");
            } catch {
                // Expected to throw
            }
            expect(mockDelayedPublishError).toHaveBeenCalled();
        });
    });

    describe("when custom maxRetries and retryDelay are provided", () => {
        beforeEach(async () => {
            options.maxRetries = 10;
            options.retryDelay = 3000;
            const mod = await import("./setupDelayedPublishBroker");
            await mod.setupDelayedPublishBroker(mockBroker, options, mockLogger);
        });

        it("should pass custom retry config to handleReadyMessage", async () => {
            const messageHandler = mockSubscription.on.mock.calls.find(
                (call: any) => call[0] === "message"
            )[1];
            const content = {
                originalMessage: "TEST_MESSAGE",
                originalPublication: "TEST_PUBLICATION",
                targetDelay: 5000,
                createdAt: Date.now(),
                retryCount: 0,
            };
            await messageHandler({}, content, mockAckOrNack);
            expect(mockHandleReadyMessage).toHaveBeenCalledWith(
                mockBroker,
                content,
                mockLogger,
                "TEST_SERVICE_delayed_wait",
                { maxRetries: 10, retryDelay: 3000, persistent: true }
            );
        });
    });

    describe("when defaultDelay is not provided", () => {
        beforeEach(async () => {
            const mod = await import("./setupDelayedPublishBroker");
            await mod.setupDelayedPublishBroker(
                mockBroker,
                { serviceName: "TEST_SERVICE", instanceId: "TEST_INSTANCE" },
                mockLogger
            );
        });

        it("should use the default delay of 30000ms", async () => {
            const delayedPublish = mockBroker.delayedPublish;
            mockPublish.mockResolvedValue(undefined);
            await delayedPublish("TEST_PUBLICATION", "TEST_MESSAGE");
            expect(mockPublish).toHaveBeenCalledWith(
                "TEST_SERVICE_delayed_wait",
                {
                    originalMessage: "TEST_MESSAGE",
                    originalPublication: "TEST_PUBLICATION",
                    originalOverrides: undefined,
                    targetDelay: 30000,
                    createdAt: expect.any(Number),
                    retryCount: 0,
                },
                {
                    options: {
                        expiration: 30000,
                        persistent: true,
                    },
                }
            );
        });
    });

    describe("when durable is set to false", () => {
        beforeEach(async () => {
            options.durable = false;
            const mod = await import("./setupDelayedPublishBroker");
            await mod.setupDelayedPublishBroker(mockBroker, options, mockLogger);
        });

        it("should publish with persistent: false", async () => {
            const delayedPublish = mockBroker.delayedPublish;
            mockPublish.mockResolvedValue(undefined);
            await delayedPublish("TEST_PUBLICATION", "TEST_MESSAGE");
            expect(mockPublish).toHaveBeenCalledWith(
                "TEST_SERVICE_delayed_wait",
                expect.any(Object),
                {
                    options: {
                        expiration: 30000,
                        persistent: false,
                    },
                }
            );
        });

        it("should pass persistent: false in retry config to handleReadyMessage", async () => {
            const messageHandler = mockSubscription.on.mock.calls.find(
                (call: any) => call[0] === "message"
            )[1];
            const content = {
                originalMessage: "TEST_MESSAGE",
                originalPublication: "TEST_PUBLICATION",
                targetDelay: 5000,
                createdAt: Date.now(),
                retryCount: 0,
            };
            await messageHandler({}, content, mockAckOrNack);
            expect(mockHandleReadyMessage).toHaveBeenCalledWith(
                mockBroker,
                content,
                mockLogger,
                "TEST_SERVICE_delayed_wait",
                { maxRetries: 5, retryDelay: 1000, persistent: false }
            );
        });
    });
});
