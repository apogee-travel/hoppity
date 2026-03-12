/* eslint-disable @typescript-eslint/no-explicit-any */
import { metrics, type Counter, type Histogram } from "@opentelemetry/api";
import type { Interceptor, InboundWrapper, OutboundWrapper } from "@apogeelabs/hoppity";
import { buildInboundAttributes, buildOutboundAttributes } from "./attributes";
import type { MetricsOptions } from "./types";

const DEFAULT_METER_NAME = "hoppity";

/**
 * Dual-use interceptor type: callable as a factory or usable directly as an Interceptor.
 * Function.name is "withMetrics", matching the Interceptor.name contract.
 */
export type WithMetricsInterceptor = Interceptor & {
    (options?: MetricsOptions): Interceptor;
    inbound: InboundWrapper;
    outbound: OutboundWrapper;
};

interface HandlerInstruments {
    duration: Histogram;
    count: Counter;
    errors: Counter;
}

interface PublishInstruments {
    duration: Histogram;
    count: Counter;
    errors: Counter;
}

/**
 * Creates OTel meter instruments for handler (inbound) metrics.
 */
function createHandlerInstruments(
    meterName: string,
    histogramBuckets?: number[]
): HandlerInstruments {
    const meter = metrics.getMeter(meterName);

    const durationConfig = histogramBuckets
        ? { advice: { explicitBucketBoundaries: histogramBuckets } }
        : undefined;

    return {
        duration: meter.createHistogram("hoppity.handler.duration", {
            description: "Duration of hoppity handler execution in milliseconds",
            unit: "ms",
            ...durationConfig,
        }),
        count: meter.createCounter("hoppity.handler.count", {
            description: "Number of hoppity handler invocations",
        }),
        errors: meter.createCounter("hoppity.handler.errors", {
            description: "Number of hoppity handler errors",
        }),
    };
}

/**
 * Creates OTel meter instruments for publish (outbound) metrics.
 */
function createPublishInstruments(
    meterName: string,
    histogramBuckets?: number[]
): PublishInstruments {
    const meter = metrics.getMeter(meterName);

    const durationConfig = histogramBuckets
        ? { advice: { explicitBucketBoundaries: histogramBuckets } }
        : undefined;

    return {
        duration: meter.createHistogram("hoppity.publish.duration", {
            description: "Duration of hoppity publish calls in milliseconds",
            unit: "ms",
            ...durationConfig,
        }),
        count: meter.createCounter("hoppity.publish.count", {
            description: "Number of hoppity publish calls",
        }),
        errors: meter.createCounter("hoppity.publish.errors", {
            description: "Number of hoppity publish errors",
        }),
    };
}

/**
 * Creates an inbound wrapper that records handler duration, count, and error metrics.
 * Instruments are lazily created on first invocation to avoid initialising the
 * OTel meter before the SDK is configured in the host application.
 */
function makeInboundWrapper(meterName: string, histogramBuckets?: number[]): InboundWrapper {
    let instruments: HandlerInstruments | undefined;

    function getInstruments(): HandlerInstruments {
        if (!instruments) {
            instruments = createHandlerInstruments(meterName, histogramBuckets);
        }
        return instruments;
    }

    return (handler, meta) => {
        return async (payload, ctx) => {
            const inst = getInstruments();
            const attributes = buildInboundAttributes(meta);
            const start = performance.now();

            inst.count.add(1, attributes);

            try {
                return await handler(payload, ctx);
            } catch (err: any) {
                inst.errors.add(1, attributes);
                throw err;
            } finally {
                inst.duration.record(performance.now() - start, attributes);
            }
        };
    };
}

/**
 * Creates an outbound wrapper that records publish duration, count, and error metrics.
 * Same lazy initialisation approach as the inbound wrapper.
 */
function makeOutboundWrapper(meterName: string, histogramBuckets?: number[]): OutboundWrapper {
    let instruments: PublishInstruments | undefined;

    function getInstruments(): PublishInstruments {
        if (!instruments) {
            instruments = createPublishInstruments(meterName, histogramBuckets);
        }
        return instruments;
    }

    return (publish, meta) => {
        return async (message, overrides) => {
            const inst = getInstruments();
            const attributes = buildOutboundAttributes(meta);
            const start = performance.now();

            inst.count.add(1, attributes);

            try {
                return await publish(message, overrides);
            } catch (err: any) {
                inst.errors.add(1, attributes);
                throw err;
            } finally {
                inst.duration.record(performance.now() - start, attributes);
            }
        };
    };
}

/**
 * OTel metrics interceptor for hoppity.
 *
 * Can be used directly as an interceptor (uses defaults) or called as a factory
 * to supply a custom meter name and histogram bucket boundaries:
 *
 * @example
 * ```typescript
 * // Default usage
 * interceptors: [withMetrics]
 *
 * // Configured usage
 * interceptors: [withMetrics({ meterName: "order-service", histogramBuckets: [5, 10, 25, 50, 100] })]
 * ```
 *
 * Inbound: records `hoppity.handler.duration` histogram, `hoppity.handler.count` counter,
 * and `hoppity.handler.errors` counter with domain/operation/kind/service attributes.
 *
 * Outbound: records `hoppity.publish.duration` histogram, `hoppity.publish.count` counter,
 * and `hoppity.publish.errors` counter with the same attribute set.
 *
 * Function.name is "withMetrics", which satisfies the Interceptor.name contract
 * when the interceptor is placed directly in the array.
 */
function withMetrics(options?: MetricsOptions): Interceptor {
    const meterName = options?.meterName ?? DEFAULT_METER_NAME;
    const histogramBuckets = options?.histogramBuckets;
    return {
        name: "withMetrics",
        inbound: makeInboundWrapper(meterName, histogramBuckets),
        outbound: makeOutboundWrapper(meterName, histogramBuckets),
    };
}

// Attach default inbound/outbound wrappers directly on the function so withMetrics
// can be placed in an interceptors array without calling it. Each call to
// makeInboundWrapper / makeOutboundWrapper creates its own lazy instrument cache,
// so the default wrappers are independent of any factory-created instances.
withMetrics.inbound = makeInboundWrapper(DEFAULT_METER_NAME);
withMetrics.outbound = makeOutboundWrapper(DEFAULT_METER_NAME);

export { withMetrics };
