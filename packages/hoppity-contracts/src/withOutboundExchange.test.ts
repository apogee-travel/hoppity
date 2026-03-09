/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import { MiddlewareContext } from "@apogeelabs/hoppity";
import { BrokerConfig } from "rascal";

describe("hoppity-contracts > src > withOutboundExchange", () => {
    let withOutboundExchange: any,
        mockLogger: any,
        mockContext: MiddlewareContext,
        result: any,
        expectedErr: any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            silly: jest.fn(),
            critical: jest.fn(),
        };
        mockContext = {
            logger: mockLogger,
            middlewareNames: [],
            data: {},
        };
    });

    describe("with withOutboundExchange", () => {
        beforeEach(async () => {
            const mod = await import("./withOutboundExchange");
            withOutboundExchange = mod.withOutboundExchange;
        });

        describe("when service name is empty string", () => {
            beforeEach(() => {
                try {
                    withOutboundExchange("");
                } catch (err) {
                    expectedErr = err;
                }
            });

            it("should throw an error", () => {
                expect(expectedErr).toEqual(
                    new Error(
                        "withOutboundExchange: serviceName is required and must be a non-empty string"
                    )
                );
            });
        });

        describe("when service name is whitespace", () => {
            beforeEach(() => {
                try {
                    withOutboundExchange("   ");
                } catch (err) {
                    expectedErr = err;
                }
            });

            it("should throw an error", () => {
                expect(expectedErr).toEqual(
                    new Error(
                        "withOutboundExchange: serviceName is required and must be a non-empty string"
                    )
                );
            });
        });

        describe("when topology has two publications targeting different exchanges", () => {
            let topology: BrokerConfig;

            beforeEach(() => {
                topology = {
                    vhosts: {
                        "/": {
                            exchanges: {
                                donated_inventory: { type: "topic", options: { durable: true } },
                                pricing: { type: "topic", options: { durable: true } },
                            },
                            queues: {},
                            bindings: {},
                            publications: {
                                donated_inventory_event_created: {
                                    exchange: "donated_inventory",
                                    routingKey: "donated_inventory.event.created",
                                },
                                pricing_event_updated: {
                                    exchange: "pricing",
                                    routingKey: "pricing.event.updated",
                                },
                            },
                            subscriptions: {},
                        },
                    },
                };
                const middleware = withOutboundExchange("warehouse");
                result = middleware(topology, mockContext);
            });

            it("should create the outbound fanout exchange", () => {
                expect(
                    (result.topology.vhosts as any)["/"].exchanges["warehouse_outbound"]
                ).toEqual({
                    type: "fanout",
                    options: { durable: true },
                });
            });

            it("should create a binding from outbound to donated_inventory exchange", () => {
                expect(
                    (result.topology.vhosts as any)["/"].bindings[
                        "warehouse_outbound_to_donated_inventory_binding"
                    ]
                ).toEqual({
                    source: "warehouse_outbound",
                    destination: "donated_inventory",
                    destinationType: "exchange",
                    bindingKey: "#",
                });
            });

            it("should create a binding from outbound to pricing exchange", () => {
                expect(
                    (result.topology.vhosts as any)["/"].bindings[
                        "warehouse_outbound_to_pricing_binding"
                    ]
                ).toEqual({
                    source: "warehouse_outbound",
                    destination: "pricing",
                    destinationType: "exchange",
                    bindingKey: "#",
                });
            });

            it("should rewrite the donated_inventory publication to target outbound", () => {
                expect(
                    (result.topology.vhosts as any)["/"].publications[
                        "donated_inventory_event_created"
                    ].exchange
                ).toBe("warehouse_outbound");
            });

            it("should preserve the routing key on the rewritten publication", () => {
                expect(
                    (result.topology.vhosts as any)["/"].publications[
                        "donated_inventory_event_created"
                    ].routingKey
                ).toBe("donated_inventory.event.created");
            });

            it("should rewrite the pricing publication to target outbound", () => {
                expect(
                    (result.topology.vhosts as any)["/"].publications["pricing_event_updated"]
                        .exchange
                ).toBe("warehouse_outbound");
            });
        });

        describe("when topology has two publications targeting the same exchange", () => {
            let topology: BrokerConfig;

            beforeEach(() => {
                topology = {
                    vhosts: {
                        "/": {
                            exchanges: {
                                donated_inventory: { type: "topic", options: { durable: true } },
                            },
                            queues: {},
                            bindings: {},
                            publications: {
                                donated_inventory_event_created: {
                                    exchange: "donated_inventory",
                                    routingKey: "donated_inventory.event.created",
                                },
                                donated_inventory_event_updated: {
                                    exchange: "donated_inventory",
                                    routingKey: "donated_inventory.event.updated",
                                },
                            },
                            subscriptions: {},
                        },
                    },
                };
                const middleware = withOutboundExchange("warehouse");
                result = middleware(topology, mockContext);
            });

            it("should create only one binding (deduplication)", () => {
                const bindings = (result.topology.vhosts as any)["/"].bindings;
                const outboundBindings = Object.keys(bindings).filter(k =>
                    k.startsWith("warehouse_outbound_to_")
                );
                expect(outboundBindings).toHaveLength(1);
            });
        });

        describe("when publications object is empty", () => {
            let topology: BrokerConfig;

            beforeEach(() => {
                topology = {
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
                const middleware = withOutboundExchange("warehouse");
                result = middleware(topology, mockContext);
            });

            it("should still create the outbound exchange", () => {
                expect(
                    (result.topology.vhosts as any)["/"].exchanges["warehouse_outbound"]
                ).toEqual({
                    type: "fanout",
                    options: { durable: true },
                });
            });

            it("should not create any exchange-to-exchange bindings", () => {
                const bindings = (result.topology.vhosts as any)["/"].bindings;
                const outboundBindings = Object.keys(bindings).filter(k =>
                    k.startsWith("warehouse_outbound_to_")
                );
                expect(outboundBindings).toHaveLength(0);
            });
        });

        describe("when topology is applied", () => {
            let originalTopology: BrokerConfig;

            beforeEach(() => {
                originalTopology = {
                    vhosts: {
                        "/": {
                            exchanges: {},
                            queues: {},
                            bindings: {},
                            publications: {
                                donated_inventory_event_created: {
                                    exchange: "donated_inventory",
                                    routingKey: "donated_inventory.event.created",
                                },
                            },
                            subscriptions: {},
                        },
                    },
                };
                const middleware = withOutboundExchange("warehouse");
                result = middleware(originalTopology, mockContext);
            });

            it("should not mutate the original topology", () => {
                expect(
                    (originalTopology.vhosts as any)["/"].publications[
                        "donated_inventory_event_created"
                    ].exchange
                ).toBe("donated_inventory");
            });

            it("should return a different object reference than the input", () => {
                expect(result.topology).not.toBe(originalTopology);
            });
        });

        describe("when middleware executes successfully", () => {
            beforeEach(() => {
                const topology: BrokerConfig = {
                    vhosts: {
                        "/": {
                            exchanges: {},
                            queues: {},
                            bindings: {},
                            publications: {
                                my_event: {
                                    exchange: "my_domain",
                                    routingKey: "my_domain.event.created",
                                },
                            },
                            subscriptions: {},
                        },
                    },
                };
                const middleware = withOutboundExchange("my_service");
                result = middleware(topology, mockContext);
            });

            it("should store the outbound exchange name in context.data", () => {
                expect(mockContext.data.outboundExchange).toBe("my_service_outbound");
            });

            it("should return a topology property", () => {
                expect(result).toHaveProperty("topology");
            });

            it("should not return an onBrokerCreated callback", () => {
                expect(result.onBrokerCreated).toBeUndefined();
            });
        });

        describe("when topology has no vhosts key", () => {
            let originalTopology: BrokerConfig;

            beforeEach(() => {
                originalTopology = {};
                const middleware = withOutboundExchange("warehouse");
                result = middleware(originalTopology, mockContext);
            });

            it("should return a topology with an empty vhosts object", () => {
                expect(result.topology.vhosts).toEqual({});
            });

            it("should not mutate the original topology", () => {
                expect(originalTopology.vhosts).toBeUndefined();
            });
        });

        describe("when a publication has no exchange property", () => {
            let topology: BrokerConfig;

            beforeEach(() => {
                topology = {
                    vhosts: {
                        "/": {
                            exchanges: {},
                            bindings: {},
                            publications: {
                                default_exchange_pub: {
                                    routingKey: "some.queue.name",
                                },
                            },
                        },
                    },
                };
                const middleware = withOutboundExchange("warehouse");
                result = middleware(topology, mockContext);
            });

            it("should not create any exchange-to-exchange bindings", () => {
                const bindings = (result.topology.vhosts as any)["/"].bindings;
                const outboundBindings = Object.keys(bindings).filter(k =>
                    k.startsWith("warehouse_outbound_to_")
                );
                expect(outboundBindings).toHaveLength(0);
            });

            it("should not rewrite the exchangeless publication", () => {
                expect(
                    (result.topology.vhosts as any)["/"].publications["default_exchange_pub"]
                        .exchange
                ).toBeUndefined();
            });

            it("should still create the outbound exchange", () => {
                expect(
                    (result.topology.vhosts as any)["/"].exchanges["warehouse_outbound"]
                ).toEqual({
                    type: "fanout",
                    options: { durable: true },
                });
            });
        });

        describe("when a publication already targets the outbound exchange", () => {
            let topology: BrokerConfig;

            beforeEach(() => {
                topology = {
                    vhosts: {
                        "/": {
                            exchanges: {
                                warehouse_outbound: { type: "fanout", options: { durable: true } },
                            },
                            bindings: {},
                            publications: {
                                already_outbound_pub: {
                                    exchange: "warehouse_outbound",
                                    routingKey: "inventory.event.created",
                                },
                            },
                        },
                    },
                };
                const middleware = withOutboundExchange("warehouse");
                result = middleware(topology, mockContext);
            });

            it("should not create a binding from the outbound to itself", () => {
                const bindings = (result.topology.vhosts as any)["/"].bindings;
                const selfBindings = Object.keys(bindings).filter(k =>
                    k.includes("warehouse_outbound_to_warehouse_outbound")
                );
                expect(selfBindings).toHaveLength(0);
            });

            it("should not rewrite the publication exchange", () => {
                expect(
                    (result.topology.vhosts as any)["/"].publications["already_outbound_pub"]
                        .exchange
                ).toBe("warehouse_outbound");
            });
        });

        describe("when topology has multiple vhosts", () => {
            let topology: BrokerConfig;

            beforeEach(() => {
                topology = {
                    vhosts: {
                        "/": {
                            exchanges: {},
                            bindings: {},
                            publications: {
                                prod_event: {
                                    exchange: "gifting",
                                    routingKey: "gifting.event.created",
                                },
                            },
                        },
                        staging: {
                            exchanges: {},
                            bindings: {},
                            publications: {
                                staging_event: {
                                    exchange: "gifting",
                                    routingKey: "gifting.event.created",
                                },
                            },
                        },
                    },
                };
                const middleware = withOutboundExchange("gifting_processor");
                result = middleware(topology, mockContext);
            });

            it("should create the outbound exchange in the first vhost", () => {
                expect(
                    (result.topology.vhosts as any)["/"].exchanges["gifting_processor_outbound"]
                ).toEqual({
                    type: "fanout",
                    options: { durable: true },
                });
            });

            it("should create the outbound exchange in the second vhost", () => {
                expect(
                    (result.topology.vhosts as any)["staging"].exchanges[
                        "gifting_processor_outbound"
                    ]
                ).toEqual({
                    type: "fanout",
                    options: { durable: true },
                });
            });

            it("should rewrite the publication in the first vhost", () => {
                expect(
                    (result.topology.vhosts as any)["/"].publications["prod_event"].exchange
                ).toBe("gifting_processor_outbound");
            });

            it("should rewrite the publication in the second vhost", () => {
                expect(
                    (result.topology.vhosts as any)["staging"].publications["staging_event"]
                        .exchange
                ).toBe("gifting_processor_outbound");
            });
        });

        describe("when a vhost has no publications key", () => {
            let topology: BrokerConfig;

            beforeEach(() => {
                topology = {
                    vhosts: {
                        "/": {
                            exchanges: {},
                            bindings: {},
                        },
                    },
                };
                const middleware = withOutboundExchange("storefront");
                result = middleware(topology, mockContext);
            });

            it("should create the outbound exchange", () => {
                expect(
                    (result.topology.vhosts as any)["/"].exchanges["storefront_outbound"]
                ).toEqual({
                    type: "fanout",
                    options: { durable: true },
                });
            });

            it("should initialize an empty publications collection", () => {
                expect((result.topology.vhosts as any)["/"].publications).toEqual({});
            });

            it("should not create any exchange-to-exchange bindings", () => {
                const bindings = (result.topology.vhosts as any)["/"].bindings;
                const outboundBindings = Object.keys(bindings).filter(k =>
                    k.startsWith("storefront_outbound_to_")
                );
                expect(outboundBindings).toHaveLength(0);
            });
        });
    });
});
