import { ServiceBuilder, ServiceConfig } from "./ServiceBuilder";
import { Hoppity } from "./types";

/**
 * Entry point for hoppity. Create a service, chain middleware, build.
 *
 * @example
 * ```typescript
 * const broker = await hoppity
 *     .service("order-service", {
 *         connection: { url: "amqp://localhost" },
 *         handlers: [createOrderHandler],
 *         publishes: [OrdersDomain.events.orderCreated],
 *     })
 *     .use(withCustomLogger({ logger }))
 *     .build();
 * ```
 */
const hoppity: Hoppity = {
    service(serviceName: string, config: ServiceConfig): ServiceBuilder {
        return new ServiceBuilder(serviceName, config);
    },
};

export default hoppity;
