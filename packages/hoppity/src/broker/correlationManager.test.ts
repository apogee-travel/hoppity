/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import { createCorrelationManager, CorrelationManager } from "./correlationManager";

describe("hoppity > broker > correlationManager", () => {
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
                promise = manager.addRequest("corr-8675309", 5000);
                manager.resolveRequest("corr-8675309", { burgerId: "whopper-42" });
            });

            it("should resolve with the provided response", async () => {
                await expect(promise).resolves.toEqual({ burgerId: "whopper-42" });
            });
        });

        describe("when a request times out", () => {
            let promise: Promise<any>;

            beforeEach(() => {
                promise = manager.addRequest("corr-timeout", 1000);
                promise.catch(() => {}); // suppress unhandled rejection
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
                manager.addRequest("corr-resolve-known", 5000);
                result = manager.resolveRequest("corr-resolve-known", { stock: 99 });
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
                promise = manager.addRequest("corr-reject-known", 5000);
                promise.catch(() => {}); // suppress unhandled rejection
                result = manager.rejectRequest("corr-reject-known", new Error("E_SOGGY_STROMBOLI"));
            });

            it("should return true", () => {
                expect(result).toBe(true);
            });

            it("should reject the promise with the given error", async () => {
                await expect(promise).rejects.toThrow("E_SOGGY_STROMBOLI");
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
                promise = manager.addRequest("corr-cancel-known", 5000);
                promise.catch(() => {}); // suppress unhandled rejection
                result = manager.cancelRequest("corr-cancel-known");
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
                promise1 = manager.addRequest("corr-clean-1", 5000);
                promise2 = manager.addRequest("corr-clean-2", 5000);
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
                manager.cleanup();
            });

            it("should not throw", () => {
                expect(true).toBe(true);
            });
        });

        describe("when cleanup is called after all requests were already resolved", () => {
            let promise: Promise<any>;

            beforeEach(() => {
                promise = manager.addRequest("corr-resolved-then-cleanup", 5000);
                manager.resolveRequest("corr-resolved-then-cleanup", { ok: true });
                // cleanup should be a no-op — there's nothing pending to reject
                manager.cleanup();
            });

            it("should still resolve the promise", async () => {
                await expect(promise).resolves.toEqual({ ok: true });
            });
        });
    });

    describe("resolveRequest (double-resolve)", () => {
        describe("when the same correlationId is resolved twice", () => {
            let firstResult: boolean, secondResult: boolean;

            beforeEach(() => {
                manager.addRequest("corr-double-resolve", 5000);
                firstResult = manager.resolveRequest("corr-double-resolve", { first: true });
                // Second resolve on the same ID — the entry was deleted after the first, so this
                // should return false and not throw.
                secondResult = manager.resolveRequest("corr-double-resolve", { second: true });
            });

            it("should return true for the first resolve", () => {
                expect(firstResult).toBe(true);
            });

            it("should return false for the second resolve (already removed)", () => {
                expect(secondResult).toBe(false);
            });
        });
    });

    describe("rejectRequest (double-reject)", () => {
        describe("when the same correlationId is rejected twice", () => {
            let promise: Promise<any>, firstResult: boolean, secondResult: boolean;

            beforeEach(() => {
                promise = manager.addRequest("corr-double-reject", 5000);
                promise.catch(() => {});
                firstResult = manager.rejectRequest(
                    "corr-double-reject",
                    new Error("E_DOUBLE_ESPRESSO_SHOT")
                );
                secondResult = manager.rejectRequest(
                    "corr-double-reject",
                    new Error("should not matter")
                );
            });

            it("should return true for the first reject", () => {
                expect(firstResult).toBe(true);
            });

            it("should return false for the second reject", () => {
                expect(secondResult).toBe(false);
            });
        });
    });

    describe("timeout cleanup", () => {
        describe("when a request times out and is then resolved", () => {
            let timeoutPromise: Promise<any>, resolveResult: boolean;

            beforeEach(() => {
                timeoutPromise = manager.addRequest("corr-timeout-then-resolve", 500);
                timeoutPromise.catch(() => {});
                jest.advanceTimersByTime(501);
                // After timeout, the entry is removed — resolving should return false
                resolveResult = manager.resolveRequest("corr-timeout-then-resolve", {
                    too: "late",
                });
            });

            it("should reject with timeout error", async () => {
                await expect(timeoutPromise).rejects.toThrow("RPC request timed out after 500ms");
            });

            it("should return false when resolving an already-timed-out request", () => {
                expect(resolveResult).toBe(false);
            });
        });
    });
});
