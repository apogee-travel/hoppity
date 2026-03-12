import hoppity from "@apogeelabs/hoppity";
import { BrokerAsPromised } from "rascal";
import { logger } from "../../logger";
import { messageHandler } from "./handlers/messageHandler";
import { subscriberTopology } from "./topology";

let brokerInstance: BrokerAsPromised | null = null;

/**
 * Singleton factory for the subscriber broker.
 *
 * Uses the raw topology escape hatch: no contract handlers, topology provided directly.
 * Subscription wiring is done manually after broker creation via Rascal's subscribe().
 */
export async function getBroker(): Promise<BrokerAsPromised> {
    if (brokerInstance) {
        return brokerInstance;
    }

    brokerInstance = await hoppity
        .service("basic-pubsub-subscriber", {
            connection: { url: "unused" },
            topology: subscriberTopology,
            logger,
        })
        .build();

    // Wire subscription directly — no withSubscriptions middleware needed
    const sub = await brokerInstance.subscribe("on_event");
    sub.on("message", (message, content, ackOrNack) => {
        void messageHandler(message, content, ackOrNack);
    });

    return brokerInstance;
}
