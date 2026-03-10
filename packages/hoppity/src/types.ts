/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerAsPromised, BrokerConfig } from "rascal";

/**
 * Main interface for the Rascal wrapper that provides the entry point to the middleware pipeline.
 *
 * This wrapper provides two main entry points:
 * 1. `withTopology()` - Start with an existing topology configuration
 * 2. `use()` - Start with an empty topology and add middleware
 *
 * @interface RascalWrapper
 */
export interface Hoppity {
    /**
     * Creates a builder instance with an initial topology configuration.
     *
     * @param {BrokerConfig} topology - Initial topology configuration
     * @returns {BuilderInterface} - Builder instance for chaining middleware
     */
    withTopology(topology: BrokerConfig): BuilderInterface;

    /**
     * Creates a builder instance with an empty topology and adds the first middleware.
     *
     * @param {MiddlewareFunction} middleware - The first middleware to add
     * @returns {BuilderInterface} - Builder instance for chaining additional middleware
     */
    use(middleware: MiddlewareFunction): BuilderInterface;
}

/**
 * Logger interface that provides standard logging methods.
 * This allows for flexible logging implementations while maintaining a consistent API.
 *
 * @interface Logger
 */
export interface Logger {
    /**
     * Log a silly message
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    silly(message: string, ...args: any[]): void;

    /**
     * Log a debug message
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    debug(message: string, ...args: any[]): void;

    /**
     * Log an info message
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    info(message: string, ...args: any[]): void;

    /**
     * Log a warning message
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    warn(message: string, ...args: any[]): void;

    /**
     * Log an error message
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    error(message: string, ...args: any[]): void;

    /**
     * Log a critical error message
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    critical(message: string, ...args: any[]): void;
}

/**
 * Context object passed to middleware functions for sharing state.
 * This allows middleware to communicate and share information with downstream middleware.
 *
 * @interface MiddlewareContext
 * @property {Record<string, any>} data - Arbitrary data that can be set and read by middleware
 * @property {string[]} middlewareNames - Names of middleware that have already executed
 * @property {Logger} logger - Logger instance for middleware to use
 */
export interface MiddlewareContext {
    data: Record<string, any>;
    middlewareNames: string[];
    logger: Logger;
}

/**
 * Internal execution log entry for debugging middleware pipeline execution.
 *
 * @interface MiddlewareExecution
 * @property {string} middleware - Name or identifier of the middleware
 * @property {boolean} hasModifiedTopology - Whether the topology was modified by the middleware
 * @property {boolean} hasCallback - Whether this middleware provided a callback
 */
export interface MiddlewareExecution {
    middleware: string;
    hasModifiedTopology: boolean;
    hasCallback: boolean;
}

/**
 * Callback function that is executed after the broker is created.
 * Allows middleware to perform post-creation setup like subscribing to queues,
 * setting up event handlers, or performing other broker-dependent operations.
 *
 * @callback BrokerCreatedCallback
 * @param {BrokerAsPromised} broker - The created Rascal broker instance
 * @returns {void | Promise<void>} - Can be synchronous or asynchronous
 */
export type BrokerCreatedCallback = (broker: BrokerAsPromised) => void | Promise<void>;

/**
 * Result object returned by middleware functions.
 * Contains the modified topology and optional callback for post-broker-creation actions.
 *
 * @interface MiddlewareResult
 * @property {Topology} topology - The modified topology configuration
 * @property {BrokerCreatedCallback} [onBrokerCreated] - Optional callback to execute after broker creation
 */
export interface MiddlewareResult {
    topology: BrokerConfig;
    onBrokerCreated?: BrokerCreatedCallback;
}

/**
 * Middleware function that can modify the topology and optionally provide a callback.
 * Middleware functions are executed in the order they are added to the pipeline.
 * Each middleware receives the current topology and a context object for sharing state.
 *
 * @typedef {function} MiddlewareFunction
 * @param {BrokerConfig} topology - The current topology configuration
 * @param {MiddlewareContext} context - Context object for sharing state between middleware
 * @returns {MiddlewareResult} - The modified topology and optional callback
 *
 * @example
 * ```typescript
 * // First middleware: sets up exchanges and shares info via context
 * const exchangeSetupMiddleware: MiddlewareFunction = (topology, context) => {
 *   // Modify topology to add exchanges
 *   const modifiedTopology = { ...topology };
 *   // ... add exchanges ...
 *
 *   // Share exchange names with downstream middleware
 *   context.data.exchangeNames = ['user-events', 'order-events'];
 *   context.data.serviceName = 'user-service';
 *
 *   return { topology: modifiedTopology };
 * };
 *
 * // Second middleware: uses context from previous middleware
 * const queueSetupMiddleware: MiddlewareFunction = (topology, context) => {
 *   // Access data from previous middleware
 *   const exchangeNames = context.data.exchangeNames || [];
 *   const serviceName = context.data.serviceName;
 *
 *   // Check if required middleware has run
 *   if (!context.middlewareNames.includes('exchangeSetupMiddleware')) {
 *     throw new Error('exchangeSetupMiddleware must run before queueSetupMiddleware');
 *   }
 *
 *   // Use the shared data to set up queues
 *   const modifiedTopology = { ...topology };
 *   // ... set up queues bound to the exchanges ...
 *
 *   return { topology: modifiedTopology };
 * };
 * ```
 */
export type MiddlewareFunction = (
    topology: BrokerConfig,
    context: MiddlewareContext
) => MiddlewareResult;

/**
 * Interface for the builder pattern that allows chaining middleware.
 * Provides a fluent API for configuring the Rascal broker with middleware pipeline.
 *
 * @interface BuilderInterface
 */
export interface BuilderInterface {
    /**
     * Adds middleware to the pipeline.
     * @param {MiddlewareFunction} middleware - The middleware function to add
     * @returns {BuilderInterface} - Returns self for method chaining
     */
    use(middleware: MiddlewareFunction): BuilderInterface;

    /**
     * Creates the Rascal broker with the configured topology and executes all middleware callbacks.
     * @returns {Promise<BrokerAsPromised>} - The configured Rascal broker instance
     */
    build(): Promise<BrokerAsPromised>;
}

/**
 * Utility type for combining a Rascal broker with extension methods added by middleware.
 * Middleware like `hoppity-rpc` and `hoppity-delayed-publish` monkey-patch extra methods
 * onto the broker in their `onBrokerCreated` callbacks. This type makes those extensions
 * type-safe by intersecting the base `BrokerAsPromised` with each extension record.
 *
 * @typeParam T - Tuple of extension record types (e.g., `[RpcBrokerExtensions, DelayedPublishExtensions]`)
 *
 * @example
 * ```typescript
 * type MyBroker = BrokerWithExtensions<[{ rpcCall: (msg: any) => Promise<any> }]>;
 * // Result: BrokerAsPromised & { rpcCall: (msg: any) => Promise<any> }
 * ```
 */
export type BrokerWithExtensions<T extends Record<string, any>[]> = BrokerAsPromised &
    UnionToIntersection<T[number]>;

/**
 * Converts a union type to an intersection type.
 * Used internally by {@link BrokerWithExtensions} to merge multiple extension records.
 * The contravariant trick: wrapping each union member in a function parameter position
 * forces TypeScript to infer the intersection when resolving the conditional type.
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
    ? I
    : never;
