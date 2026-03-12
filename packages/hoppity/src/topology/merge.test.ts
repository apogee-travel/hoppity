/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import { mergeTopology } from "./merge";
import { BrokerConfig } from "rascal";

describe("hoppity > topology > mergeTopology", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    describe("when rawTopology is undefined", () => {
        let result: BrokerConfig;
        const derived: BrokerConfig = {
            vhosts: { "/": { exchanges: { grub: { type: "topic" } } } },
        };

        beforeEach(() => {
            result = mergeTopology(undefined, derived);
        });

        it("should return the derived topology as-is", () => {
            expect(result).toEqual(derived);
        });
    });

    describe("when rawTopology has no vhosts", () => {
        let result: BrokerConfig;
        const derived: BrokerConfig = {
            vhosts: { "/": { exchanges: { grub: { type: "topic" } } } },
        };

        beforeEach(() => {
            result = mergeTopology({}, derived);
        });

        it("should return the derived topology as-is", () => {
            expect(result).toEqual(derived);
        });
    });

    describe("when derivedTopology has no vhosts", () => {
        let result: BrokerConfig;
        const raw: BrokerConfig = {
            vhosts: { "/": { connection: { url: "amqp://localhost" } } },
        };

        beforeEach(() => {
            result = mergeTopology(raw, {});
        });

        it("should return a clone of the raw topology", () => {
            expect(result).toEqual(raw);
        });
    });

    describe("when raw and derived have the same vhost", () => {
        let result: any;
        const raw: BrokerConfig = {
            vhosts: {
                "/bookstore": {
                    connection: { url: "amqp://localhost" },
                    exchanges: { "legacy-exchange": { type: "direct" } },
                    publications: { legacy_pub: { exchange: "legacy-exchange" } },
                },
            },
        };
        const derived: BrokerConfig = {
            vhosts: {
                "/bookstore": {
                    exchanges: { orders: { type: "topic", options: { durable: true } } },
                    queues: { "order-service_orders_event_order_created": {} },
                    publications: { orders_event_order_created: { exchange: "orders" } },
                    subscriptions: { orders_event_order_created: { queue: "q1" } },
                    bindings: {
                        "order-service_orders_event_order_created_binding": {
                            source: "orders",
                        },
                    },
                },
            },
        };

        beforeEach(() => {
            result = mergeTopology(raw, derived);
        });

        it("should preserve the raw connection config", () => {
            expect(result.vhosts["/bookstore"].connection).toEqual({ url: "amqp://localhost" });
        });

        it("should contain raw exchanges", () => {
            expect(result.vhosts["/bookstore"].exchanges["legacy-exchange"]).toEqual({
                type: "direct",
            });
        });

        it("should contain derived exchanges", () => {
            expect(result.vhosts["/bookstore"].exchanges["orders"]).toEqual({
                type: "topic",
                options: { durable: true },
            });
        });

        it("should contain raw publications", () => {
            expect(result.vhosts["/bookstore"].publications["legacy_pub"]).toEqual({
                exchange: "legacy-exchange",
            });
        });

        it("should contain derived publications", () => {
            expect(result.vhosts["/bookstore"].publications["orders_event_order_created"]).toEqual({
                exchange: "orders",
            });
        });

        it("should contain the derived queue", () => {
            expect(
                result.vhosts["/bookstore"].queues["order-service_orders_event_order_created"]
            ).toBeDefined();
        });

        it("should contain the derived subscription", () => {
            expect(
                result.vhosts["/bookstore"].subscriptions["orders_event_order_created"]
            ).toBeDefined();
        });

        it("should contain the derived binding", () => {
            expect(
                result.vhosts["/bookstore"].bindings[
                    "order-service_orders_event_order_created_binding"
                ]
            ).toBeDefined();
        });
    });

    describe("when derived has a vhost not present in raw", () => {
        let result: any;
        const raw: BrokerConfig = {
            vhosts: { "/existing": { connection: { url: "amqp://localhost" } } },
        };
        const derived: BrokerConfig = {
            vhosts: {
                "/new": { exchanges: { catalog: { type: "topic" } } },
            },
        };

        beforeEach(() => {
            result = mergeTopology(raw, derived);
        });

        it("should add the new vhost from derived", () => {
            expect(result.vhosts["/new"]).toBeDefined();
        });

        it("should preserve the existing raw vhost", () => {
            expect(result.vhosts["/existing"]).toBeDefined();
        });
    });

    describe("when derived key collides with raw key", () => {
        let result: any;
        const raw: BrokerConfig = {
            vhosts: {
                "/": {
                    exchanges: { orders: { type: "direct" } },
                },
            },
        };
        const derived: BrokerConfig = {
            vhosts: {
                "/": {
                    exchanges: { orders: { type: "topic", options: { durable: true } } },
                },
            },
        };

        beforeEach(() => {
            result = mergeTopology(raw, derived);
        });

        it("should let derived win on collision", () => {
            expect(result.vhosts["/"].exchanges["orders"]).toEqual({
                type: "topic",
                options: { durable: true },
            });
        });
    });

    describe("when raw topology is not mutated", () => {
        const raw: BrokerConfig = {
            vhosts: { "/": { exchanges: { orders: { type: "direct" } } } },
        };
        const derived: BrokerConfig = {
            vhosts: { "/": { queues: { q1: {} } } },
        };

        beforeEach(() => {
            mergeTopology(raw, derived);
        });

        it("should not mutate the raw topology", () => {
            expect((raw.vhosts as any)["/"].queues).toBeUndefined();
        });
    });

    describe("when raw topology has connection info and derived does not", () => {
        let result: any;
        const raw: BrokerConfig = {
            vhosts: {
                "/nachos": {
                    connection: {
                        url: "amqp://nacho-host",
                        options: { heartbeat: 60 },
                    },
                    exchanges: { snacks: { type: "topic" } },
                },
            },
        };
        const derived: BrokerConfig = {
            vhosts: {
                "/nachos": {
                    exchanges: { "snacks-derived": { type: "topic", options: { durable: true } } },
                    queues: { "snack-queue": {} },
                },
            },
        };

        beforeEach(() => {
            result = mergeTopology(raw, derived);
        });

        it("should preserve the raw connection url", () => {
            expect(result.vhosts["/nachos"].connection.url).toBe("amqp://nacho-host");
        });

        it("should preserve the raw connection options", () => {
            expect(result.vhosts["/nachos"].connection.options).toEqual({ heartbeat: 60 });
        });

        it("should include the raw exchange", () => {
            expect(result.vhosts["/nachos"].exchanges["snacks"]).toBeDefined();
        });

        it("should include the derived exchange", () => {
            expect(result.vhosts["/nachos"].exchanges["snacks-derived"]).toBeDefined();
        });

        it("should include the derived queue", () => {
            expect(result.vhosts["/nachos"].queues["snack-queue"]).toBeDefined();
        });
    });

    describe("when raw vhost has no collections at all (bare vhost)", () => {
        let result: any;
        const raw: BrokerConfig = {
            vhosts: {
                "/bare": {
                    connection: { url: "amqp://bare-host" },
                },
            },
        };
        const derived: BrokerConfig = {
            vhosts: {
                "/bare": {
                    exchanges: { "fresh-exchange": { type: "topic" } },
                    subscriptions: { "fresh-sub": { queue: "q1" } },
                },
            },
        };

        beforeEach(() => {
            result = mergeTopology(raw, derived);
        });

        it("should add the derived exchange to the bare vhost", () => {
            expect(result.vhosts["/bare"].exchanges["fresh-exchange"]).toBeDefined();
        });

        it("should add the derived subscription to the bare vhost", () => {
            expect(result.vhosts["/bare"].subscriptions["fresh-sub"]).toBeDefined();
        });

        it("should preserve the raw connection", () => {
            expect(result.vhosts["/bare"].connection.url).toBe("amqp://bare-host");
        });
    });

    describe("when both raw and derived are empty (no vhosts in either)", () => {
        let result: any;

        beforeEach(() => {
            result = mergeTopology({}, {});
        });

        it("should return the derived topology (which is empty)", () => {
            expect(result).toEqual({});
        });
    });
});
