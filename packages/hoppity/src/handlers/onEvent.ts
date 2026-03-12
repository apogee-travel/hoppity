import { ZodTypeAny } from "zod";
import { EventContract, HandlerOptions } from "../contracts/types";
import { EventHandler, EventHandlerDeclaration } from "./types";

/**
 * Declares a typed event handler for use in the service config handlers array.
 *
 * The handler's content parameter type is inferred from the contract's schema,
 * so passing a handler whose content type doesn't match the event schema is a
 * compile-time error rather than a runtime surprise.
 *
 * @param contract - The EventContract to handle
 * @param handler - The handler function
 * @param options - Optional queue/redelivery/dead-letter overrides
 */
export function onEvent<TSchema extends ZodTypeAny>(
    contract: EventContract<any, any, TSchema>, // eslint-disable-line @typescript-eslint/no-explicit-any
    handler: EventHandler<TSchema>,
    options?: HandlerOptions
): EventHandlerDeclaration {
    return {
        _kind: "event",
        contract,
        handler,
        ...(options !== undefined ? { options } : {}),
    };
}
