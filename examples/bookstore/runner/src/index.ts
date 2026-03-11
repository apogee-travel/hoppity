import { getBroker } from "./messaging/broker";
import { awaitTapEvent } from "./messaging/tapHandler";
import { spawnService, killAll } from "./processManager";
import { config } from "./config";
import {
    printStepHeader,
    printSend,
    printReceive,
    printEvent,
    printCommand,
    printSeparator,
    printStockLevels,
    printCurrentStock,
    formatOrderSummary,
} from "./output";
import { OrdersDomain, CatalogDomain } from "@bookstore/contracts";

/**
 * Bookstore Demo Runner
 *
 * Spawns order-service and catalog-service, then executes a scripted flow
 * demonstrating contracts, typed operations, and the outbound exchange tap.
 *
 * Set 1 — Create & Query:
 *   createOrder (RPC) → orderCreated (event) → getOrderSummary (RPC)
 *
 * Set 2 — Cancel & Query:
 *   cancelOrder (command) → orderCancelled (event) → getOrderSummary (RPC)
 */

// Routing keys derived from the OrdersDomain contracts (orders.{opType}.{snake_name})
const ROUTING_KEY_ORDER_CREATED = OrdersDomain.events.orderCreated.routingKey;
const ROUTING_KEY_ORDER_CANCELLED = OrdersDomain.events.orderCancelled.routingKey;

async function pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Bookstore Example — Hoppity Contracts + Operations Demo");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    // --- Phase 1: Spawn services and wait for readiness ---
    console.log("Spawning services...\n");

    try {
        await Promise.all([
            spawnService(
                "order-service",
                config.services.orderService,
                config.serviceReadyTimeoutMs
            ),
            spawnService(
                "catalog-service",
                config.services.catalogService,
                config.serviceReadyTimeoutMs
            ),
        ]);
    } catch (err) {
        console.error("\nFailed to start services:", err instanceof Error ? err.message : err);
        await killAll();
        process.exit(1);
    }

    console.log("\nBoth services ready. Connecting runner broker...\n");

    let broker;
    try {
        broker = await getBroker();
    } catch (err) {
        console.error("Failed to connect runner broker:", err instanceof Error ? err.message : err);
        await killAll();
        process.exit(1);
    }

    const shutdown = async () => {
        console.log("\nShutting down...");
        try {
            await broker.shutdown();
        } catch {
            // Non-fatal
        }
        await killAll();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    try {
        // --- Phase 2: Initial stock snapshot ---
        printSeparator();
        console.log("\n  Initial Stock Levels");
        const initialStock = await broker.request(CatalogDomain.rpc.getStockLevels, {});
        printCurrentStock(initialStock.products, "Before any orders:");

        // ───────────────────────────────────────────────────────────
        // SET 1: Create & Query
        // ───────────────────────────────────────────────────────────

        // Register the tap waiter BEFORE sending the RPC. createOrder publishes
        // an orderCreated event as a side effect — if we awaited the RPC first
        // and then registered the waiter, the event could arrive on the tap queue
        // before we're listening, and we'd hang forever waiting for it.
        const orderCreatedPromise = awaitTapEvent(ROUTING_KEY_ORDER_CREATED);

        printStepHeader(1, "Create Order (RPC)");
        printSend("createOrder RPC → order-service");
        const createdOrder = await broker.request(OrdersDomain.rpc.createOrder, {
            items: [
                { productId: "widget-1", quantity: 3 },
                { productId: "gadget-1", quantity: 1 },
            ],
        });
        printReceive(
            `Order ${createdOrder.orderId} created (${createdOrder.items.length} items, $${createdOrder.total.toFixed(2)})`
        );

        const orderId = createdOrder.orderId;

        printStepHeader(2, "Order Created Event (via outbound tap)");
        printSend("Waiting for orderCreated event on outbound tap...");
        await orderCreatedPromise;
        printEvent(`catalog-service received orderCreated — stock decremented`);

        // Give catalog-service a moment to finish processing before querying stock
        await pause(1500);

        const stockAfterCreate = await broker.request(CatalogDomain.rpc.getStockLevels, {});
        printStockLevels(
            initialStock.products,
            stockAfterCreate.products,
            `Stock changes after ${orderId}:`
        );

        printStepHeader(3, "Get Order Summary (RPC)");
        printSend(`getOrderSummary RPC for ${orderId}`);
        const summaryAfterCreate = await broker.request(OrdersDomain.rpc.getOrderSummary, {
            orderId,
        });
        printReceive(formatOrderSummary(summaryAfterCreate));

        await pause(1000);

        // ───────────────────────────────────────────────────────────
        // SET 2: Cancel & Query
        // ───────────────────────────────────────────────────────────

        // Same race-prevention pattern as Set 1 — register before sending.
        const orderCancelledPromise = awaitTapEvent(ROUTING_KEY_ORDER_CANCELLED);

        printStepHeader(4, "Cancel Order (Command)");
        printCommand(`cancelOrder command → order-service (orderId: ${orderId})`);
        await broker.sendCommand(OrdersDomain.commands.cancelOrder, { orderId });
        printReceive("Command sent (fire-and-forget)");

        printStepHeader(5, "Order Cancelled Event (via outbound tap)");
        printSend("Waiting for orderCancelled event on outbound tap...");
        await orderCancelledPromise;
        printEvent(`catalog-service received orderCancelled — stock restored`);

        await pause(1500);

        const stockAfterCancel = await broker.request(CatalogDomain.rpc.getStockLevels, {});
        printStockLevels(
            stockAfterCreate.products,
            stockAfterCancel.products,
            `Stock restoration after cancellation of ${orderId}:`
        );

        printStepHeader(6, "Get Order Summary (RPC)");
        printSend(`getOrderSummary RPC for ${orderId} (after cancellation)`);
        const summaryAfterCancel = await broker.request(OrdersDomain.rpc.getOrderSummary, {
            orderId,
        });
        printReceive(formatOrderSummary(summaryAfterCancel));

        // --- Done ---
        printSeparator();
        console.log("\n  Demo complete. All 6 steps finished successfully.");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    } catch (err) {
        console.error("\nDemo flow failed:", err instanceof Error ? err.message : err);
        await shutdown();
        return;
    }

    await shutdown();
}

main();
