/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "crypto";
import isEqual from "fast-deep-equal";
import { BrokerAsPromised, BrokerConfig } from "rascal";
import { defaultLogger } from "./consoleLogger";
import { EventContract, CommandContract, RpcContract } from "./contracts/types";
import { HandlerDeclaration } from "./handlers/types";
import { deriveTopology, ConnectionConfig } from "./topology/derive";
import { mergeTopology } from "./topology/merge";
import { wireHandlers } from "./broker/wireHandlers";
import { wireOutbound } from "./broker/wireOutbound";
import { wireRpcHandlers, wireRpcOutbound } from "./broker/rpc";
import { wireDelayedDelivery, DelayedDeliveryConfig } from "./broker/delayedDelivery";
import { createCorrelationManager } from "./broker/correlationManager";
import { ServiceBroker } from "./broker/types";
import { Interceptor } from "./interceptors/types";
import type {
    BrokerCreatedCallback,
    Logger,
    MiddlewareContext,
    MiddlewareExecution,
    MiddlewareFunction,
} from "./types";

/**
 * Configuration for a service created via hoppity.service().
 */
export interface ServiceConfig {
    /** Connection settings for the RabbitMQ broker */
    connection: ConnectionConfig;
    /** Handler declarations (onEvent, onCommand, onRpc) */
    handlers?: HandlerDeclaration[];
    /** Outbound contract declarations (events, commands, RPC calls to send) */
    publishes?: (EventContract | CommandContract | RpcContract)[];
    /** Optional raw Rascal BrokerConfig — merged as the base before derived topology layers on top */
    topology?: BrokerConfig;
    /** Unique instance identifier — auto-generated (UUID) if not provided */
    instanceId?: string;
    /** Default RPC timeout in ms (defaults to 30_000) */
    defaultTimeout?: number;
    /** Validate inbound payloads against contract schemas (defaults to true) */
    validateInbound?: boolean;
    /** Validate outbound payloads against contract schemas (defaults to false) */
    validateOutbound?: boolean;
    /**
     * Interceptors applied to all handler and publish operations.
     * Each interceptor can declare inbound (handler wrapping), outbound (publish wrapping), or both.
     * Applied in declaration order — first interceptor is outermost wrapper.
     */
    interceptors?: Interceptor[];
    /**
     * Configuration for the delayed delivery engine.
     * Only relevant when any declared contracts use `delay` support.
     */
    delayedDelivery?: DelayedDeliveryConfig;
    /**
     * Custom logger instance. When provided, replaces the default ConsoleLogger for all
     * build pipeline logging, handler wiring, and outbound method logging. Providing the
     * logger here ensures it is active before any middleware runs — no ordering footgun.
     */
    logger?: Logger;
}

/**
 * The contract-driven service builder.
 *
 * Built by hoppity.service(), supports .use(middleware) chaining and
 * .build() to produce a wired ServiceBroker.
 *
 * Build phases when .build() is called:
 * 1. Derive topology from handlers + publishes
 * 2. Merge with optional raw topology (raw is base, derived layers on top)
 * 3. Run middleware pipeline (they see the complete topology)
 * 4. Create Rascal broker via BrokerAsPromised.create()
 * 5. Wire event/command/rpc handlers (subscribe to queues, wrap with interceptors)
 * 6. Wire outbound methods (publishEvent, sendCommand, request, cancelRequest — wrap with interceptors)
 * 7. Run middleware onBrokerCreated callbacks (they see the fully-wired broker)
 */
export class ServiceBuilder {
    private readonly serviceName: string;
    private readonly config: ServiceConfig;
    private readonly instanceId: string;

    private middlewareFunctions: MiddlewareFunction[] = [];
    private middlewareCallbacks: BrokerCreatedCallback[] = [];
    private executionLog: MiddlewareExecution[] = [];

    private context: MiddlewareContext;

    constructor(serviceName: string, config: ServiceConfig) {
        this.serviceName = serviceName;
        this.config = config;
        // Auto-generate instance ID if not provided
        this.instanceId = config.instanceId ?? randomUUID();
        this.context = {
            data: {},
            middlewareNames: [],
            // config.logger takes precedence — it's available before any middleware runs,
            // so downstream middleware and handler wiring always log through the custom logger.
            logger: config.logger ?? defaultLogger,
            serviceName,
        };
    }

    /**
     * Adds middleware to the pipeline.
     */
    use(middleware: MiddlewareFunction): ServiceBuilder {
        this.middlewareFunctions.push(middleware);
        return this;
    }

    /**
     * Builds the service broker by executing all phases in order.
     */
    async build(): Promise<ServiceBroker> {
        try {
            const {
                connection,
                handlers = [],
                publishes = [],
                topology: rawTopology,
                defaultTimeout = 30_000,
                validateInbound = true,
                validateOutbound = false,
                interceptors = [],
                delayedDelivery: delayedDeliveryConfig = {},
            } = this.config;

            // Validate interceptors early — a missing name is a misconfiguration that
            // surfaces at build time rather than silently failing during message processing.
            this.validateInterceptors(interceptors);

            if (interceptors.length > 0) {
                this.context.logger.info(
                    `[Hoppity] Service '${this.serviceName}' registered interceptors: ${interceptors.map(i => i.name).join(", ")}`
                );
            }

            // Phase 1 + 2: Derive topology from contracts, then merge with optional raw topology
            const derived = deriveTopology(
                this.serviceName,
                handlers,
                publishes,
                connection,
                this.instanceId
            );
            let currentTopology = mergeTopology(rawTopology, derived);

            // Phase 3: Run middleware pipeline — they see the complete derived topology
            currentTopology = await this.executeMiddlewarePipeline(currentTopology);

            // Phase 4: Create the Rascal broker
            const broker = await BrokerAsPromised.create(currentTopology);

            // Phase 5 + 6: Wire handlers and outbound methods
            // Must happen before middleware onBrokerCreated callbacks so the broker
            // is fully operational when those callbacks fire.
            try {
                await wireHandlers(broker, handlers, this.context, {
                    validateInbound,
                    interceptors,
                });
                wireOutbound(broker, {
                    validateOutbound,
                    interceptors,
                    serviceName: this.serviceName,
                });

                // Collect all delay-capable contracts from handlers and publishes.
                // Handlers drive queue/subscription creation; publishes drive wait publications.
                // We need the handler contracts for wireDelayedDelivery because that's where
                // the ready queue subscriptions live.
                const delayHandlerContracts = handlers
                    .filter(h => h._kind !== "rpc" && h.contract.delay !== undefined)
                    .map(h => h.contract as EventContract | CommandContract);

                if (delayHandlerContracts.length > 0) {
                    await wireDelayedDelivery(
                        broker,
                        delayHandlerContracts,
                        this.context,
                        delayedDeliveryConfig
                    );
                }

                const hasRpcHandlers = handlers.some(h => h._kind === "rpc");
                const hasRpcCallers = publishes.some(p => p._type === "rpc");

                if (hasRpcHandlers || hasRpcCallers) {
                    const replyQueueName = `${this.serviceName}_${this.instanceId}_reply`;
                    const correlationManager = createCorrelationManager();

                    await wireRpcHandlers(broker, handlers, this.context, {
                        validateInbound,
                        interceptors,
                    });
                    await wireRpcOutbound(broker, {
                        serviceName: this.serviceName,
                        instanceId: this.instanceId,
                        replyQueueName,
                        correlationManager,
                        defaultTimeout,
                        validateInbound,
                        validateOutbound,
                        logger: this.context.logger,
                        interceptors,
                    });
                }

                // Phase 7: Middleware onBrokerCreated callbacks
                await this.executeCallbacks(broker);
            } catch (callbackError) {
                await broker.shutdown();
                throw callbackError;
            }

            return broker as ServiceBroker;
        } catch (error) {
            const enhancedError = new Error(
                `Service '${this.serviceName}' broker creation failed. Pipeline executed ${this.executionLog.length} middleware(s). ` +
                    `Original error: ${error instanceof Error ? error.message : String(error)}`
            );
            enhancedError.cause = error;
            throw enhancedError;
        }
    }

    /**
     * Validates interceptor configuration. Throws early if any interceptor lacks a name,
     * surfacing misconfiguration at build time rather than silently during message processing.
     */
    private validateInterceptors(interceptors: Interceptor[]): void {
        for (let i = 0; i < interceptors.length; i++) {
            const interceptor = interceptors[i];
            if (!interceptor.name || interceptor.name.trim() === "") {
                throw new Error(
                    `Interceptor at index ${i} is missing a name. All interceptors must have a non-empty name.`
                );
            }
        }
    }

    private async executeMiddlewarePipeline(topology: BrokerConfig): Promise<BrokerConfig> {
        let current = topology;

        for (let i = 0; i < this.middlewareFunctions.length; i++) {
            const middleware = this.middlewareFunctions[i];
            const middlewareName = middleware.name || `middleware_${i}`;

            try {
                this.context.middlewareNames.push(middlewareName);

                const result = middleware(current, this.context);

                const hasModifiedTopology = !isEqual(current, result.topology);
                current = result.topology;

                if (result.onBrokerCreated) {
                    this.middlewareCallbacks.push(result.onBrokerCreated);
                }

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

        return current;
    }

    private async executeCallbacks(broker: BrokerAsPromised): Promise<void> {
        if (this.middlewareCallbacks.length === 0) {
            return;
        }

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
