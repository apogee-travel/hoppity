/**
 * @module @apogeelabs/hoppity-rpc
 *
 * Hoppity middleware for request/response RPC over RabbitMQ.
 *
 * Adds `.request()`, `.addRpcListener()`, and `.cancelRequest()` to a hoppity broker
 * using correlation IDs, per-instance exclusive queues, and a shared topic exchange.
 *
 * Usage:
 * ```typescript
 * import { withRpcSupport, RpcBroker } from "@apogeelabs/hoppity-rpc";
 *
 * const broker = await hoppity
 *     .withTopology(topology)
 *     .use(withRpcSupport({ serviceName: "my-service", instanceId: randomUUID() }))
 *     .build() as RpcBroker;
 * ```
 */
export { withRpcSupport } from "./withRpcSupport";
export type { RpcMiddlewareOptions, RpcRequest, RpcResponse, RpcBroker } from "./types";
export { RpcErrorCode } from "./types";
export type { Logger } from "@apogeelabs/hoppity";
