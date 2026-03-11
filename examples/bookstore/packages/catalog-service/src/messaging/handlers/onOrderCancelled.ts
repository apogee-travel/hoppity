import { onEvent } from "@apogeelabs/hoppity-operations";
import { OrdersDomain } from "@bookstore/contracts";
import { restoreStock } from "../../store";
import { logger } from "../../logger";

/**
 * Reacts to orderCancelled events by restoring stock for each item.
 * Items are included in the event payload (set by order-service) so this handler
 * doesn't need to look up the original order — no cross-service query needed.
 */
export const onOrderCancelledHandler = onEvent(
    OrdersDomain.events.orderCancelled,
    async (content, _context) => {
        logger.info(`Processing orderCancelled for ${content.orderId}`);
        for (const item of content.items) {
            const newStock = restoreStock(item.productId, item.quantity);
            if (newStock === null) {
                logger.warn(
                    `orderCancelled: unknown product ${item.productId} — stock not adjusted`
                );
            } else {
                logger.info(
                    `  Stock restore: ${item.productName} ${item.productId} +${item.quantity} → stock now ${newStock}`
                );
            }
        }
    }
);
