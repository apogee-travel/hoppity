import { EventContract, CommandContract, RpcContract } from "@apogeelabs/hoppity-contracts";
import { ZodTypeAny } from "zod";
import {
    CommandHandler,
    CommandHandlerDeclaration,
    EventHandler,
    EventHandlerDeclaration,
    RpcHandler,
    RpcHandlerDeclaration,
} from "./types";

/**
 * Declares a typed event handler for use in withOperations middleware config.
 *
 * The handler's content parameter type is inferred from the contract's schema,
 * so passing a handler whose content type doesn't match the event schema is a
 * compile-time error rather than a runtime surprise.
 */
export function onEvent<TSchema extends ZodTypeAny>(
    contract: EventContract<any, any, TSchema>,
    handler: EventHandler<TSchema>
): EventHandlerDeclaration {
    return {
        _kind: "event",
        contract,
        handler,
    };
}

/**
 * Declares a typed command handler for use in withOperations middleware config.
 *
 * Same type-inference behavior as onEvent — the contract's schema drives the
 * handler's content type.
 */
export function onCommand<TSchema extends ZodTypeAny>(
    contract: CommandContract<any, any, TSchema>,
    handler: CommandHandler<TSchema>
): CommandHandlerDeclaration {
    return {
        _kind: "command",
        contract,
        handler,
    };
}

/**
 * Declares a typed RPC handler for use in withOperations middleware config.
 *
 * Both the request and response types are inferred from the contract's schemas.
 * The handler must return a Promise resolving to the response schema's inferred type.
 */
export function onRpc<TReq extends ZodTypeAny, TRes extends ZodTypeAny>(
    contract: RpcContract<any, any, TReq, TRes>,
    handler: RpcHandler<TReq, TRes>
): RpcHandlerDeclaration {
    return {
        _kind: "rpc",
        contract,
        handler,
    };
}
