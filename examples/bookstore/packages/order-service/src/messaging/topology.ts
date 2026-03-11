import { buildServiceTopology } from "@apogeelabs/hoppity-contracts";
import { BrokerConfig } from "rascal";
import { OrdersDomain } from "@bookstore/contracts";
import { config } from "../config";

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

export const topology = buildServiceTopology(baseTopology, "order-service", t => {
    t.respondsToRpc(OrdersDomain.rpc.createOrder);
    t.respondsToRpc(OrdersDomain.rpc.getOrderSummary);
    t.handlesCommand(OrdersDomain.commands.cancelOrder);
    t.publishesEvent(OrdersDomain.events.orderCreated);
    t.publishesEvent(OrdersDomain.events.orderCancelled);
});
