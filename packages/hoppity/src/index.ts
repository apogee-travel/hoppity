/**
 * @module @apogeelabs/hoppity
 *
 * Contract-driven RabbitMQ topology builder for Node.js microservices, built on Rascal.
 * Provides the `hoppity` entry point, contract definitions, handler declarations,
 * all pipeline types, and the default {@link ConsoleLogger}.
 *
 * @example
 * ```typescript
 * import hoppity, { defineDomain, onEvent, onCommand, onRpc } from "@apogeelabs/hoppity";
 *
 * const OrdersDomain = defineDomain("orders", {
 *     events: { orderCreated: z.object({ orderId: z.string() }) },
 * });
 *
 * const broker = await hoppity
 *     .service("order-service", {
 *         connection: { url: "amqp://localhost" },
 *         handlers: [onEvent(OrdersDomain.events.orderCreated, handler)],
 *         publishes: [OrdersDomain.events.orderCreated],
 *     })
 *     .build();
 * ```
 */
import hoppity from "./hoppity";
export default hoppity;

// Core middleware pipeline types
export type {
    BrokerCreatedCallback,
    Hoppity,
    MiddlewareFunction,
    MiddlewareResult,
    MiddlewareContext,
    BrokerWithExtensions,
    Logger,
} from "./types";

// Service builder
export { ServiceBuilder } from "./ServiceBuilder";
export type { ServiceConfig } from "./ServiceBuilder";

// Logger
export { ConsoleLogger, defaultLogger } from "./consoleLogger";

// Contracts
export { defineDomain } from "./contracts/defineDomain";
export type {
    EventContract,
    CommandContract,
    RpcContract,
    DomainDefinition,
    DomainDefinitionInput,
    EventsDefinition,
    CommandsDefinition,
    RpcDefinition,
    HandlerOptions,
} from "./contracts/types";

// Handler factories
export { onEvent } from "./handlers/onEvent";
export { onCommand } from "./handlers/onCommand";
export { onRpc } from "./handlers/onRpc";
export type {
    HandlerDeclaration,
    EventHandlerDeclaration,
    CommandHandlerDeclaration,
    RpcHandlerDeclaration,
    EventHandler,
    CommandHandler,
    RpcHandler,
    HandlerContext,
} from "./handlers/types";

// Broker
export type { ServiceBroker } from "./broker/types";
export { RpcErrorCode, RpcError } from "./broker/rpc";
export type { RpcRequest, RpcResponse, RpcErrorCodeValue } from "./broker/rpc";

// Delayed delivery
export type { DelayedDeliveryEnvelope } from "./broker/delayedDeliveryTypes";
export { DelayedDeliveryError, DelayedDeliveryErrorCode } from "./broker/delayedDeliveryTypes";
export type { DelayConfig } from "./contracts/types";

// Named connection config type
export type { ConnectionConfig } from "./topology/derive";

// Interceptors
export type {
    Interceptor,
    InboundWrapper,
    OutboundWrapper,
    InboundMetadata,
    OutboundMetadata,
} from "./interceptors/types";
