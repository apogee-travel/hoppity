import hoppity, { ServiceBroker } from "@apogeelabs/hoppity";
import { OrdersDomain, CatalogDomain } from "@bookstore/contracts";
import { logger } from "../logger";
import { config } from "../config";

let brokerInstance: ServiceBroker | null = null;

/**
 * Singleton factory for the runner broker.
 *
 * The runner has no inbound handlers — it only calls RPCs and sends commands.
 * Listing the RPC contracts in `publishes` causes ServiceBuilder to add the
 * reply queue infrastructure automatically, so broker.request() works without
 * any manual topology augmentation.
 */
export async function getBroker(): Promise<ServiceBroker> {
    if (brokerInstance) {
        return brokerInstance;
    }

    brokerInstance = await hoppity
        .service("runner", {
            connection: {
                url: config.rabbitmq.url,
                vhost: config.rabbitmq.vhost,
                options: { heartbeat: 10 },
                retry: { factor: 2, min: 1000, max: 5000 },
            },
            publishes: [
                OrdersDomain.rpc.createOrder,
                OrdersDomain.rpc.getOrderSummary,
                OrdersDomain.commands.cancelOrder,
                CatalogDomain.rpc.getStockLevels,
            ],
            logger,
        })
        .build();

    return brokerInstance;
}
