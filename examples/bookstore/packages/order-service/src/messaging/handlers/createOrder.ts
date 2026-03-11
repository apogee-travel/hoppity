import { onRpc } from "@apogeelabs/hoppity-operations";
import { OrdersDomain } from "@bookstore/contracts";
import { createOrder } from "../../store";
import { logger } from "../../logger";

/**
 * Handles createOrder RPC — creates the order, publishes the orderCreated event,
 * and returns the full order to the caller.
 *
 * Publishing the event here (in the RPC handler) rather than in a separate
 * side-effect path keeps causality clear: the event goes out only after the
 * order is durably created in the store.
 */
export const createOrderHandler = onRpc(
    OrdersDomain.rpc.createOrder,
    async (request, { broker }) => {
        const order = createOrder(request.items);
        logger.info(
            `Created order ${order.orderId} (${order.items.length} items, $${order.total})`
        );

        await broker.publishEvent(OrdersDomain.events.orderCreated, {
            orderId: order.orderId,
            items: order.items,
            total: order.total,
        });

        return order;
    }
);
