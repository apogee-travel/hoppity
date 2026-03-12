import { Logger } from "@apogeelabs/hoppity";

const PREFIX = "[runner]";

/**
 * Tagged logger for the runner process. Passed via `logger` in ServiceConfig so
 * all hoppity pipeline logging and middleware route output through this instance.
 * Prefixed with `[runner]` to distinguish from the child-service output.
 */
export const logger: Logger = {
    silly: (message: string, ...args: unknown[]) =>
        console.debug(`[SILLY] ${PREFIX} ${message}`, ...args),
    debug: (message: string, ...args: unknown[]) =>
        console.debug(`[DEBUG] ${PREFIX} ${message}`, ...args),
    info: (message: string, ...args: unknown[]) =>
        console.info(`[INFO] ${PREFIX} ${message}`, ...args),
    warn: (message: string, ...args: unknown[]) =>
        console.warn(`[WARN] ${PREFIX} ${message}`, ...args),
    error: (message: string, ...args: unknown[]) =>
        console.error(`[ERROR] ${PREFIX} ${message}`, ...args),
    critical: (message: string, ...args: unknown[]) =>
        console.error(`[CRITICAL] ${PREFIX} ${message}`, ...args),
};
