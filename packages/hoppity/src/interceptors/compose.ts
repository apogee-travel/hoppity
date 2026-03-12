/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicationConfig } from "rascal";
import { HandlerContext } from "../handlers/types";
import { Interceptor, InboundMetadata, OutboundMetadata } from "./types";

/**
 * Composes inbound wrappers from the interceptor list around a handler.
 *
 * Uses reduceRight so the first interceptor in the array becomes the outermost
 * wrapper — i.e. for [A, B], the call chain is A → B → handler.
 *
 * Called per-message because InboundMetadata includes per-message headers.
 * The overhead of wrapping 1-3 functions is nanoseconds relative to AMQP I/O.
 */
export function composeInboundWrappers(
    handler: (payload: any, context: HandlerContext) => Promise<any>,
    interceptors: Interceptor[],
    metadata: InboundMetadata
): (payload: any, context: HandlerContext) => Promise<any> {
    return interceptors.reduceRight(
        (inner, interceptor) =>
            interceptor.inbound ? interceptor.inbound(inner, metadata) : inner,
        handler
    );
}

/**
 * Composes outbound wrappers from the interceptor list around a publish function.
 *
 * Same reduceRight pattern as inbound: first interceptor in the array is outermost.
 * For [A, B], the call chain is A → B → actual Rascal publish.
 *
 * Called per-publish-call because OutboundMetadata derives from the contract
 * argument, which is only known at call time.
 */
export function composeOutboundWrappers(
    publish: (message: any, overrides?: PublicationConfig) => Promise<any>,
    interceptors: Interceptor[],
    metadata: OutboundMetadata
): (message: any, overrides?: PublicationConfig) => Promise<any> {
    return interceptors.reduceRight(
        (inner, interceptor) =>
            interceptor.outbound ? interceptor.outbound(inner, metadata) : inner,
        publish
    );
}
