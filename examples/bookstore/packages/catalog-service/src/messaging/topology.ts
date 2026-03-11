import { buildServiceTopology } from "@apogeelabs/hoppity-contracts";
import { BrokerConfig } from "rascal";
import { OrdersDomain, CatalogDomain } from "@bookstore/contracts";
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

export const topology = buildServiceTopology(baseTopology, "catalog-service", t => {
    t.subscribesToEvent(OrdersDomain.events.orderCreated);
    t.subscribesToEvent(OrdersDomain.events.orderCancelled);
    t.respondsToRpc(CatalogDomain.rpc.getStockLevels);
});
