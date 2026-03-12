# @apogeelabs/hoppity-open-telemetry

OpenTelemetry tracing and metrics interceptors for hoppity.

## Installation

```bash
pnpm add @apogeelabs/hoppity-open-telemetry
# or
npm install @apogeelabs/hoppity-open-telemetry
```

Peer dependency: `@opentelemetry/api@^1.9.0`. You provide the SDK, exporter, and configuration — this package only calls the OTel API surface.

## Usage

Both `withTracing` and `withMetrics` are dual-use: pass them directly as interceptor values (uses defaults) or call them as factories to supply options.

```typescript
import hoppity from "@apogeelabs/hoppity";
import { withTracing, withMetrics } from "@apogeelabs/hoppity-open-telemetry";

// Direct use — default tracer/meter name "hoppity"
const broker = await hoppity
    .service("order-service", {
        connection: { url: "amqp://localhost" },
        handlers: [myHandler],
        publishes: [MyDomain.events.myEvent],
        interceptors: [withTracing, withMetrics],
    })
    .build();

// Factory use — custom names and options
const broker = await hoppity
    .service("order-service", {
        connection: { url: "amqp://localhost" },
        handlers: [myHandler],
        publishes: [MyDomain.events.myEvent],
        interceptors: [
            withTracing({ tracerName: "order-service", spanPrefix: "msg" }),
            withMetrics({
                meterName: "order-service",
                histogramBuckets: [5, 10, 25, 50, 100, 250],
            }),
        ],
    })
    .build();
```

## Options

### TracingOptions

| Option       | Type     | Default        | Description                                                        |
| ------------ | -------- | -------------- | ------------------------------------------------------------------ |
| `tracerName` | `string` | `"hoppity"`    | Name passed to `trace.getTracer()`                                 |
| `spanPrefix` | `string` | operation kind | Prefix for span names (e.g. `"msg"` → `"msg:orders.orderCreated"`) |

### MetricsOptions

| Option             | Type       | Default           | Description                                   |
| ------------------ | ---------- | ----------------- | --------------------------------------------- |
| `meterName`        | `string`   | `"hoppity"`       | Name passed to `metrics.getMeter()`           |
| `histogramBuckets` | `number[]` | OTel SDK defaults | Histogram bucket boundaries for duration (ms) |

## Behaviour

### Tracing

- **Inbound:** Extracts parent trace context from AMQP headers via `propagation.extract()`. Starts a span named `{prefix}:{domain}.{operationName}`. Records exceptions and sets span status.
- **Outbound:** Starts a span named `publish:{domain}.{operationName}`. Injects trace context into AMQP headers so downstream consumers link as child spans.

### Metrics

- **Inbound:** `hoppity.handler.count`, `hoppity.handler.duration` (histogram, ms), `hoppity.handler.errors`
- **Outbound:** `hoppity.publish.count`, `hoppity.publish.duration` (histogram, ms), `hoppity.publish.errors`

Instruments are initialised lazily on first message.

### Attributes

| Attribute                    | Value                             |
| ---------------------------- | --------------------------------- |
| `messaging.system`           | `"rabbitmq"`                      |
| `messaging.operation.type`   | `"receive"` / `"publish"`         |
| `messaging.destination.name` | Exchange name                     |
| `hoppity.domain`             | Domain name                       |
| `hoppity.operation`          | Operation name                    |
| `hoppity.kind`               | `"event"` / `"command"` / `"rpc"` |
| `service.name`               | Service name                      |

## License

ISC
