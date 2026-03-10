/**
 * @module @apogeelabs/hoppity
 *
 * Core middleware pipeline and builder for composing RabbitMQ broker topologies on Rascal.
 * Provides the `hoppity` entry point, all pipeline types, and the default {@link ConsoleLogger}.
 *
 * @example
 * ```typescript
 * import hoppity from "@apogeelabs/hoppity";
 *
 * const broker = await hoppity
 *     .withTopology(topology)
 *     .use(myMiddleware)
 *     .build();
 * ```
 */
import hoppity from "./hoppity";
import {
    BrokerCreatedCallback,
    BuilderInterface,
    Hoppity,
    MiddlewareFunction,
    MiddlewareResult,
    MiddlewareContext,
    BrokerWithExtensions,
    Logger,
} from "./types";
import { ConsoleLogger, defaultLogger } from "./consoleLogger";

export default hoppity;

export type {
    BrokerCreatedCallback,
    BuilderInterface,
    Hoppity,
    MiddlewareFunction,
    MiddlewareResult,
    MiddlewareContext,
    BrokerWithExtensions,
    Logger,
};

export { ConsoleLogger, defaultLogger };
