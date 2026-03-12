import hoppity, { ServiceBroker } from "@apogeelabs/hoppity";
import { logger } from "../logger";
import { config } from "../config";
import { getStockLevelsHandler } from "./handlers/getStockLevels";
import { onOrderCancelledHandler } from "./handlers/onOrderCancelled";
import { onOrderCreatedHandler } from "./handlers/onOrderCreated";

let brokerInstance: ServiceBroker | null = null;

/**
 * Singleton factory for the catalog-service broker.
 *
 * Handlers and topology are derived automatically from the handlers array —
 * no topology.ts file required.
 */
export async function getBroker(): Promise<ServiceBroker> {
    if (brokerInstance) {
        return brokerInstance;
    }

    brokerInstance = await hoppity
        .service("catalog-service", {
            connection: {
                url: config.rabbitmq.url,
                vhost: config.rabbitmq.vhost,
                options: { heartbeat: 10 },
                retry: { factor: 2, min: 1000, max: 5000 },
            },
            handlers: [onOrderCreatedHandler, onOrderCancelledHandler, getStockLevelsHandler],
            logger,
        })
        .build();

    return brokerInstance;
}
