/* eslint-disable @typescript-eslint/no-explicit-any */
import { context, propagation, SpanStatusCode, trace } from "@opentelemetry/api";
import type {
    Interceptor,
    InboundMetadata,
    OutboundMetadata,
    InboundWrapper,
    OutboundWrapper,
} from "@apogeelabs/hoppity";
import { buildInboundAttributes, buildOutboundAttributes } from "./attributes";
import type { TracingOptions } from "./types";

const DEFAULT_TRACER_NAME = "hoppity";

/**
 * Dual-use interceptor type: callable as a factory or usable directly as an Interceptor.
 * Function.name is "withTracing", matching the Interceptor.name contract.
 */
export type WithTracingInterceptor = Interceptor & {
    (options?: TracingOptions): Interceptor;
    inbound: InboundWrapper;
    outbound: OutboundWrapper;
};

/**
 * Builds the span name for an inbound handler.
 * Format: {kind}:{domain}.{operationName}
 * e.g. "event:orders.orderCreated"
 */
function buildInboundSpanName(meta: InboundMetadata, spanPrefix?: string): string {
    const prefix = spanPrefix ?? meta.kind;
    return `${prefix}:${meta.contract._domain}.${meta.contract._name}`;
}

/**
 * Builds the span name for an outbound publish.
 * Format: publish:{domain}.{operationName}
 */
function buildOutboundSpanName(meta: OutboundMetadata, spanPrefix?: string): string {
    const prefix = spanPrefix ?? "publish";
    return `${prefix}:${meta.contract._domain}.${meta.contract._name}`;
}

/**
 * Creates the inbound wrapper for the given tracing options.
 * Extracted so default wrappers can be pre-built for the direct-use case.
 */
function makeInboundWrapper(tracerName: string, spanPrefix?: string): InboundWrapper {
    return (handler, meta) => {
        return async (payload, ctx) => {
            const tracer = trace.getTracer(tracerName);
            const spanName = buildInboundSpanName(meta, spanPrefix);
            const attributes = buildInboundAttributes(meta);

            // Extract parent context from AMQP message headers so this span
            // becomes a child of the publisher's span rather than a new root.
            const parentContext = propagation.extract(context.active(), meta.message.headers);

            return context.with(parentContext, async () => {
                return tracer.startActiveSpan(spanName, { attributes }, async span => {
                    try {
                        const result = await handler(payload, ctx);
                        span.setStatus({ code: SpanStatusCode.OK });
                        return result;
                    } catch (err: any) {
                        span.recordException(err);
                        span.setStatus({ code: SpanStatusCode.ERROR, message: err?.message });
                        throw err;
                    } finally {
                        span.end();
                    }
                });
            });
        };
    };
}

/**
 * Creates the outbound wrapper for the given tracing options.
 */
function makeOutboundWrapper(tracerName: string, spanPrefix?: string): OutboundWrapper {
    return (publish, meta) => {
        return async (message, overrides) => {
            const tracer = trace.getTracer(tracerName);
            const spanName = buildOutboundSpanName(meta, spanPrefix);
            const attributes = buildOutboundAttributes(meta);

            return tracer.startActiveSpan(spanName, { attributes }, async span => {
                try {
                    // Inject the current trace context into AMQP headers so the
                    // downstream consumer can extract and link its span as a child.
                    const headers: Record<string, any> = {
                        ...overrides?.options?.headers,
                    };
                    propagation.inject(context.active(), headers);

                    const result = await publish(message, {
                        ...overrides,
                        options: {
                            ...overrides?.options,
                            headers,
                        },
                    });
                    span.setStatus({ code: SpanStatusCode.OK });
                    return result;
                } catch (err: any) {
                    span.recordException(err);
                    span.setStatus({ code: SpanStatusCode.ERROR, message: err?.message });
                    throw err;
                } finally {
                    span.end();
                }
            });
        };
    };
}

/**
 * OTel tracing interceptor for hoppity.
 *
 * Can be used directly as an interceptor (uses defaults) or called as a factory
 * to supply custom tracer name and span prefix:
 *
 * @example
 * ```typescript
 * // Default usage
 * interceptors: [withTracing]
 *
 * // Configured usage
 * interceptors: [withTracing({ tracerName: "order-service" })]
 * ```
 *
 * Inbound: extracts parent trace context from AMQP headers, starts an active span
 * named "{kind}:{domain}.{operationName}", sets semantic attributes, and propagates
 * success/error status.
 *
 * Outbound: starts an active span named "publish:{domain}.{operationName}", injects
 * current trace context into AMQP headers for downstream consumers.
 *
 * Function.name is "withTracing", which satisfies the Interceptor.name contract
 * when the interceptor is placed directly in the array.
 */
function withTracing(options?: TracingOptions): Interceptor {
    const tracerName = options?.tracerName ?? DEFAULT_TRACER_NAME;
    const spanPrefix = options?.spanPrefix;
    return {
        name: "withTracing",
        inbound: makeInboundWrapper(tracerName, spanPrefix),
        outbound: makeOutboundWrapper(tracerName, spanPrefix),
    };
}

// Attach default inbound/outbound directly on the function so withTracing can be
// placed in an interceptors array without calling it. Function.name is already
// "withTracing" (the function declaration name), satisfying Interceptor.name.
withTracing.inbound = makeInboundWrapper(DEFAULT_TRACER_NAME);
withTracing.outbound = makeOutboundWrapper(DEFAULT_TRACER_NAME);

export { withTracing };
