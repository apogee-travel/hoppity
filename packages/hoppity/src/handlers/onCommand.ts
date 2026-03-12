import { ZodTypeAny } from "zod";
import { CommandContract, HandlerOptions } from "../contracts/types";
import { CommandHandler, CommandHandlerDeclaration } from "./types";

/**
 * Declares a typed command handler for use in the service config handlers array.
 *
 * Same type-inference behavior as onEvent — the contract's schema drives the
 * handler's content type.
 *
 * @param contract - The CommandContract to handle
 * @param handler - The handler function
 * @param options - Optional queue/redelivery/dead-letter overrides
 */
export function onCommand<TSchema extends ZodTypeAny>(
    contract: CommandContract<any, any, TSchema>, // eslint-disable-line @typescript-eslint/no-explicit-any
    handler: CommandHandler<TSchema>,
    options?: HandlerOptions
): CommandHandlerDeclaration {
    return {
        _kind: "command",
        contract,
        handler,
        ...(options !== undefined ? { options } : {}),
    };
}
