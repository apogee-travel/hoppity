import { config } from "../config";
import { getBroker } from "./messaging/broker";

/**
 * Subscriber Service
 *
 * Demonstrates consuming messages with hoppity:
 * 1. withTopology() to declare exchanges, queues, bindings, and subscriptions
 * 2. logger in ServiceConfig for custom logger injection
 * 3. manual subscribe() calls to wire handlers to subscription queues
 *
 * Unlike the publisher, the subscriber doesn't need a publish loop — the
 * `withSubscriptions` middleware wires up message handlers during the
 * `onBrokerCreated` phase, so the broker is already consuming as soon as
 * `.build()` resolves. This main function just keeps the process alive.
 */
async function main() {
    console.log("🚀 [Subscriber] Starting...");
    console.log("📋 [Subscriber] Configuration:", {
        rabbitmq: config.rabbitmq.host,
    });

    try {
        // getBroker() builds the pipeline AND wires subscription handlers.
        // By the time this resolves, the subscriber is already listening.
        const broker = await getBroker();
        console.log("✅ [Subscriber] Broker created successfully");

        // Graceful shutdown: close the AMQP connection and drain consumers
        const shutdown = async () => {
            console.log("🛑 [Subscriber] Shutting down...");
            try {
                await broker.shutdown();
                console.log("✅ [Subscriber] Shutdown complete");
            } catch (error) {
                // Rascal sometimes throws on shutdown if the connection
                // was already interrupted — log it but don't block exit.
                console.log(
                    "⚠️  [Subscriber] Shutdown completed with warnings:",
                    error instanceof Error ? error.message : String(error)
                );
            }
            process.exit(0);
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);

        console.log("✅ [Subscriber] Running. Waiting for messages. Press Ctrl+C to stop");
    } catch (error) {
        console.error("❌ [Subscriber] Failed to start:", error);
        process.exit(1);
    }
}

main();
