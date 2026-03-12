import hoppity from "@apogeelabs/hoppity";
import { BrokerAsPromised } from "rascal";
import { logger } from "../../logger";
import { publisherTopology } from "./topology";

let brokerInstance: BrokerAsPromised | null = null;

/**
 * Singleton factory for the publisher broker.
 *
 * Uses the raw topology escape hatch: no contract handlers, topology provided directly.
 * The publisher only sends messages — no subscriptions needed.
 */
export async function getBroker(): Promise<BrokerAsPromised> {
    if (brokerInstance) {
        return brokerInstance;
    }

    brokerInstance = await hoppity
        .service("basic-pubsub-publisher", {
            connection: { url: "unused" },
            topology: publisherTopology,
            logger,
        })
        .build();

    return brokerInstance;
}
