import hoppity, { ServiceBroker } from "@apogeelabs/hoppity";
import { OrdersDomain } from "@bookstore/contracts";
import { logger } from "../logger";
import { config } from "../config";
import { createOrderHandler } from "./handlers/createOrder";
import { getOrderSummaryHandler } from "./handlers/getOrderSummary";
import { cancelOrderHandler } from "./handlers/cancelOrder";

let brokerInstance: ServiceBroker | null = null;

/**
 * Singleton factory for the order-service broker.
 *
 * Handlers and topology are derived automatically from the handlers and publishes
 * arrays — no topology.ts file required.
 */
export async function getBroker(): Promise<ServiceBroker> {
    if (brokerInstance) {
        return brokerInstance;
    }

    brokerInstance = await hoppity
        .service("order-service", {
            connection: {
                url: config.rabbitmq.url,
                vhost: config.rabbitmq.vhost,
                options: { heartbeat: 10 },
                retry: { factor: 2, min: 1000, max: 5000 },
            },
            handlers: [createOrderHandler, getOrderSummaryHandler, cancelOrderHandler],
            publishes: [OrdersDomain.events.orderCreated, OrdersDomain.events.orderCancelled],
            logger,
        })
        .build();

    return brokerInstance;
}
