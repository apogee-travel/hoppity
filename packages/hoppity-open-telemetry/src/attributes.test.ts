/* eslint-disable @typescript-eslint/no-explicit-any */
export default {};

import type { InboundMetadata, OutboundMetadata } from "@apogeelabs/hoppity";
import { buildInboundAttributes, buildOutboundAttributes } from "./attributes";

const MOCK_EVENT_CONTRACT = {
    _type: "event" as const,
    _domain: "orders",
    _name: "orderCreated",
    exchange: "orders_exchange",
    routingKey: "orders.event.order_created",
    publicationName: "orders_event_order_created",
    subscriptionName: "orders_event_order_created",
    schema: {} as any,
};

const MOCK_INBOUND_META: InboundMetadata = {
    contract: MOCK_EVENT_CONTRACT,
    kind: "event",
    serviceName: "order-service",
    message: { headers: {}, properties: {} },
};

const MOCK_OUTBOUND_META: OutboundMetadata = {
    contract: MOCK_EVENT_CONTRACT,
    kind: "event",
    serviceName: "order-service",
};

describe("attributes", () => {
    describe("buildInboundAttributes", () => {
        describe("when building attributes for an inbound handler", () => {
            let result: ReturnType<typeof buildInboundAttributes>;

            beforeEach(() => {
                result = buildInboundAttributes(MOCK_INBOUND_META);
            });

            it("should set messaging.system to rabbitmq", () => {
                expect(result["messaging.system"]).toBe("rabbitmq");
            });

            it("should set messaging.operation.type to receive", () => {
                expect(result["messaging.operation.type"]).toBe("receive");
            });

            it("should set messaging.destination.name from contract exchange", () => {
                expect(result["messaging.destination.name"]).toBe("orders_exchange");
            });

            it("should set hoppity.domain from contract _domain", () => {
                expect(result["hoppity.domain"]).toBe("orders");
            });

            it("should set hoppity.operation from contract _name", () => {
                expect(result["hoppity.operation"]).toBe("orderCreated");
            });

            it("should set hoppity.kind from meta kind", () => {
                expect(result["hoppity.kind"]).toBe("event");
            });

            it("should set service.name from meta serviceName", () => {
                expect(result["service.name"]).toBe("order-service");
            });
        });
    });

    describe("buildOutboundAttributes", () => {
        describe("when building attributes for an outbound publish", () => {
            let result: ReturnType<typeof buildOutboundAttributes>;

            beforeEach(() => {
                result = buildOutboundAttributes(MOCK_OUTBOUND_META);
            });

            it("should set messaging.operation.type to publish", () => {
                expect(result["messaging.operation.type"]).toBe("publish");
            });

            it("should set messaging.destination.name from contract exchange", () => {
                expect(result["messaging.destination.name"]).toBe("orders_exchange");
            });

            it("should include all expected attribute keys", () => {
                expect(result).toEqual({
                    "messaging.system": "rabbitmq",
                    "messaging.operation.type": "publish",
                    "messaging.destination.name": "orders_exchange",
                    "hoppity.domain": "orders",
                    "hoppity.operation": "orderCreated",
                    "hoppity.kind": "event",
                    "service.name": "order-service",
                });
            });
        });
    });
});
