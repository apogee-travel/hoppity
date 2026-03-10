/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import { createCorrelationManager, CorrelationManager } from "./correlationManager";

describe("hoppity-operations > src > correlationManager", () => {
    let manager: CorrelationManager;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        jest.useFakeTimers();
        manager = createCorrelationManager();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe("createCorrelationManager", () => {
        it("should return a manager with the expected methods", () => {
            expect(typeof manager.addRequest).toBe("function");
            expect(typeof manager.resolveRequest).toBe("function");
            expect(typeof manager.rejectRequest).toBe("function");
            expect(typeof manager.cancelRequest).toBe("function");
            expect(typeof manager.cleanup).toBe("function");
        });

        it("should return a fresh instance on each call (no singleton)", () => {
            const manager2 = createCorrelationManager();
            expect(manager2).not.toBe(manager);
        });
    });

    describe("addRequest", () => {
        describe("when a request is added and then resolved", () => {
            let promise: Promise<any>;

            beforeEach(() => {
                promise = manager.addRequest("corr-001", 5000);
                manager.resolveRequest("corr-001", { price: 42 });
            });

            it("should resolve with the provided response", async () => {
                await expect(promise).resolves.toEqual({ price: 42 });
            });
        });

        describe("when a request times out", () => {
            let promise: Promise<any>;

            beforeEach(() => {
                promise = manager.addRequest("corr-002", 1000);
                jest.advanceTimersByTime(1001);
            });

            it("should reject with a timeout error", async () => {
                await expect(promise).rejects.toThrow("RPC request timed out after 1000ms");
            });
        });
    });

    describe("resolveRequest", () => {
        describe("when resolving a known correlationId", () => {
            let result: boolean;

            beforeEach(() => {
                manager.addRequest("corr-003", 5000);
                result = manager.resolveRequest("corr-003", { available: true });
            });

            it("should return true", () => {
                expect(result).toBe(true);
            });
        });

        describe("when resolving an unknown correlationId", () => {
            let result: boolean;

            beforeEach(() => {
                result = manager.resolveRequest("corr-unknown", "anything");
            });

            it("should return false", () => {
                expect(result).toBe(false);
            });
        });
    });

    describe("rejectRequest", () => {
        describe("when rejecting a known correlationId", () => {
            let result: boolean, promise: Promise<any>;

            beforeEach(() => {
                promise = manager.addRequest("corr-004", 5000);
                // Suppress unhandled rejection — the test asserts on it below
                promise.catch(() => {});
                result = manager.rejectRequest("corr-004", new Error("E_COLD_CALZONE"));
            });

            it("should return true", () => {
                expect(result).toBe(true);
            });

            it("should reject the promise with the given error", async () => {
                await expect(promise).rejects.toThrow("E_COLD_CALZONE");
            });
        });

        describe("when rejecting an unknown correlationId", () => {
            let result: boolean;

            beforeEach(() => {
                result = manager.rejectRequest("corr-unknown", new Error("nope"));
            });

            it("should return false", () => {
                expect(result).toBe(false);
            });
        });
    });

    describe("cancelRequest", () => {
        describe("when cancelling a known correlationId", () => {
            let result: boolean, promise: Promise<any>;

            beforeEach(() => {
                promise = manager.addRequest("corr-005", 5000);
                // Suppress unhandled rejection — the test asserts on it below
                promise.catch(() => {});
                result = manager.cancelRequest("corr-005");
            });

            it("should return true", () => {
                expect(result).toBe(true);
            });

            it("should reject the promise with a cancellation error", async () => {
                await expect(promise).rejects.toThrow("RPC request cancelled");
            });
        });

        describe("when cancelling an unknown correlationId", () => {
            let result: boolean;

            beforeEach(() => {
                result = manager.cancelRequest("corr-unknown");
            });

            it("should return false", () => {
                expect(result).toBe(false);
            });
        });
    });

    describe("cleanup", () => {
        describe("when there are pending requests", () => {
            let promise1: Promise<any>, promise2: Promise<any>;

            beforeEach(() => {
                promise1 = manager.addRequest("corr-006", 5000);
                promise2 = manager.addRequest("corr-007", 5000);
                // Suppress unhandled rejections — the tests assert on them below
                promise1.catch(() => {});
                promise2.catch(() => {});
                manager.cleanup();
            });

            it("should reject the first pending promise", async () => {
                await expect(promise1).rejects.toThrow("RPC manager cleanup");
            });

            it("should reject the second pending promise", async () => {
                await expect(promise2).rejects.toThrow("RPC manager cleanup");
            });
        });

        describe("when there are no pending requests", () => {
            beforeEach(() => {
                // no-op — just verifying cleanup doesn't throw on empty state
                manager.cleanup();
            });

            it("should not throw", () => {
                // reaching this line is the assertion
                expect(true).toBe(true);
            });
        });
    });
});
