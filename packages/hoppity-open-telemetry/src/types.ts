/**
 * Options for the withTracing interceptor.
 * All fields are optional — omit to accept the defaults.
 */
export interface TracingOptions {
    /**
     * Name passed to opentelemetry.trace.getTracer().
     * Defaults to "hoppity".
     */
    tracerName?: string;
    /**
     * Prefix prepended to span names, separated by a colon.
     * Defaults to the operation kind (e.g. "event", "command", "rpc", "publish").
     * Provide this to namespace spans from multiple services sharing a tracer.
     */
    spanPrefix?: string;
}

/**
 * Options for the withMetrics interceptor.
 * All fields are optional — omit to accept the defaults.
 */
export interface MetricsOptions {
    /**
     * Name passed to opentelemetry.metrics.getMeter().
     * Defaults to "hoppity".
     */
    meterName?: string;
    /**
     * Explicit histogram bucket boundaries for duration histograms (milliseconds).
     * Defaults to the OTel SDK default boundaries when omitted.
     */
    histogramBuckets?: number[];
}
