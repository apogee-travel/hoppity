<p>
  <img src="./packages/docs/src/assets/hero-dark.svg" alt="Hoppity Logo" width="240" />
</p>

**Consistent, pattern-driven RabbitMQ topology and broker configuration for Node.js microservices.**

[📖 Documentation](https://apogee-travel.github.io/hoppity/)

Hoppity builds on [rascal](https://github.com/guidesmiths/rascal) to make RabbitMQ topology management in large Node.js monorepos easier, safer, and more maintainable. It reduces the risk of mistakes and the effort required to manage multiple topology files — especially when using advanced patterns like RPC and delayed publishing.

- **Why?** Rascal is powerful, but managing large, hand-written topology files across many services is error-prone and tedious. Hoppity provides a way to configure rascal's topology and broker in a consistent, pattern-based way, reducing boilerplate and risk.

[Development Guide →](./DEVELOP.md)

---

## Quick Start

Each package's README has quick-start examples on how to use each library

You can also view the examples for real-world usage:

- [basic-pubsub](./examples/basic-pubsub/README.md)
- [bookstore](./examples/bookstore/README.md)

---

## Features

- Consistent, pattern-based RabbitMQ topology configuration
- Built-in support for RPC and delayed publishing patterns
- Reduces boilerplate and risk of misconfiguration
- Works seamlessly with rascal and Node.js
- Designed for large microservice monorepos
- Interceptors for per-message telemetry, tracing, and metrics

---

## Packages

- [`hoppity`](./packages/hoppity) – Core library — contracts, handlers, topology derivation, broker wiring
- [`hoppity-open-telemetry`](./packages/hoppity-open-telemetry) – OpenTelemetry tracing and metrics interceptors

---

## Interceptors

Interceptors are the extension point for per-message cross-cutting concerns — tracing, metrics, header injection, timing. They wrap handler execution (inbound) and publish calls (outbound), and compose cleanly with the middleware system.

For `interceptors: [A, B]`, the call chain is `A → B → handler → B → A`. Inbound wrappers compose at subscription time; outbound wrappers compose per-call.

**Interceptors vs. middleware:** Middleware (`.use()`) runs once at build time to modify topology and register lifecycle hooks. Interceptors run on every message — they're for runtime instrumentation, not setup.

### hoppity-open-telemetry

The [`hoppity-open-telemetry`](./packages/hoppity-open-telemetry) package provides production-ready OTel interceptors. Both work as direct values or as factories when you need to configure them:

```typescript
import { withTracing, withMetrics } from "@apogeelabs/hoppity-open-telemetry";

const broker = await hoppity
    .service("order-service", {
        connection: { url: process.env.RABBITMQ_URL },
        handlers: [handleOrderCreated],
        publishes: [OrdersDomain.events.orderCreated],
        // Direct usage — uses defaults ("hoppity" tracer/meter name)
        interceptors: [withTracing, withMetrics],
    })
    .build();
```

`withTracing` extracts parent trace context from AMQP headers on inbound messages and injects trace context into headers on publish, so spans stitch together across services automatically. `withMetrics` records handler duration/count/errors and publish duration/count/errors as OTel instruments.

Both accept an options object when you need a custom tracer/meter name or explicit histogram bucket boundaries:

```typescript
interceptors: [
    withTracing({ tracerName: "order-service" }),
    withMetrics({ meterName: "order-service", histogramBuckets: [5, 10, 25, 50, 100, 250] }),
];
```

Requires `@opentelemetry/api@^1.9.0` as a peer dependency.

---

## Example Projects

- [`examples/basic-pubsub`](./examples/basic-pubsub) – Basic pub/sub with raw topology escape hatch
- [`examples/bookstore`](./examples/bookstore) – Contract-driven multi-service demo with events, RPC, and middleware

---

## Prerequisites

- [Node.js](https://nodejs.org/) >= 22 (see `.nvmrc`)
- [pnpm](https://pnpm.io/) 9.15.9
- [RabbitMQ](https://www.rabbitmq.com/) — a `docker-compose.yml` is included at the repo root for local development

## License

[ISC](./packages/hoppity/LICENSE)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines and [DEVELOP.md](./DEVELOP.md) for setup and development workflows.

---

## Resources

- [Rascal Documentation](https://github.com/guidesmiths/rascal)
- [RabbitMQ](https://www.rabbitmq.com/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turborepo](https://turbo.build/repo/docs)
