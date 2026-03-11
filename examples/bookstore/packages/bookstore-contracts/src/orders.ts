import { defineDomain } from "@apogeelabs/hoppity-contracts";
import { z } from "zod";

/**
 * A single line item in an order — what the caller asks for when creating an order.
 * Catalog-service uses the same shape in orderCancelled so it can restore stock
 * without needing to look up the original order.
 */
const orderItemSchema = z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
});

/**
 * A fully resolved order item — includes product name and unit price, populated
 * by order-service from its internal product catalog during order creation.
 */
const resolvedOrderItemSchema = z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number(),
    lineTotal: z.number(),
});

const orderResponseSchema = z.object({
    orderId: z.string(),
    items: z.array(resolvedOrderItemSchema),
    total: z.number(),
    status: z.enum(["active", "cancelled"]),
});

export type Order = z.infer<typeof orderResponseSchema>;
export type OrderItem = z.infer<typeof resolvedOrderItemSchema>;

/**
 * Orders domain — events, commands, and RPCs for the order lifecycle.
 *
 * createOrder and getOrderSummary are RPCs because the caller needs data back.
 * cancelOrder is a command because the caller only needs confirmation that the
 * cancellation was accepted, not any resulting state.
 * orderCreated and orderCancelled are events because they're broadcasts of facts
 * that happened — other services react independently.
 */
export const OrdersDomain = defineDomain("orders", {
    events: {
        // orderCancelled includes items so catalog-service can restore stock
        // without maintaining its own order-to-items mapping.
        orderCreated: z.object({
            orderId: z.string(),
            items: z.array(resolvedOrderItemSchema),
            total: z.number(),
        }),
        orderCancelled: z.object({
            orderId: z.string(),
            items: z.array(resolvedOrderItemSchema),
        }),
    },
    commands: {
        cancelOrder: z.object({
            orderId: z.string(),
        }),
    },
    rpc: {
        createOrder: {
            request: z.object({
                items: z.array(orderItemSchema),
            }),
            response: orderResponseSchema,
        },
        getOrderSummary: {
            request: z.object({
                orderId: z.string(),
            }),
            response: orderResponseSchema,
        },
    },
});
