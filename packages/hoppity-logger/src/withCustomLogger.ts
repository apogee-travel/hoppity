import { BrokerConfig } from "rascal";
import { Logger, MiddlewareFunction, MiddlewareResult } from "@apogeelabs/hoppity";

/**
 * Configuration options for the {@link withCustomLogger} middleware.
 */
export interface WithCustomLoggerOptions {
    /**
     * The logger instance to inject into the middleware pipeline context.
     * Must implement all six methods of the {@link Logger} interface.
     * Most popular loggers (Winston, Pino, Bunyan) need a thin wrapper
     * since they typically lack `silly` and/or `critical` methods.
     */
    logger: Logger;
}

/**
 * Middleware that sets a custom logger on the context.
 * This allows downstream middleware to use the provided logger instead of the default console logger.
 *
 * @param {WithCustomLoggerOptions} options - Configuration options including the custom logger
 * @returns {MiddlewareFunction} - Middleware function that sets the custom logger
 *
 * @example
 * ```typescript
 * import winston from 'winston';
 * import { withCustomLogger } from '@apogeelabs/hoppity-logger';
 *
 * const logger = winston.createLogger({
 *   level: 'info',
 *   format: winston.format.json(),
 *   transports: [new winston.transports.Console()]
 * });
 *
 * const broker = await hoppity
 *   .use(withCustomLogger({ logger }))
 *   .use(myOtherMiddleware)
 *   .build();
 * ```
 */
export function withCustomLogger(options: WithCustomLoggerOptions): MiddlewareFunction {
    return (topology: BrokerConfig, context): MiddlewareResult => {
        // Direct assignment (not merged) because the Logger interface IS the full contract —
        // there's no partial logger concept. You either replace the whole thing or you don't.
        context.logger = options.logger;

        // Topology passes through untouched — this middleware is purely a context mutation.
        // No onBrokerCreated callback needed since there's no broker-level setup to perform.
        return { topology };
    };
}
