/**
 * @module @apogeelabs/hoppity-delayed-publish
 *
 * TTL-based delayed message publishing for hoppity brokers, using RabbitMQ
 * dead-letter exchanges with automatic retry on re-publish failure.
 *
 * @example
 * ```typescript
 * import { withDelayedPublish, type DelayedPublishBroker } from "@apogeelabs/hoppity-delayed-publish";
 *
 * const broker = (await hoppity
 *     .withTopology(topology)
 *     .use(withDelayedPublish({ serviceName: "svc", instanceId: randomUUID() }))
 *     .build()) as DelayedPublishBroker;
 *
 * await broker.delayedPublish("my_publication", payload, undefined, 5_000);
 * ```
 */
export { DelayedPublishError, DelayedPublishErrorCode } from "./types";
export type { DelayedMessage, DelayedPublishBroker, DelayedPublishOptions } from "./types";
export { withDelayedPublish } from "./withDelayedPublish";
