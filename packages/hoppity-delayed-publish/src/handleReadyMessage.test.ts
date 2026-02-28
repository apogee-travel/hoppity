/* eslint-disable @typescript-eslint/no-explicit-any */

const mockBroker = {
    publish: jest.fn(),
};

jest.mock("rascal", () => {
    return {
        BrokerAsPromised: jest.fn(),
    };
});

const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
};

import { DelayedPublishErrorCode } from "./types";

export default {};

describe("packages > hoppity-delayed-publish > src > handleReadyMessage", () => {
    let broker: any, delayedMessage: any, logger: any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        broker = { ...mockBroker };
        logger = { ...mockLogger };
        delayedMessage = {
            originalMessage: { userId: "8675309", action: "order_pizza" },
            originalPublication: "user_events",
            originalOverrides: {
                options: {
                    persistent: true,
                },
            },
            targetDelay: 5000,
            createdAt: 1640995200000,
            retryCount: 0,
        };
    });

    describe("when everything goes splendiferously", () => {
        beforeEach(async () => {
            broker.publish.mockResolvedValueOnce(undefined);
            const mod = await import("./handleReadyMessage");
            await mod.handleReadyMessage(broker, delayedMessage, logger);
        });

        it("should call broker.publish with the original publication and message", () => {
            expect(broker.publish).toHaveBeenCalledTimes(1);
            expect(broker.publish).toHaveBeenCalledWith(
                "user_events",
                { userId: "8675309", action: "order_pizza" },
                {
                    options: {
                        persistent: true,
                        mandatory: true,
                    },
                }
            );
        });

        it("should log a debug message on successful re-publish", () => {
            expect(logger.debug).toHaveBeenCalledWith(
                "[DelayedPublish] Successfully re-published delayed message from publication: user_events"
            );
        });
    });

    describe("when delayed message has no retry count", () => {
        beforeEach(async () => {
            delete delayedMessage.retryCount;
            broker.publish.mockResolvedValueOnce(undefined);
            const mod = await import("./handleReadyMessage");
            await mod.handleReadyMessage(broker, delayedMessage, logger);
        });

        it("should treat retry count as 0", () => {
            expect(broker.publish).toHaveBeenCalledTimes(1);
        });
    });

    describe("when delayed message has no original overrides", () => {
        beforeEach(async () => {
            delete delayedMessage.originalOverrides;
            broker.publish.mockResolvedValueOnce(undefined);
            const mod = await import("./handleReadyMessage");
            await mod.handleReadyMessage(broker, delayedMessage, logger);
        });

        it("should call broker.publish with default overrides", () => {
            expect(broker.publish).toHaveBeenCalledWith(
                "user_events",
                { userId: "8675309", action: "order_pizza" },
                {
                    options: {
                        mandatory: true,
                    },
                }
            );
        });
    });

    describe("when delayed message has original overrides without options", () => {
        beforeEach(async () => {
            delayedMessage.originalOverrides = {
                routingKey: "custom.routing.key",
            };
            broker.publish.mockResolvedValueOnce(undefined);
            const mod = await import("./handleReadyMessage");
            await mod.handleReadyMessage(broker, delayedMessage, logger);
        });

        it("should call broker.publish with merged overrides", () => {
            expect(broker.publish).toHaveBeenCalledWith(
                "user_events",
                { userId: "8675309", action: "order_pizza" },
                {
                    routingKey: "custom.routing.key",
                    options: {
                        mandatory: true,
                    },
                }
            );
        });
    });

    describe("when logger is not provided", () => {
        beforeEach(async () => {
            broker.publish.mockResolvedValueOnce(undefined);
            const mod = await import("./handleReadyMessage");
            await mod.handleReadyMessage(broker, delayedMessage);
        });

        it("should not throw when logger is undefined", () => {
            expect(broker.publish).toHaveBeenCalledTimes(1);
        });
    });

    describe("when broker.publish throws an error", () => {
        let publishError: any;

        beforeEach(() => {
            publishError = new Error("E_COLD_CALZONE");
            broker.publish.mockRejectedValueOnce(publishError);
        });

        describe("when retry count is below max retries", () => {
            let thrownError: any;

            beforeEach(async () => {
                delayedMessage.retryCount = 2;
                const mod = await import("./handleReadyMessage");
                try {
                    await mod.handleReadyMessage(broker, delayedMessage, logger);
                } catch (err) {
                    thrownError = err;
                }
            });

            it("should log an error message", () => {
                expect(logger.error).toHaveBeenCalledWith(
                    "[DelayedPublish] Failed to re-publish delayed message:",
                    publishError
                );
            });

            it("should log a warning about retrying", () => {
                expect(logger.warn).toHaveBeenCalledWith(
                    "[DelayedPublish] Retrying re-publish (attempt 3/5)"
                );
            });

            it("should not publish to retry queue when waitPublicationName is not provided", () => {
                expect(broker.publish).toHaveBeenCalledTimes(1);
            });

            it("should throw a DelayedPublishError with REPUBLISH_FAILED code", () => {
                expect(thrownError).toBeTruthy();
                expect(thrownError.name).toBe("DelayedPublishError");
                expect(thrownError).toMatchObject({
                    code: DelayedPublishErrorCode.REPUBLISH_FAILED,
                    message: "Failed to re-publish delayed message: E_COLD_CALZONE",
                    details: {
                        originalError: publishError,
                        retryCount: 2,
                        maxRetries: 5,
                        originalPublication: "user_events",
                        targetDelay: 5000,
                        createdAt: 1640995200000,
                    },
                });
            });
        });

        describe("when retry count is below max retries and waitPublicationName is provided", () => {
            beforeEach(async () => {
                delayedMessage.retryCount = 2;
                const mod = await import("./handleReadyMessage");
                try {
                    await mod.handleReadyMessage(broker, delayedMessage, logger, "wait_queue");
                } catch {
                    // Expected to throw
                }
            });

            it("should publish a retry message to the wait queue", () => {
                expect(broker.publish).toHaveBeenCalledTimes(2);
                expect(broker.publish).toHaveBeenNthCalledWith(
                    2,
                    "wait_queue",
                    {
                        ...delayedMessage,
                        retryCount: 3,
                    },
                    {
                        options: {
                            expiration: 1000,
                            persistent: true,
                        },
                    }
                );
            });
        });

        describe("when retry count equals max retries", () => {
            let thrownError: any;

            beforeEach(async () => {
                delayedMessage.retryCount = 5;
                const mod = await import("./handleReadyMessage");
                try {
                    await mod.handleReadyMessage(broker, delayedMessage, logger);
                } catch (err) {
                    thrownError = err;
                }
            });

            it("should log an error about max retries exceeded", () => {
                expect(logger.error).toHaveBeenCalledWith(
                    "[DelayedPublish] Max retries exceeded for delayed message, sending to error queue"
                );
            });

            it("should publish an error message to the error queue", () => {
                expect(broker.publish).toHaveBeenCalledTimes(2);
                expect(broker.publish).toHaveBeenNthCalledWith(
                    2,
                    "user_events_delayed_error",
                    {
                        originalMessage: delayedMessage,
                        error: "E_COLD_CALZONE",
                        errorCode: DelayedPublishErrorCode.MAX_RETRIES_EXCEEDED,
                        failedAt: expect.any(Number),
                        retryCount: 5,
                    },
                    {
                        options: {
                            persistent: true,
                        },
                    }
                );
            });

            it("should throw a DelayedPublishError with MAX_RETRIES_EXCEEDED code", () => {
                expect(thrownError).toBeTruthy();
                expect(thrownError.name).toBe("DelayedPublishError");
                expect(thrownError).toMatchObject({
                    code: DelayedPublishErrorCode.MAX_RETRIES_EXCEEDED,
                    message:
                        "Max retries exceeded for delayed message. Original error: E_COLD_CALZONE",
                    details: {
                        originalError: publishError,
                        retryCount: 5,
                        maxRetries: 5,
                        originalPublication: "user_events",
                        targetDelay: 5000,
                        createdAt: 1640995200000,
                    },
                });
            });
        });

        describe("when retry count equals max retries and error is not an Error instance", () => {
            let thrownError: any;

            beforeEach(async () => {
                delayedMessage.retryCount = 5;
                const stringError = "E_STRING_ERROR_MAX_RETRIES";
                broker.publish.mockReset();
                broker.publish.mockRejectedValueOnce(stringError);
                const mod = await import("./handleReadyMessage");
                try {
                    await mod.handleReadyMessage(broker, delayedMessage, logger);
                } catch (err) {
                    thrownError = err;
                }
            });

            it("should publish an error message to the error queue with string error", () => {
                expect(broker.publish).toHaveBeenCalledTimes(2);
                expect(broker.publish).toHaveBeenNthCalledWith(
                    2,
                    "user_events_delayed_error",
                    {
                        originalMessage: delayedMessage,
                        error: "E_STRING_ERROR_MAX_RETRIES",
                        errorCode: DelayedPublishErrorCode.MAX_RETRIES_EXCEEDED,
                        failedAt: expect.any(Number),
                        retryCount: 5,
                    },
                    {
                        options: {
                            persistent: true,
                        },
                    }
                );
            });

            it("should throw a DelayedPublishError with string error message", () => {
                expect(thrownError).toBeTruthy();
                expect(thrownError).toMatchObject({
                    code: DelayedPublishErrorCode.MAX_RETRIES_EXCEEDED,
                    message:
                        "Max retries exceeded for delayed message. Original error: E_STRING_ERROR_MAX_RETRIES",
                });
            });
        });

        describe("when error is not an Error instance", () => {
            beforeEach(async () => {
                const stringError = "E_STRING_ERROR";
                broker.publish.mockReset();
                broker.publish.mockRejectedValueOnce(stringError);
                const mod = await import("./handleReadyMessage");
                try {
                    await mod.handleReadyMessage(broker, delayedMessage, logger);
                } catch {
                    // Expected to throw
                }
            });

            it("should handle string errors correctly", () => {
                expect(logger.error).toHaveBeenCalledWith(
                    "[DelayedPublish] Failed to re-publish delayed message:",
                    "E_STRING_ERROR"
                );
            });

            it("should include string error in retry message", () => {
                expect(broker.publish).toHaveBeenCalledTimes(1);
            });
        });

        describe("when error is an Error instance", () => {
            beforeEach(async () => {
                const errorInstance = new Error("E_ERROR_INSTANCE");
                broker.publish.mockReset();
                broker.publish.mockRejectedValueOnce(errorInstance);
                const mod = await import("./handleReadyMessage");
                try {
                    await mod.handleReadyMessage(broker, delayedMessage, logger);
                } catch {
                    // Expected to throw
                }
            });

            it("should handle Error instance correctly", () => {
                expect(logger.error).toHaveBeenCalledWith(
                    "[DelayedPublish] Failed to re-publish delayed message:",
                    expect.any(Error)
                );
            });

            it("should include Error instance message in retry message", () => {
                expect(broker.publish).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe("when retry queue publish fails", () => {
        let publishError: any, retryError: any, thrownError: any;

        beforeEach(async () => {
            publishError = new Error("E_COLD_CALZONE");
            retryError = new Error("E_RETRY_QUEUE_FULL");
            broker.publish.mockReset();
            broker.publish.mockRejectedValueOnce(publishError);
            broker.publish.mockRejectedValueOnce(retryError);
            const mod = await import("./handleReadyMessage");
            try {
                await mod.handleReadyMessage(broker, delayedMessage, logger, "wait_queue");
            } catch (err) {
                thrownError = err;
            }
        });

        it("should throw the retry queue publish error", () => {
            expect(thrownError).toBeTruthy();
            expect(thrownError.message).toBe("E_RETRY_QUEUE_FULL");
        });
    });

    describe("when error queue publish fails", () => {
        let publishError: any, errorQueueError: any, thrownError: any;

        beforeEach(async () => {
            publishError = new Error("E_COLD_CALZONE");
            errorQueueError = new Error("E_ERROR_QUEUE_FULL");
            delayedMessage.retryCount = 5;
            broker.publish.mockReset();
            broker.publish.mockRejectedValueOnce(publishError);
            broker.publish.mockRejectedValueOnce(errorQueueError);
            const mod = await import("./handleReadyMessage");
            try {
                await mod.handleReadyMessage(broker, delayedMessage, logger);
            } catch (err) {
                thrownError = err;
            }
        });

        it("should throw the error queue publish error", () => {
            expect(thrownError).toBeTruthy();
            expect(thrownError.message).toBe("E_ERROR_QUEUE_FULL");
        });
    });

    describe("when error queue publish succeeds after max retries", () => {
        let publishError: any, thrownError: any;

        beforeEach(async () => {
            publishError = new Error("E_COLD_CALZONE");
            delayedMessage.retryCount = 5;
            // First publish fails, error queue publish succeeds
            broker.publish.mockRejectedValueOnce(publishError);
            broker.publish.mockResolvedValueOnce(undefined);
            const mod = await import("./handleReadyMessage");
            try {
                await mod.handleReadyMessage(broker, delayedMessage, logger);
            } catch (err) {
                thrownError = err;
            }
        });

        it("should publish to the error queue with the correct error message", () => {
            expect(broker.publish).toHaveBeenNthCalledWith(
                2,
                "user_events_delayed_error",
                expect.objectContaining({
                    originalMessage: delayedMessage,
                    error: "E_COLD_CALZONE",
                    errorCode: DelayedPublishErrorCode.MAX_RETRIES_EXCEEDED,
                    retryCount: 5,
                    failedAt: expect.any(Number),
                }),
                {
                    options: {
                        persistent: true,
                    },
                }
            );
        });

        it("should throw a DelayedPublishError with MAX_RETRIES_EXCEEDED code and correct details", () => {
            expect(thrownError).toBeTruthy();
            expect(thrownError).toMatchObject({
                code: DelayedPublishErrorCode.MAX_RETRIES_EXCEEDED,
                message: "Max retries exceeded for delayed message. Original error: E_COLD_CALZONE",
                details: {
                    originalError: publishError,
                    retryCount: 5,
                    maxRetries: 5,
                    originalPublication: "user_events",
                    targetDelay: 5000,
                    createdAt: 1640995200000,
                },
            });
        });
    });

    describe("when custom retryConfig is provided", () => {
        describe("with custom maxRetries", () => {
            let thrownError: any;

            beforeEach(async () => {
                delayedMessage.retryCount = 2;
                broker.publish.mockRejectedValueOnce(new Error("E_COLD_CALZONE"));
                const mod = await import("./handleReadyMessage");
                try {
                    await mod.handleReadyMessage(broker, delayedMessage, logger, undefined, {
                        maxRetries: 3,
                        retryDelay: 1000,
                    });
                } catch (err) {
                    thrownError = err;
                }
            });

            it("should use the custom maxRetries in the warning log", () => {
                expect(logger.warn).toHaveBeenCalledWith(
                    "[DelayedPublish] Retrying re-publish (attempt 3/3)"
                );
            });

            it("should include custom maxRetries in error details", () => {
                expect(thrownError.details.maxRetries).toBe(3);
            });
        });

        describe("with custom maxRetries triggering max retries exceeded", () => {
            let thrownError: any;

            beforeEach(async () => {
                delayedMessage.retryCount = 3;
                broker.publish.mockRejectedValueOnce(new Error("E_COLD_CALZONE"));
                broker.publish.mockResolvedValueOnce(undefined);
                const mod = await import("./handleReadyMessage");
                try {
                    await mod.handleReadyMessage(broker, delayedMessage, logger, undefined, {
                        maxRetries: 3,
                        retryDelay: 1000,
                    });
                } catch (err) {
                    thrownError = err;
                }
            });

            it("should send to error queue when custom maxRetries is exceeded", () => {
                expect(logger.error).toHaveBeenCalledWith(
                    "[DelayedPublish] Max retries exceeded for delayed message, sending to error queue"
                );
            });

            it("should include custom maxRetries in error details", () => {
                expect(thrownError.details.maxRetries).toBe(3);
            });
        });

        describe("with custom retryDelay", () => {
            beforeEach(async () => {
                delayedMessage.retryCount = 1;
                broker.publish.mockRejectedValueOnce(new Error("E_COLD_CALZONE"));
                const mod = await import("./handleReadyMessage");
                try {
                    await mod.handleReadyMessage(broker, delayedMessage, logger, "wait_queue", {
                        maxRetries: 5,
                        retryDelay: 2500,
                    });
                } catch {
                    // Expected to throw
                }
            });

            it("should use the custom retryDelay as the expiration on retry publish", () => {
                expect(broker.publish).toHaveBeenNthCalledWith(
                    2,
                    "wait_queue",
                    expect.objectContaining({ retryCount: 2 }),
                    {
                        options: {
                            expiration: 2500,
                            persistent: true,
                        },
                    }
                );
            });
        });

        describe("with persistent set to false", () => {
            beforeEach(async () => {
                delayedMessage.retryCount = 1;
                broker.publish.mockRejectedValueOnce(new Error("E_COLD_CALZONE"));
                const mod = await import("./handleReadyMessage");
                try {
                    await mod.handleReadyMessage(broker, delayedMessage, logger, "wait_queue", {
                        maxRetries: 5,
                        retryDelay: 1000,
                        persistent: false,
                    });
                } catch {
                    // Expected to throw
                }
            });

            it("should publish retry message with persistent: false", () => {
                expect(broker.publish).toHaveBeenNthCalledWith(
                    2,
                    "wait_queue",
                    expect.objectContaining({ retryCount: 2 }),
                    {
                        options: {
                            expiration: 1000,
                            persistent: false,
                        },
                    }
                );
            });
        });

        describe("with persistent set to false when max retries exceeded", () => {
            beforeEach(async () => {
                delayedMessage.retryCount = 5;
                broker.publish.mockRejectedValueOnce(new Error("E_COLD_CALZONE"));
                broker.publish.mockResolvedValueOnce(undefined);
                const mod = await import("./handleReadyMessage");
                try {
                    await mod.handleReadyMessage(broker, delayedMessage, logger, undefined, {
                        maxRetries: 5,
                        retryDelay: 1000,
                        persistent: false,
                    });
                } catch {
                    // Expected to throw
                }
            });

            it("should publish error message with persistent: false", () => {
                expect(broker.publish).toHaveBeenNthCalledWith(
                    2,
                    "user_events_delayed_error",
                    expect.objectContaining({
                        errorCode: DelayedPublishErrorCode.MAX_RETRIES_EXCEEDED,
                    }),
                    {
                        options: {
                            persistent: false,
                        },
                    }
                );
            });
        });
    });
});
