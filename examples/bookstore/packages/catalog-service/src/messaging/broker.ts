import hoppity from "@apogeelabs/hoppity";
import { withCustomLogger } from "@apogeelabs/hoppity-logger";
import { withOperations, type OperationsBroker } from "@apogeelabs/hoppity-operations";
import { randomUUID } from "crypto";
import { logger } from "../logger";
import { getStockLevelsHandler } from "./handlers/getStockLevels";
import { onOrderCancelledHandler } from "./handlers/onOrderCancelled";
import { onOrderCreatedHandler } from "./handlers/onOrderCreated";
import { topology } from "./topology";

let brokerInstance: OperationsBroker | null = null;

/**
 * Singleton factory for the catalog-service broker.
 *
 * Middleware stack:
 *  1. withCustomLogger — ensures all downstream middleware uses the service logger
 *  2. withOperations — wires event handlers (orderCreated, orderCancelled) and
 *     the getStockLevels RPC handler; extends broker with typed outbound methods
 */
export async function getBroker(): Promise<OperationsBroker> {
    if (brokerInstance) {
        return brokerInstance;
    }

    brokerInstance = (await hoppity
        .withTopology(topology)
        .use(withCustomLogger({ logger }))
        .use(
            withOperations({
                serviceName: "catalog-service",
                instanceId: randomUUID(),
                handlers: [onOrderCreatedHandler, onOrderCancelledHandler, getStockLevelsHandler],
            })
        )
        .build()) as OperationsBroker;

    return brokerInstance;
}
