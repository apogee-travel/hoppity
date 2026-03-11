import { onEvent } from "@apogeelabs/hoppity-operations";
import { OrdersDomain } from "@bookstore/contracts";
import { decrementStock } from "../../store";
import { logger } from "../../logger";

/**
 * Reacts to orderCreated events by decrementing stock for each ordered item.
 * The event payload includes fully resolved items (with quantities) from order-service.
 */
export const onOrderCreatedHandler = onEvent(
    OrdersDomain.events.orderCreated,
    async (content, _context) => {
        logger.info(`Processing orderCreated for ${content.orderId}`);
        for (const item of content.items) {
            const newStock = decrementStock(item.productId, item.quantity);
            if (newStock === null) {
                logger.warn(`orderCreated: unknown product ${item.productId} — stock not adjusted`);
            } else {
                logger.info(
                    `  Stock update: ${item.productName} ${item.productId} -${item.quantity} → stock now ${newStock}`
                );
            }
        }
    }
);
