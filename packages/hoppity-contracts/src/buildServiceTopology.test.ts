/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import { z } from "zod";
import { BrokerConfig } from "rascal";
import { buildServiceTopology } from "./buildServiceTopology";
import { defineDomain } from "./defineDomain";

describe("hoppity-contracts > src > buildServiceTopology", () => {
    let BASE_TOPOLOGY: BrokerConfig;
    let DonatedInventory: ReturnType<typeof defineDomain>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        DonatedInventory = defineDomain("donated_inventory", {
            events: { created: z.object({ id: z.string() }) },
            commands: { reserveItem: z.object({ itemId: z.string() }) },
            rpc: {
                getQuote: {
                    request: z.object({ itemId: z.string() }),
                    response: z.object({ price: z.number() }),
                },
            },
        });
        BASE_TOPOLOGY = {
            vhosts: {
                "/": {
                    exchanges: {},
                    queues: {},
                    bindings: {},
                    publications: {},
                    subscriptions: {},
                },
            },
        };
    });

    describe("buildServiceTopology", () => {
        describe("when service name is empty string", () => {
            let expectedErr: any;

            beforeEach(() => {
                try {
                    buildServiceTopology(BASE_TOPOLOGY, "", () => {});
                } catch (err) {
                    expectedErr = err;
                }
            });

            it("should throw an error", () => {
                expect(expectedErr).toEqual(
                    new Error(
                        "buildServiceTopology: serviceName is required and must be a non-empty string"
                    )
                );
            });
        });

        describe("when service name is whitespace", () => {
            let expectedErr: any;

            beforeEach(() => {
                try {
                    buildServiceTopology(BASE_TOPOLOGY, "   ", () => {});
                } catch (err) {
                    expectedErr = err;
                }
            });

            it("should throw an error", () => {
                expect(expectedErr).toEqual(
                    new Error(
                        "buildServiceTopology: serviceName is required and must be a non-empty string"
                    )
                );
            });
        });

        describe("when a single publishesEvent is declared", () => {
            let result: BrokerConfig;

            beforeEach(() => {
                result = buildServiceTopology(BASE_TOPOLOGY, "warehouse", t => {
                    t.publishesEvent(DonatedInventory.events.created);
                });
            });

            it("should add the domain exchange to the vhost", () => {
                expect((result.vhosts as any)["/"].exchanges["donated_inventory"]).toEqual({
                    type: "topic",
                    options: { durable: true },
                });
            });

            it("should add the publication to the vhost", () => {
                expect(
                    (result.vhosts as any)["/"].publications["donated_inventory_event_created"]
                ).toEqual({
                    exchange: "donated_inventory",
                    routingKey: "donated_inventory.event.created",
                });
            });

            it("should not add any queues", () => {
                expect(Object.keys((result.vhosts as any)["/"].queues)).toHaveLength(0);
            });
        });

        describe("when a single subscribesToEvent is declared with default options", () => {
            let result: BrokerConfig;

            beforeEach(() => {
                result = buildServiceTopology(BASE_TOPOLOGY, "warehouse", t => {
                    t.subscribesToEvent(DonatedInventory.events.created);
                });
            });

            it("should add the domain exchange", () => {
                expect((result.vhosts as any)["/"].exchanges["donated_inventory"]).toEqual({
                    type: "topic",
                    options: { durable: true },
                });
            });

            it("should add the queue with quorum defaults", () => {
                expect(
                    (result.vhosts as any)["/"].queues["warehouse_donated_inventory_event_created"]
                ).toEqual({
                    options: {
                        durable: true,
                        arguments: { "x-queue-type": "quorum" },
                    },
                });
            });

            it("should add the binding with correct source, destination, and routing key", () => {
                expect(
                    (result.vhosts as any)["/"].bindings[
                        "warehouse_donated_inventory_event_created_binding"
                    ]
                ).toEqual({
                    source: "donated_inventory",
                    destination: "warehouse_donated_inventory_event_created",
                    destinationType: "queue",
                    bindingKey: "donated_inventory.event.created",
                });
            });

            it("should add the subscription with default redeliveries", () => {
                expect(
                    (result.vhosts as any)["/"].subscriptions["donated_inventory_event_created"]
                ).toEqual({
                    queue: "warehouse_donated_inventory_event_created",
                    redeliveries: { limit: 5 },
                });
            });
        });

        describe("when a sendsCommand is declared", () => {
            let result: BrokerConfig;

            beforeEach(() => {
                result = buildServiceTopology(BASE_TOPOLOGY, "warehouse", t => {
                    t.sendsCommand(DonatedInventory.commands.reserveItem);
                });
            });

            it("should add the domain exchange", () => {
                expect((result.vhosts as any)["/"].exchanges["donated_inventory"]).toEqual({
                    type: "topic",
                    options: { durable: true },
                });
            });

            it("should add the publication with correct exchange and routing key", () => {
                expect(
                    (result.vhosts as any)["/"].publications[
                        "donated_inventory_command_reserve_item"
                    ]
                ).toEqual({
                    exchange: "donated_inventory",
                    routingKey: "donated_inventory.command.reserve_item",
                });
            });
        });

        describe("when a handlesCommand is declared with default options", () => {
            let result: BrokerConfig;

            beforeEach(() => {
                result = buildServiceTopology(BASE_TOPOLOGY, "fulfillment", t => {
                    t.handlesCommand(DonatedInventory.commands.reserveItem);
                });
            });

            it("should add the domain exchange", () => {
                expect((result.vhosts as any)["/"].exchanges["donated_inventory"]).toEqual({
                    type: "topic",
                    options: { durable: true },
                });
            });

            it("should add the queue", () => {
                expect(
                    (result.vhosts as any)["/"].queues[
                        "fulfillment_donated_inventory_command_reserve_item"
                    ]
                ).toEqual({
                    options: {
                        durable: true,
                        arguments: { "x-queue-type": "quorum" },
                    },
                });
            });

            it("should add the binding", () => {
                expect(
                    (result.vhosts as any)["/"].bindings[
                        "fulfillment_donated_inventory_command_reserve_item_binding"
                    ]
                ).toEqual({
                    source: "donated_inventory",
                    destination: "fulfillment_donated_inventory_command_reserve_item",
                    destinationType: "queue",
                    bindingKey: "donated_inventory.command.reserve_item",
                });
            });

            it("should add the subscription with default redeliveries", () => {
                expect(
                    (result.vhosts as any)["/"].subscriptions[
                        "donated_inventory_command_reserve_item"
                    ]
                ).toEqual({
                    queue: "fulfillment_donated_inventory_command_reserve_item",
                    redeliveries: { limit: 5 },
                });
            });
        });

        describe("when a callsRpc is declared", () => {
            let result: BrokerConfig;

            beforeEach(() => {
                result = buildServiceTopology(BASE_TOPOLOGY, "storefront", t => {
                    t.callsRpc(DonatedInventory.rpc.getQuote);
                });
            });

            it("should add the RPC exchange with _rpc suffix", () => {
                expect((result.vhosts as any)["/"].exchanges["donated_inventory_rpc"]).toEqual({
                    type: "topic",
                    options: { durable: true },
                });
            });

            it("should add the publication targeting the RPC exchange", () => {
                expect(
                    (result.vhosts as any)["/"].publications["donated_inventory_rpc_get_quote"]
                ).toEqual({
                    exchange: "donated_inventory_rpc",
                    routingKey: "donated_inventory.rpc.get_quote",
                });
            });

            it("should not add any queues", () => {
                expect(Object.keys((result.vhosts as any)["/"].queues)).toHaveLength(0);
            });
        });

        describe("when a respondsToRpc is declared with default options", () => {
            let result: BrokerConfig;

            beforeEach(() => {
                result = buildServiceTopology(BASE_TOPOLOGY, "pricing_service", t => {
                    t.respondsToRpc(DonatedInventory.rpc.getQuote);
                });
            });

            it("should add the RPC exchange", () => {
                expect((result.vhosts as any)["/"].exchanges["donated_inventory_rpc"]).toEqual({
                    type: "topic",
                    options: { durable: true },
                });
            });

            it("should add the request queue", () => {
                expect(
                    (result.vhosts as any)["/"].queues[
                        "pricing_service_donated_inventory_rpc_get_quote"
                    ]
                ).toEqual({
                    options: {
                        durable: true,
                        arguments: { "x-queue-type": "quorum" },
                    },
                });
            });

            it("should add the binding from rpc exchange to request queue", () => {
                expect(
                    (result.vhosts as any)["/"].bindings[
                        "pricing_service_donated_inventory_rpc_get_quote_binding"
                    ]
                ).toEqual({
                    source: "donated_inventory_rpc",
                    destination: "pricing_service_donated_inventory_rpc_get_quote",
                    destinationType: "queue",
                    bindingKey: "donated_inventory.rpc.get_quote",
                });
            });

            it("should add the subscription", () => {
                expect(
                    (result.vhosts as any)["/"].subscriptions["donated_inventory_rpc_get_quote"]
                ).toEqual({
                    queue: "pricing_service_donated_inventory_rpc_get_quote",
                    redeliveries: { limit: 5 },
                });
            });
        });

        describe("when handler options override redeliveries", () => {
            let result: BrokerConfig;

            beforeEach(() => {
                result = buildServiceTopology(BASE_TOPOLOGY, "warehouse", t => {
                    t.subscribesToEvent(DonatedInventory.events.created, {
                        redeliveries: { limit: 3 },
                    });
                });
            });

            it("should use the provided redelivery limit on the subscription", () => {
                expect(
                    (result.vhosts as any)["/"].subscriptions["donated_inventory_event_created"]
                        .redeliveries
                ).toEqual({ limit: 3 });
            });
        });

        describe("when handler options override queue type to classic", () => {
            let result: BrokerConfig;

            beforeEach(() => {
                result = buildServiceTopology(BASE_TOPOLOGY, "warehouse", t => {
                    t.subscribesToEvent(DonatedInventory.events.created, {
                        queueType: "classic",
                    });
                });
            });

            it("should use the classic queue type in queue arguments", () => {
                expect(
                    (result.vhosts as any)["/"].queues["warehouse_donated_inventory_event_created"]
                        .options.arguments["x-queue-type"]
                ).toBe("classic");
            });
        });

        describe("when handler options include a dead-letter exchange", () => {
            let result: BrokerConfig;

            beforeEach(() => {
                result = buildServiceTopology(BASE_TOPOLOGY, "warehouse", t => {
                    t.subscribesToEvent(DonatedInventory.events.created, {
                        deadLetter: { exchange: "dead_letters", routingKey: "failed" },
                    });
                });
            });

            it("should include dead-letter exchange in queue arguments", () => {
                const queueArgs = (result.vhosts as any)["/"].queues[
                    "warehouse_donated_inventory_event_created"
                ].options.arguments;
                expect(queueArgs["x-dead-letter-exchange"]).toBe("dead_letters");
            });

            it("should include dead-letter routing key in queue arguments", () => {
                const queueArgs = (result.vhosts as any)["/"].queues[
                    "warehouse_donated_inventory_event_created"
                ].options.arguments;
                expect(queueArgs["x-dead-letter-routing-key"]).toBe("failed");
            });
        });

        describe("when topology already has existing artifacts", () => {
            let result: BrokerConfig;
            let initialTopology: BrokerConfig;

            beforeEach(() => {
                initialTopology = {
                    vhosts: {
                        "/": {
                            exchanges: { existing_exchange: { type: "direct" } },
                            queues: { existing_queue: { options: {} } },
                            bindings: {},
                            publications: {},
                            subscriptions: {},
                        },
                    },
                };
                result = buildServiceTopology(initialTopology, "warehouse", t => {
                    t.subscribesToEvent(DonatedInventory.events.created);
                });
            });

            it("should preserve the existing exchange", () => {
                expect((result.vhosts as any)["/"].exchanges["existing_exchange"]).toEqual({
                    type: "direct",
                });
            });

            it("should preserve the existing queue", () => {
                expect((result.vhosts as any)["/"].queues["existing_queue"]).toEqual({
                    options: {},
                });
            });

            it("should still add the new domain exchange", () => {
                expect((result.vhosts as any)["/"].exchanges["donated_inventory"]).toBeDefined();
            });
        });

        describe("when the original topology is passed in", () => {
            let result: BrokerConfig;
            let originalTopology: BrokerConfig;

            beforeEach(() => {
                originalTopology = structuredClone(BASE_TOPOLOGY);
                result = buildServiceTopology(originalTopology, "warehouse", t => {
                    t.publishesEvent(DonatedInventory.events.created);
                });
            });

            it("should not mutate the original topology", () => {
                expect(Object.keys((originalTopology.vhosts as any)["/"].exchanges)).toHaveLength(
                    0
                );
            });

            it("should return a different object reference than the input", () => {
                expect(result).not.toBe(originalTopology);
            });
        });

        describe("when the vhost has no pre-existing collections", () => {
            let result: BrokerConfig;

            beforeEach(() => {
                const sparseTopology: BrokerConfig = {
                    vhosts: { "/": {} },
                };
                result = buildServiceTopology(sparseTopology, "warehouse", t => {
                    t.subscribesToEvent(DonatedInventory.events.created);
                });
            });

            it("should create exchanges on the vhost", () => {
                expect((result.vhosts as any)["/"].exchanges).toBeDefined();
                expect((result.vhosts as any)["/"].exchanges["donated_inventory"]).toBeDefined();
            });

            it("should create queues on the vhost", () => {
                expect((result.vhosts as any)["/"].queues).toBeDefined();
                expect(
                    (result.vhosts as any)["/"].queues["warehouse_donated_inventory_event_created"]
                ).toBeDefined();
            });
        });

        describe("when topology has no vhosts key", () => {
            let result: BrokerConfig, emptyInput: BrokerConfig;

            beforeEach(() => {
                emptyInput = {};
                result = buildServiceTopology(emptyInput, "warehouse", t => {
                    t.publishesEvent(DonatedInventory.events.created);
                });
            });

            it("should return a cloned topology with no artifacts added", () => {
                expect(result).toEqual({});
            });

            it("should return a different object reference than the input", () => {
                expect(result).not.toBe(emptyInput);
            });
        });

        describe("when dead-letter exchange is specified without a routing key", () => {
            let result: BrokerConfig;

            beforeEach(() => {
                result = buildServiceTopology(BASE_TOPOLOGY, "fulfillment", t => {
                    t.handlesCommand(DonatedInventory.commands.reserveItem, {
                        deadLetter: { exchange: "dead_letters" },
                    });
                });
            });

            it("should include the dead-letter exchange in queue arguments", () => {
                const queueArgs = (result.vhosts as any)["/"].queues[
                    "fulfillment_donated_inventory_command_reserve_item"
                ].options.arguments;
                expect(queueArgs["x-dead-letter-exchange"]).toBe("dead_letters");
            });

            it("should not include a dead-letter routing key in queue arguments", () => {
                const queueArgs = (result.vhosts as any)["/"].queues[
                    "fulfillment_donated_inventory_command_reserve_item"
                ].options.arguments;
                expect(queueArgs["x-dead-letter-routing-key"]).toBeUndefined();
            });
        });

        describe("when topology has multiple vhosts", () => {
            let result: BrokerConfig, multiVhostTopology: BrokerConfig;

            beforeEach(() => {
                multiVhostTopology = {
                    vhosts: {
                        "/": {
                            exchanges: {},
                            queues: {},
                            bindings: {},
                            publications: {},
                            subscriptions: {},
                        },
                        staging: {
                            exchanges: {},
                            queues: {},
                            bindings: {},
                            publications: {},
                            subscriptions: {},
                        },
                    },
                };
                result = buildServiceTopology(multiVhostTopology, "warehouse", t => {
                    t.publishesEvent(DonatedInventory.events.created);
                });
            });

            it("should add the exchange to the first vhost", () => {
                expect((result.vhosts as any)["/"].exchanges["donated_inventory"]).toBeDefined();
            });

            it("should add the exchange to the second vhost", () => {
                expect(
                    (result.vhosts as any)["staging"].exchanges["donated_inventory"]
                ).toBeDefined();
            });

            it("should add the publication to the first vhost", () => {
                expect(
                    (result.vhosts as any)["/"].publications["donated_inventory_event_created"]
                ).toBeDefined();
            });

            it("should add the publication to the second vhost", () => {
                expect(
                    (result.vhosts as any)["staging"].publications[
                        "donated_inventory_event_created"
                    ]
                ).toBeDefined();
            });
        });

        describe("when the same contract is declared for both publishesEvent and subscribesToEvent", () => {
            let result: BrokerConfig;

            beforeEach(() => {
                result = buildServiceTopology(BASE_TOPOLOGY, "warehouse", t => {
                    t.publishesEvent(DonatedInventory.events.created);
                    t.subscribesToEvent(DonatedInventory.events.created);
                });
            });

            it("should create the domain exchange", () => {
                expect((result.vhosts as any)["/"].exchanges["donated_inventory"]).toEqual({
                    type: "topic",
                    options: { durable: true },
                });
            });

            it("should create the publication", () => {
                expect(
                    (result.vhosts as any)["/"].publications["donated_inventory_event_created"]
                ).toBeDefined();
            });

            it("should create the queue", () => {
                expect(
                    (result.vhosts as any)["/"].queues["warehouse_donated_inventory_event_created"]
                ).toBeDefined();
            });

            it("should create the subscription", () => {
                expect(
                    (result.vhosts as any)["/"].subscriptions["donated_inventory_event_created"]
                ).toBeDefined();
            });
        });
    });
});
