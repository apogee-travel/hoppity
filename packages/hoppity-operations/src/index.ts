/**
 * @module @apogeelabs/hoppity-operations
 *
 * Typed runtime broker operations for hoppity-contracts. Wires contract-based
 * event, command, and RPC handlers into the broker and extends it with typed
 * outbound methods (`publishEvent`, `sendCommand`, `request`, `cancelRequest`).
 *
 * Contract objects are the only accepted API surface — no string fallback.
 *
 * @example
 * ```typescript
 * import { withOperations, onEvent, onRpc } from "@apogeelabs/hoppity-operations";
 *
 * const broker = await hoppity
 *     .withTopology(topology)
 *     .use(withOperations({
 *         serviceName: "warehouse",
 *         instanceId: crypto.randomUUID(),
 *         handlers: [
 *             onEvent(Order.events.placed, async (content) => { ... }),
 *             onRpc(Inventory.rpc.check, async (req) => { ... }),
 *         ],
 *     }))
 *     .build() as OperationsBroker;
 * ```
 */
export { withOperations } from "./withOperations";
export { onEvent, onCommand, onRpc } from "./handlers";
export { RpcErrorCode } from "./types";

export type {
    OperationsBroker,
    OperationsMiddlewareOptions,
    HandlerContext,
    EventHandler,
    CommandHandler,
    RpcHandler,
    HandlerDeclaration,
    EventHandlerDeclaration,
    CommandHandlerDeclaration,
    RpcHandlerDeclaration,
    RpcRequest,
    RpcResponse,
    RpcErrorCodeValue,
} from "./types";
