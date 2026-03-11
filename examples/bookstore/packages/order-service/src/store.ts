import type { Order, OrderItem } from "@bookstore/contracts";

/**
 * Hardcoded product catalog. Order-service owns the product data — catalog-service
 * only tracks stock quantities. This avoids cross-service RPCs during order creation.
 */
const PRODUCTS: Record<string, { productId: string; productName: string; unitPrice: number }> = {
    "widget-1": { productId: "widget-1", productName: "Widget", unitPrice: 9.99 },
    "gadget-1": { productId: "gadget-1", productName: "Gadget", unitPrice: 17.99 },
};

let orderCounter = 0;

const orders = new Map<string, Order>();

/**
 * Looks up a product by ID. Returns null for unknown products.
 */
export function lookupProduct(
    productId: string
): { productId: string; productName: string; unitPrice: number } | null {
    return PRODUCTS[productId] ?? null;
}

/**
 * Creates a new order from a list of requested items.
 * Resolves product names and prices from the internal catalog.
 * Throws if any requested product ID is unknown.
 */
export function createOrder(requestedItems: Array<{ productId: string; quantity: number }>): Order {
    orderCounter++;
    const orderId = `ORD-${String(orderCounter).padStart(3, "0")}`;

    const resolvedItems: OrderItem[] = requestedItems.map(item => {
        const product = lookupProduct(item.productId);
        if (!product) {
            throw new Error(`Unknown product: ${item.productId}`);
        }
        return {
            productId: item.productId,
            productName: product.productName,
            quantity: item.quantity,
            unitPrice: product.unitPrice,
            lineTotal: parseFloat((product.unitPrice * item.quantity).toFixed(2)),
        };
    });

    const total = parseFloat(
        resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
    );

    const order: Order = { orderId, items: resolvedItems, total, status: "active" };
    orders.set(orderId, order);
    return order;
}

/**
 * Returns an order by ID. Returns null if not found.
 */
export function getOrder(orderId: string): Order | null {
    return orders.get(orderId) ?? null;
}

/**
 * Marks an order as cancelled. Returns the updated order, or null if not found.
 */
export function cancelOrder(orderId: string): Order | null {
    const order = orders.get(orderId);
    if (!order) {
        return null;
    }
    order.status = "cancelled";
    return order;
}
