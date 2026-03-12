/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Manages correlation IDs for RPC requests and their associated pending promises.
 *
 * A fresh instance is created per ServiceBuilder invocation, so each service
 * instance gets isolated state.
 */

export interface CorrelationManager {
    addRequest(correlationId: string, timeout: number): Promise<any>;
    resolveRequest(correlationId: string, response: any): boolean;
    rejectRequest(correlationId: string, error: any): boolean;
    cancelRequest(correlationId: string): boolean;
    cleanup(): void;
}

export function createCorrelationManager(): CorrelationManager {
    const pendingRequests = new Map<
        string,
        {
            resolve: (value: any) => void;
            reject: (error: any) => void;
            timeout: NodeJS.Timeout;
        }
    >();

    return {
        /**
         * Registers a pending RPC request. Returns a promise that resolves when
         * the corresponding response arrives, or rejects on timeout.
         */
        addRequest(correlationId: string, timeout: number): Promise<any> {
            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    pendingRequests.delete(correlationId);
                    reject(new Error(`RPC request timed out after ${timeout}ms`));
                }, timeout);

                pendingRequests.set(correlationId, { resolve, reject, timeout: timeoutId });
            });
        },

        resolveRequest(correlationId: string, response: any): boolean {
            const pending = pendingRequests.get(correlationId);
            if (!pending) return false;

            clearTimeout(pending.timeout);
            pendingRequests.delete(correlationId);
            pending.resolve(response);
            return true;
        },

        rejectRequest(correlationId: string, error: any): boolean {
            const pending = pendingRequests.get(correlationId);
            if (!pending) return false;

            clearTimeout(pending.timeout);
            pendingRequests.delete(correlationId);
            pending.reject(error);
            return true;
        },

        cancelRequest(correlationId: string): boolean {
            const pending = pendingRequests.get(correlationId);
            if (!pending) return false;

            clearTimeout(pending.timeout);
            pendingRequests.delete(correlationId);
            pending.reject(new Error("RPC request cancelled"));
            return true;
        },

        /**
         * Rejects all pending requests. Called during broker shutdown to prevent
         * callers from hanging indefinitely.
         */
        cleanup(): void {
            for (const [_id, pending] of pendingRequests) {
                clearTimeout(pending.timeout);
                pending.reject(new Error("RPC manager cleanup"));
            }
            pendingRequests.clear();
        },
    };
}
