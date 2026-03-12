import { Logger } from "@apogeelabs/hoppity";

/**
 * Simple structured logger implementing the hoppity Logger interface.
 *
 * Hoppity's `Logger` interface requires six log levels: silly, debug, info,
 * warn, error, and critical. This implementation prefixes each line with the
 * level name for readability in the console.
 *
 * In a real app, you'd swap this for Winston, Pino, etc. — anything that
 * satisfies the `Logger` interface works. Pass your logger via the `logger`
 * property in `ServiceConfig` and hoppity's internal pipeline logging
 * (plus any middleware that uses `context.logger`) will go through it.
 */
export const logger: Logger = {
    silly: (message: string, ...args: unknown[]) => console.debug(`[SILLY] ${message}`, ...args),
    debug: (message: string, ...args: unknown[]) => console.debug(`[DEBUG] ${message}`, ...args),
    info: (message: string, ...args: unknown[]) => console.info(`[INFO] ${message}`, ...args),
    warn: (message: string, ...args: unknown[]) => console.warn(`[WARN] ${message}`, ...args),
    error: (message: string, ...args: unknown[]) => console.error(`[ERROR] ${message}`, ...args),
    critical: (message: string, ...args: unknown[]) =>
        console.error(`[CRITICAL] ${message}`, ...args),
};
