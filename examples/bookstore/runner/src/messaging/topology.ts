import { buildServiceTopology } from "@apogeelabs/hoppity-contracts";
import { BrokerConfig } from "rascal";
import { OrdersDomain, CatalogDomain } from "@bookstore/contracts";
import { config } from "../config";
import { randomUUID } from "crypto";

/**
 * The runner's instance ID — must be stable for the lifetime of this process
 * so the reply queue name matches what withOperations will use.
 *
 * withOperations computes: `${serviceName}_${instanceId}_reply`
 * We need to pre-create that queue + subscription in topology so that
 * wireRpcOutbound can subscribe to it successfully. Without this, the runner
 * has no onRpc handlers so withOperations skips reply infrastructure entirely,
 * and broker.request() fails when it tries to subscribe to a non-existent queue.
 */
export const RUNNER_INSTANCE_ID = randomUUID();

const REPLY_QUEUE_NAME = `runner_${RUNNER_INSTANCE_ID}_reply`;

// The tap queue name follows the convention from the build plan.
// It's auto-delete so it goes away when the runner disconnects.
const TAP_QUEUE_NAME = "runner_order_service_tap";
const OUTBOUND_EXCHANGE_NAME = "order-service_outbound";

const baseTopology: BrokerConfig = {
    vhosts: {
        [config.rabbitmq.vhost]: {
            connection: {
                url: config.rabbitmq.url,
                options: { heartbeat: 10 },
                retry: { factor: 2, min: 1000, max: 5000 },
            },
        },
    },
};

const topologyWithRpcCalls = buildServiceTopology(baseTopology, "runner", t => {
    t.callsRpc(OrdersDomain.rpc.createOrder);
    t.callsRpc(OrdersDomain.rpc.getOrderSummary);
    t.sendsCommand(OrdersDomain.commands.cancelOrder);
    t.callsRpc(CatalogDomain.rpc.getStockLevels);
});

/**
 * Augments the topology with:
 * 1. RPC reply infrastructure — required because the runner calls RPCs but has
 *    no onRpc handlers, so withOperations won't add it automatically.
 * 2. Outbound tap queue + binding — connects to order-service's fanout exchange
 *    so the runner can observe all order-service outbound traffic.
 */
function augmentTopology(topology: BrokerConfig): BrokerConfig {
    // Clone before mutating — hoppity also clones in the builder, but this
    // prevents mutation of the `topologyWithRpcCalls` const above.
    const augmented = structuredClone(topology);

    Object.keys(augmented.vhosts!).forEach(vhostKey => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vhost = augmented.vhosts![vhostKey] as any;

        if (!vhost.queues) vhost.queues = {};
        if (!vhost.subscriptions) vhost.subscriptions = {};
        if (!vhost.publications) vhost.publications = {};
        if (!vhost.exchanges) vhost.exchanges = {};
        if (!vhost.bindings) vhost.bindings = {};

        // --- RPC reply infrastructure ---
        // withOperations guards against overwriting rpc_reply if it already exists,
        // so setting it here is safe and will be respected by the middleware.
        vhost.queues[REPLY_QUEUE_NAME] = {
            options: { exclusive: true, autoDelete: true },
        };
        vhost.subscriptions[`${REPLY_QUEUE_NAME}_subscription`] = {
            queue: REPLY_QUEUE_NAME,
            options: { prefetch: 1 },
        };
        vhost.publications["rpc_reply"] = {
            exchange: "",
            routingKey: "{{replyTo}}",
            options: { persistent: false },
        };

        // --- Outbound tap infrastructure ---
        // Bind the tap queue to order-service's fanout outbound exchange.
        // order-service creates order-service_outbound via withOutboundExchange("order-service").
        vhost.exchanges[OUTBOUND_EXCHANGE_NAME] = {
            type: "fanout",
            options: { durable: true },
        };
        vhost.queues[TAP_QUEUE_NAME] = {
            options: { autoDelete: true, durable: false, exclusive: true },
        };
        vhost.bindings[`${TAP_QUEUE_NAME}_binding`] = {
            source: OUTBOUND_EXCHANGE_NAME,
            destination: TAP_QUEUE_NAME,
            destinationType: "queue",
            bindingKey: "",
        };
        vhost.subscriptions[TAP_QUEUE_NAME] = {
            queue: TAP_QUEUE_NAME,
        };
    });

    return augmented;
}

export const topology = augmentTopology(topologyWithRpcCalls);
export { TAP_QUEUE_NAME };
