import { ZodTypeAny } from "zod";
import { RpcContract, HandlerOptions } from "../contracts/types";
import { RpcHandler, RpcHandlerDeclaration } from "./types";

/**
 * Declares a typed RPC handler for use in the service config handlers array.
 *
 * Both the request and response types are inferred from the contract's schemas.
 * The handler must return a Promise resolving to the response schema's inferred type.
 *
 * @param contract - The RpcContract to handle
 * @param handler - The handler function
 * @param options - Optional queue/redelivery/dead-letter overrides
 */
export function onRpc<TReq extends ZodTypeAny, TRes extends ZodTypeAny>(
    contract: RpcContract<any, any, TReq, TRes>, // eslint-disable-line @typescript-eslint/no-explicit-any
    handler: RpcHandler<TReq, TRes>,
    options?: HandlerOptions
): RpcHandlerDeclaration {
    return {
        _kind: "rpc",
        contract,
        handler,
        ...(options !== undefined ? { options } : {}),
    };
}
