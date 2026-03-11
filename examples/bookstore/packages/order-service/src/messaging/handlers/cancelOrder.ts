import { onCommand } from "@apogeelabs/hoppity-operations";
import { OrdersDomain } from "@bookstore/contracts";
import { cancelOrder } from "../../store";
import { logger } from "../../logger";

/**
 * Handles cancelOrder command — marks the order as cancelled and publishes the
 * orderCancelled event with the order's items so catalog-service can restore stock.
 *
 * Items are included in the event payload so catalog-service doesn't need to
 * maintain its own order-to-items mapping — a deliberate simplification.
 */
export const cancelOrderHandler = onCommand(
    OrdersDomain.commands.cancelOrder,
    async (content, { broker }) => {
        const order = cancelOrder(content.orderId);
        if (!order) {
            logger.warn(`cancelOrder: order not found — ${content.orderId}`);
            return;
        }

        logger.info(`Cancelled order ${order.orderId}`);

        await broker.publishEvent(OrdersDomain.events.orderCancelled, {
            orderId: order.orderId,
            items: order.items,
        });
    }
);
