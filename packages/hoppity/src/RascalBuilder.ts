/* eslint-disable @typescript-eslint/no-explicit-any */
import isEqual from "fast-deep-equal";
import { BrokerAsPromised, type BrokerConfig } from "rascal";
import { defaultLogger } from "./consoleLogger";
import type {
    BrokerCreatedCallback,
    BuilderInterface,
    MiddlewareContext,
    MiddlewareExecution,
    MiddlewareFunction,
} from "./types";

/**
 * Main builder class that implements the middleware pipeline pattern for Rascal broker creation.
 *
 * This class allows you to:
 * 1. Start with an initial topology configuration
 * 2. Apply middleware functions that can modify the topology
 * 3. Create the broker with the final topology
 * 4. Execute post-creation callbacks from middleware (broker instance is passed to the callback)
 *
 * The pipeline ensures that topology modifications happen before broker creation,
 * and callbacks execute after the broker is available, enabling complex setup scenarios.
 *
 * @class RascalBuilder
 * @implements {BuilderInterface}
 */
export class RascalBuilder implements BuilderInterface {
    /** @private The current topology configuration */
    private topology: BrokerConfig;

    /** @private Array of middleware functions to execute */
    private middlewareFunctions: MiddlewareFunction[] = [];

    /** @private Array of callbacks to execute after broker creation */
    private middlewareCallbacks: BrokerCreatedCallback[] = [];

    /** @private Execution log for debugging middleware pipeline */
    private executionLog: MiddlewareExecution[] = [];

    /** @private Context object for sharing state between middleware */
    private context: MiddlewareContext = {
        data: {},
        middlewareNames: [],
        logger: defaultLogger,
    };

    /**
     * Creates a new RascalBuilder instance.
     *
     * @param {BrokerConfig} [initialTopology={}] - Initial topology configuration. Deep cloned to prevent mutations.
     */
    constructor(initialTopology: BrokerConfig = {}) {
        // Deep clone at construction so the caller's original config is never mutated.
        // This is the single defensive copy — middleware receives this clone and returns
        // modified versions, keeping the pipeline functionally pure from the outside.
        this.topology = structuredClone(initialTopology);
    }

    /**
     * Adds middleware to the pipeline.
     *
     * @param {MiddlewareFunction} middleware - The middleware function to add to the pipeline
     * @returns {BuilderInterface} - Returns self for method chaining
     */
    use(middleware: MiddlewareFunction): BuilderInterface {
        this.middlewareFunctions.push(middleware);
        return this;
    }

    /**
     * Creates the Rascal broker and executes the middleware pipeline.
     *
     * This method performs three main phases:
     * 1. Executes all middleware functions sequentially to modify the topology
     * 2. Creates the broker with the final topology (after all middleware modifications)
     * 3. Executes all onBrokerCreated callbacks sequentially with fail-fast behavior
     *
     * @returns {Promise<BrokerAsPromised>} - The configured Rascal broker instance
     * @throws {Error} - Enhanced error with pipeline context if broker creation fails
     */
    async build(): Promise<BrokerAsPromised> {
        try {
            // Phase 1: Execute middleware pipeline to modify topology
            await this.executeMiddlewarePipeline();

            // Phase 2: Create broker with final topology
            const broker = await BrokerAsPromised.create(this.topology);

            // Phase 3: Execute onBrokerCreated callbacks sequentially (fail-fast)
            // If callbacks fail, shut down the broker to avoid leaking connections.
            // Callbacks run after the broker is live — if one fails, we MUST shut down
            // the broker to avoid leaking AMQP connections and channels. Fail-fast:
            // first failure aborts remaining callbacks.
            try {
                await this.executeCallbacks(broker);
            } catch (callbackError) {
                await broker.shutdown();
                throw callbackError;
            }

            return broker;
        } catch (error) {
            // Enhance error with pipeline context
            const enhancedError = new Error(
                `Broker creation failed. Pipeline executed ${this.executionLog.length} middleware(s). ` +
                    `Original error: ${error instanceof Error ? error.message : String(error)}`
            );
            enhancedError.cause = error;
            throw enhancedError;
        }
    }

    /**
     * Executes all middleware functions sequentially to modify the topology.
     *
     * Each middleware receives the topology as modified by previous middleware.
     * If any middleware fails, the pipeline fails immediately.
     *
     * @private
     * @returns {Promise<void>}
     * @throws {Error} - Enhanced error if any middleware fails
     */
    private async executeMiddlewarePipeline(): Promise<void> {
        for (let i = 0; i < this.middlewareFunctions.length; i++) {
            const middleware = this.middlewareFunctions[i];
            const middlewareName = middleware.name || `middleware_${i}`;

            try {
                // Update context with current middleware name
                this.context.middlewareNames.push(middlewareName);

                // Execute middleware with current topology and context
                const result = middleware(this.topology, this.context);

                // fast-deep-equal comparison: detect whether the middleware actually changed
                // the topology, vs just passing it through. Used for execution logging only —
                // the returned topology is always adopted regardless.
                const hasModifiedTopology = !isEqual(this.topology, result.topology);

                // Update topology with middleware result
                this.topology = result.topology;

                // Collect callback if provided
                if (result.onBrokerCreated) {
                    this.middlewareCallbacks.push(result.onBrokerCreated);
                }

                // Log execution
                this.executionLog.push({
                    middleware: middlewareName,
                    hasModifiedTopology,
                    hasCallback: !!result.onBrokerCreated,
                });
            } catch (error) {
                const middlewareError = new Error(
                    `Middleware ${i + 1} (${middlewareName}) failed: ${error instanceof Error ? error.message : String(error)}`
                );
                middlewareError.cause = error;
                throw middlewareError;
            }
        }
    }

    /**
     * Executes all middleware callbacks sequentially with fail-fast behavior.
     *
     * If any callback fails, the error is enhanced with context and the pipeline fails.
     * This ensures that all setup operations complete successfully before the broker is considered ready.
     *
     * @private
     * @param {BrokerAsPromised} broker - The created broker instance
     * @returns {Promise<void>}
     * @throws {Error} - Enhanced error if any callback fails
     */
    private async executeCallbacks(broker: BrokerAsPromised): Promise<void> {
        if (this.middlewareCallbacks.length === 0) {
            return;
        }

        // Execute callbacks sequentially with fail-fast behavior
        for (let i = 0; i < this.middlewareCallbacks.length; i++) {
            try {
                await this.middlewareCallbacks[i](broker);
            } catch (error) {
                const callbackError = new Error(
                    `Middleware callback ${i + 1} failed: ${error instanceof Error ? error.message : String(error)}`
                );
                callbackError.cause = error;
                throw callbackError;
            }
        }
    }
}
