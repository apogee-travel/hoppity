import { config } from "../config";
import { getBroker } from "./messaging/broker";

/**
 * Publisher Service
 *
 * Demonstrates publishing messages with hoppity:
 * 1. withTopology() to declare exchanges and publications
 * 2. logger in ServiceConfig for custom logger injection
 * 3. broker.publish() to send messages
 *
 * The publisher creates a broker via hoppity's builder pattern, then
 * publishes a message on a configurable interval. The "send_event"
 * publication name must match a publication defined in the topology
 * (see ./messaging/topology.ts).
 */
async function main() {
    console.log("🚀 [Publisher] Starting...");
    console.log("📋 [Publisher] Configuration:", {
        rabbitmq: config.rabbitmq.host,
        publishInterval: config.publishInterval,
    });

    try {
        // getBroker() builds the hoppity pipeline and returns a Rascal BrokerAsPromised.
        // It's a singleton — multiple calls return the same broker instance.
        const broker = await getBroker();
        console.log("✅ [Publisher] Broker created successfully");

        let messageCount = 0;

        const publishMessage = async () => {
            messageCount++;
            const message = {
                id: messageCount,
                text: `Hello from publisher (#${messageCount})`,
                timestamp: new Date().toISOString(),
            };

            try {
                // "send_event" is the publication name from the topology.
                // Rascal resolves it to the correct exchange + routing key.
                await broker.publish("send_event", message);
                console.log(`📤 [Publisher] Sent message #${messageCount}:`, message.text);
            } catch (error) {
                console.error("❌ [Publisher] Failed to publish:", error);
            }
        };

        // Publish an initial message, then on interval
        await publishMessage();
        const interval = setInterval(publishMessage, config.publishInterval);

        // Graceful shutdown: stop publishing, then close the AMQP connection
        const shutdown = async () => {
            console.log("🛑 [Publisher] Shutting down...");
            clearInterval(interval);
            await broker.shutdown();
            console.log("✅ [Publisher] Shutdown complete");
            process.exit(0);
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);

        console.log("✅ [Publisher] Running. Press Ctrl+C to stop");
    } catch (error) {
        console.error("❌ [Publisher] Failed to start:", error);
        process.exit(1);
    }
}

main();
