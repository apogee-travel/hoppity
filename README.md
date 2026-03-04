<p>
  <img src="./hoppity-logo-1.png" alt="Hoppity Logo" width="78" />
</p>

# Hoppity

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
- [delayed-publish](./examples/delayed-publish/README.md)
- [rpc](./examples/rpc/README.md)

---

## Features

- Consistent, pattern-based RabbitMQ topology configuration
- Built-in support for RPC and delayed publishing patterns
- Reduces boilerplate and risk of misconfiguration
- Works seamlessly with rascal and Node.js
- Designed for large microservice monorepos

---

## Packages

- [`hoppity`](./packages/hoppity) – Core library for topology and broker configuration
- [`hoppity-delayed-publish`](./packages/hoppity-delayed-publish) – Delay message handling with wait/ready queue pairs
- [`hoppity-logger`](./packages/hoppity-logger) – Plug in custom loggers (e.g., Winston)
- [`hoppity-rpc`](./packages/hoppity-rpc) – RPC topology and helpers
- [`hoppity-subscriptions`](./packages/hoppity-subscriptions) – Auto-subscribe by matching topology to handlers

---

## Example Projects

- [`examples/basic-pubsub`](./examples/basic-pubsub) – Basic pub/sub with core hoppity and subscriptions
- [`examples/delayed-publish`](./examples/delayed-publish) – Demonstrates delayed publishing and subscriptions
- [`examples/rpc`](./examples/rpc) – Demonstrates RPC pattern usage

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
