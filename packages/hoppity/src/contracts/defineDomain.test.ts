/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import { z } from "zod";
import { defineDomain } from "./defineDomain";

describe("hoppity > contracts > defineDomain", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    describe("defineDomain", () => {
        describe("when given a domain with one event, one command, one RPC operation (bare schemas)", () => {
            let result: any;
            const orderSchema = z.object({ orderId: z.string(), total: z.number() });
            const cancelSchema = z.object({ orderId: z.string() });
            const createRequestSchema = z.object({ items: z.array(z.string()) });
            const createResponseSchema = z.object({ orderId: z.string() });

            beforeEach(() => {
                result = defineDomain("orders", {
                    events: { orderCreated: orderSchema },
                    commands: { cancelOrder: cancelSchema },
                    rpc: {
                        createOrder: {
                            request: createRequestSchema,
                            response: createResponseSchema,
                        },
                    },
                });
            });

            it("should return the domain name", () => {
                expect(result.domain).toBe("orders");
            });

            it("should assign _type event to the event contract", () => {
                expect(result.events.orderCreated._type).toBe("event");
            });

            it("should assign _domain to the event contract", () => {
                expect(result.events.orderCreated._domain).toBe("orders");
            });

            it("should assign _name to the event contract", () => {
                expect(result.events.orderCreated._name).toBe("orderCreated");
            });

            it("should derive the correct exchange for the event", () => {
                expect(result.events.orderCreated.exchange).toBe("orders");
            });

            it("should derive the correct routing key for the event", () => {
                expect(result.events.orderCreated.routingKey).toBe("orders.event.order_created");
            });

            it("should derive the correct publicationName for the event", () => {
                expect(result.events.orderCreated.publicationName).toBe(
                    "orders_event_order_created"
                );
            });

            it("should derive the correct subscriptionName for the event", () => {
                expect(result.events.orderCreated.subscriptionName).toBe(
                    "orders_event_order_created"
                );
            });

            it("should preserve the event schema on the contract", () => {
                expect(result.events.orderCreated.schema).toBe(orderSchema);
            });

            it("should assign _type command to the command contract", () => {
                expect(result.commands.cancelOrder._type).toBe("command");
            });

            it("should derive the correct routing key for the command", () => {
                expect(result.commands.cancelOrder.routingKey).toBe("orders.command.cancel_order");
            });

            it("should preserve the command schema on the contract", () => {
                expect(result.commands.cancelOrder.schema).toBe(cancelSchema);
            });

            it("should assign _type rpc to the rpc contract", () => {
                expect(result.rpc.createOrder._type).toBe("rpc");
            });

            it("should derive the rpc exchange with _rpc suffix", () => {
                expect(result.rpc.createOrder.exchange).toBe("orders_rpc");
            });

            it("should derive the correct routing key for the rpc operation", () => {
                expect(result.rpc.createOrder.routingKey).toBe("orders.rpc.create_order");
            });

            it("should preserve the request schema on the rpc contract", () => {
                expect(result.rpc.createOrder.requestSchema).toBe(createRequestSchema);
            });

            it("should preserve the response schema on the rpc contract", () => {
                expect(result.rpc.createOrder.responseSchema).toBe(createResponseSchema);
            });
        });

        describe("when given an event using the extended { schema, ...options } form", () => {
            let result: any;
            const rawSchema = z.object({ orderId: z.string() });

            beforeEach(() => {
                result = defineDomain("orders", {
                    events: { orderCreated: { schema: rawSchema, someOption: true } },
                });
            });

            it("should extract the schema from the extended form", () => {
                expect(result.events.orderCreated.schema).toBe(rawSchema);
            });

            it("should still produce the correct _type", () => {
                expect(result.events.orderCreated._type).toBe("event");
            });
        });

        describe("when given a command using the extended { schema, ...options } form", () => {
            let result: any;
            const rawSchema = z.object({ orderId: z.string() });

            beforeEach(() => {
                result = defineDomain("orders", {
                    commands: { cancelOrder: { schema: rawSchema, priority: "high" } },
                });
            });

            it("should extract the schema from the extended form", () => {
                expect(result.commands.cancelOrder.schema).toBe(rawSchema);
            });

            it("should still produce the correct _type", () => {
                expect(result.commands.cancelOrder._type).toBe("command");
            });
        });

        describe("when definition omits events, commands, and rpc entirely", () => {
            let result: any;

            beforeEach(() => {
                result = defineDomain("catalog", {});
            });

            it("should return empty events", () => {
                expect(result.events).toEqual({});
            });

            it("should return empty commands", () => {
                expect(result.commands).toEqual({});
            });

            it("should return empty rpc", () => {
                expect(result.rpc).toEqual({});
            });
        });

        describe("when domain name is empty string", () => {
            let expectedErr: any;

            beforeEach(() => {
                try {
                    defineDomain("", { events: {} });
                } catch (err) {
                    expectedErr = err;
                }
            });

            it("should throw an error", () => {
                expect(expectedErr).toEqual(
                    new Error("defineDomain: domainName is required and must be a non-empty string")
                );
            });
        });

        describe("when domain name is whitespace", () => {
            let expectedErr: any;

            beforeEach(() => {
                try {
                    defineDomain("   ", { events: {} });
                } catch (err) {
                    expectedErr = err;
                }
            });

            it("should throw an error", () => {
                expect(expectedErr).toEqual(
                    new Error("defineDomain: domainName is required and must be a non-empty string")
                );
            });
        });

        describe("when domain has only events (no commands or rpc)", () => {
            let result: any;
            const schema = z.object({ tacoId: z.string() });

            beforeEach(() => {
                result = defineDomain("taco-truck", {
                    events: { tacoReady: schema },
                });
            });

            it("should produce the event contract", () => {
                expect(result.events.tacoReady._type).toBe("event");
            });

            it("should return empty commands object", () => {
                expect(result.commands).toEqual({});
            });

            it("should return empty rpc object", () => {
                expect(result.rpc).toEqual({});
            });
        });

        describe("when domain has only commands (no events or rpc)", () => {
            let result: any;
            const schema = z.object({ orderId: z.string() });

            beforeEach(() => {
                result = defineDomain("drive-through", {
                    commands: { placeOrder: schema },
                });
            });

            it("should produce the command contract", () => {
                expect(result.commands.placeOrder._type).toBe("command");
            });

            it("should return empty events object", () => {
                expect(result.events).toEqual({});
            });

            it("should return empty rpc object", () => {
                expect(result.rpc).toEqual({});
            });
        });

        describe("when domain has only rpc (no events or commands)", () => {
            let result: any;
            const reqSchema = z.object({ size: z.string() });
            const resSchema = z.object({ tacoId: z.string() });

            beforeEach(() => {
                result = defineDomain("taco-rpc", {
                    rpc: {
                        orderTaco: { request: reqSchema, response: resSchema },
                    },
                });
            });

            it("should produce the rpc contract", () => {
                expect(result.rpc.orderTaco._type).toBe("rpc");
            });

            it("should return empty events object", () => {
                expect(result.events).toEqual({});
            });

            it("should return empty commands object", () => {
                expect(result.commands).toEqual({});
            });
        });

        describe("when domain mixes bare schemas and extended form in the same definition", () => {
            let result: any;
            const bareSchema = z.object({ tacoId: z.string() });
            const extendedSchema = z.object({ orderId: z.string() });

            beforeEach(() => {
                result = defineDomain("street-food", {
                    events: {
                        tacoReady: bareSchema,
                        orderConfirmed: { schema: extendedSchema, priority: 1 },
                    },
                    commands: {
                        placeTacoOrder: bareSchema,
                        cancelOrder: { schema: extendedSchema, retries: 3 },
                    },
                });
            });

            it("should extract bare schema from bare-form event", () => {
                expect(result.events.tacoReady.schema).toBe(bareSchema);
            });

            it("should extract schema from extended-form event", () => {
                expect(result.events.orderConfirmed.schema).toBe(extendedSchema);
            });

            it("should produce correct _type for bare-form event", () => {
                expect(result.events.tacoReady._type).toBe("event");
            });

            it("should produce correct _type for extended-form event", () => {
                expect(result.events.orderConfirmed._type).toBe("event");
            });

            it("should extract bare schema from bare-form command", () => {
                expect(result.commands.placeTacoOrder.schema).toBe(bareSchema);
            });

            it("should extract schema from extended-form command", () => {
                expect(result.commands.cancelOrder.schema).toBe(extendedSchema);
            });
        });

        describe("when RPC uses extended { schema: { request, response }, ...options } form", () => {
            let result: any;
            const reqSchema = z.object({ size: z.string() });
            const resSchema = z.object({ tacoId: z.string() });

            beforeEach(() => {
                result = defineDomain("taco-extended-rpc", {
                    rpc: {
                        orderTaco: {
                            schema: { request: reqSchema, response: resSchema },
                            priority: "high",
                        },
                    },
                });
            });

            it("should extract requestSchema from extended RPC form", () => {
                expect(result.rpc.orderTaco.requestSchema).toBe(reqSchema);
            });

            it("should extract responseSchema from extended RPC form", () => {
                expect(result.rpc.orderTaco.responseSchema).toBe(resSchema);
            });

            it("should produce correct _type", () => {
                expect(result.rpc.orderTaco._type).toBe("rpc");
            });
        });

        describe("when an event is declared with delay: true (no default)", () => {
            let result: any;
            const schema = z.object({ sessionId: z.string() });

            beforeEach(() => {
                result = defineDomain("sessions", {
                    events: {
                        sessionExpired: { schema, delay: true },
                    },
                });
            });

            it("should propagate delay: true to the contract", () => {
                expect(result.events.sessionExpired.delay).toBe(true);
            });

            it("should still produce the correct _type", () => {
                expect(result.events.sessionExpired._type).toBe("event");
            });

            it("should still extract the schema", () => {
                expect(result.events.sessionExpired.schema).toBe(schema);
            });
        });

        describe("when an event is declared with delay: { default: 60000 }", () => {
            let result: any;
            const schema = z.object({ orderId: z.string() });

            beforeEach(() => {
                result = defineDomain("orders", {
                    events: {
                        reminderDue: { schema, delay: { default: 60_000 } },
                    },
                });
            });

            it("should propagate delay config with default to the contract", () => {
                expect(result.events.reminderDue.delay).toEqual({ default: 60_000 });
            });

            it("should still produce the correct _type", () => {
                expect(result.events.reminderDue._type).toBe("event");
            });
        });

        describe("when a command is declared with delay: true", () => {
            let result: any;
            const schema = z.object({ olderThan: z.string() });

            beforeEach(() => {
                result = defineDomain("admin", {
                    commands: {
                        purgeExpiredSessions: { schema, delay: true },
                    },
                });
            });

            it("should propagate delay: true to the command contract", () => {
                expect(result.commands.purgeExpiredSessions.delay).toBe(true);
            });

            it("should still produce the correct _type", () => {
                expect(result.commands.purgeExpiredSessions._type).toBe("command");
            });
        });

        describe("when a command is declared with delay: { default: 300000 }", () => {
            let result: any;
            const schema = z.object({ olderThan: z.string() });

            beforeEach(() => {
                result = defineDomain("admin", {
                    commands: {
                        purgeExpiredSessions: { schema, delay: { default: 300_000 } },
                    },
                });
            });

            it("should propagate delay config with default to the command contract", () => {
                expect(result.commands.purgeExpiredSessions.delay).toEqual({ default: 300_000 });
            });
        });

        describe("when an event without delay is declared (bare schema)", () => {
            let result: any;
            const schema = z.object({ orderId: z.string() });

            beforeEach(() => {
                result = defineDomain("orders", {
                    events: { orderCreated: schema },
                });
            });

            it("should not set delay on the contract", () => {
                expect(result.events.orderCreated.delay).toBeUndefined();
            });
        });

        describe("when an event is declared with delay: { default: 0 } (invalid default)", () => {
            let expectedErr: any;

            beforeEach(() => {
                try {
                    defineDomain("orders", {
                        events: {
                            reminderDue: {
                                schema: z.object({ orderId: z.string() }),
                                delay: { default: 0 },
                            },
                        },
                    });
                } catch (err) {
                    expectedErr = err;
                }
            });

            it("should throw an error", () => {
                expect(expectedErr).toEqual(
                    new Error(
                        "defineDomain: delay.default must be greater than 0 (at orders.events.reminderDue, got 0)"
                    )
                );
            });
        });

        describe("when an event is declared with delay: { default: -1000 } (negative default)", () => {
            let expectedErr: any;

            beforeEach(() => {
                try {
                    defineDomain("orders", {
                        events: {
                            reminderDue: {
                                schema: z.object({ orderId: z.string() }),
                                delay: { default: -1000 },
                            },
                        },
                    });
                } catch (err) {
                    expectedErr = err;
                }
            });

            it("should throw an error", () => {
                expect(expectedErr).toEqual(
                    new Error(
                        "defineDomain: delay.default must be greater than 0 (at orders.events.reminderDue, got -1000)"
                    )
                );
            });
        });

        describe("when a command is declared with delay: { default: 0 } (invalid default)", () => {
            let expectedErr: any;

            beforeEach(() => {
                try {
                    defineDomain("admin", {
                        commands: {
                            purgeExpiredSessions: {
                                schema: z.object({ olderThan: z.string() }),
                                delay: { default: 0 },
                            },
                        },
                    });
                } catch (err) {
                    expectedErr = err;
                }
            });

            it("should throw an error", () => {
                expect(expectedErr).toEqual(
                    new Error(
                        "defineDomain: delay.default must be greater than 0 (at admin.commands.purgeExpiredSessions, got 0)"
                    )
                );
            });
        });

        describe("when an event is declared with delay: { default: NaN } (invalid default)", () => {
            let expectedErr: any;

            beforeEach(() => {
                try {
                    defineDomain("orders", {
                        events: {
                            reminderDue: {
                                schema: z.object({ orderId: z.string() }),
                                delay: { default: NaN },
                            },
                        },
                    });
                } catch (err) {
                    expectedErr = err;
                }
            });

            it("should throw an error", () => {
                expect(expectedErr).toEqual(
                    new Error(
                        "defineDomain: delay.default must be greater than 0 (at orders.events.reminderDue, got NaN)"
                    )
                );
            });
        });

        describe("when an event is declared with delay: { default: Infinity } (invalid default)", () => {
            let expectedErr: any;

            beforeEach(() => {
                try {
                    defineDomain("orders", {
                        events: {
                            reminderDue: {
                                schema: z.object({ orderId: z.string() }),
                                delay: { default: Infinity },
                            },
                        },
                    });
                } catch (err) {
                    expectedErr = err;
                }
            });

            it("should throw an error", () => {
                expect(expectedErr).toEqual(
                    new Error(
                        "defineDomain: delay.default must be greater than 0 (at orders.events.reminderDue, got Infinity)"
                    )
                );
            });
        });

        describe("when a command is declared with delay: { default: NaN } (invalid default)", () => {
            let expectedErr: any;

            beforeEach(() => {
                try {
                    defineDomain("admin", {
                        commands: {
                            purgeExpiredSessions: {
                                schema: z.object({ olderThan: z.string() }),
                                delay: { default: NaN },
                            },
                        },
                    });
                } catch (err) {
                    expectedErr = err;
                }
            });

            it("should throw an error", () => {
                expect(expectedErr).toEqual(
                    new Error(
                        "defineDomain: delay.default must be greater than 0 (at admin.commands.purgeExpiredSessions, got NaN)"
                    )
                );
            });
        });

        describe("when a command is declared with delay: { default: Infinity } (invalid default)", () => {
            let expectedErr: any;

            beforeEach(() => {
                try {
                    defineDomain("admin", {
                        commands: {
                            purgeExpiredSessions: {
                                schema: z.object({ olderThan: z.string() }),
                                delay: { default: Infinity },
                            },
                        },
                    });
                } catch (err) {
                    expectedErr = err;
                }
            });

            it("should throw an error", () => {
                expect(expectedErr).toEqual(
                    new Error(
                        "defineDomain: delay.default must be greater than 0 (at admin.commands.purgeExpiredSessions, got Infinity)"
                    )
                );
            });
        });

        describe("when domain has multiple events", () => {
            let result: any;
            const schema1 = z.object({ tacoId: z.string() });
            const schema2 = z.object({ burritoId: z.string() });
            const schema3 = z.object({ nacho: z.string() });

            beforeEach(() => {
                result = defineDomain("fiesta", {
                    events: {
                        tacoReady: schema1,
                        burritoReady: schema2,
                        nachosServed: schema3,
                    },
                });
            });

            it("should share the same exchange across all events", () => {
                expect(result.events.tacoReady.exchange).toBe("fiesta");
                expect(result.events.burritoReady.exchange).toBe("fiesta");
                expect(result.events.nachosServed.exchange).toBe("fiesta");
            });

            it("should generate distinct routing keys for each event", () => {
                expect(result.events.tacoReady.routingKey).toBe("fiesta.event.taco_ready");
                expect(result.events.burritoReady.routingKey).toBe("fiesta.event.burrito_ready");
                expect(result.events.nachosServed.routingKey).toBe("fiesta.event.nachos_served");
            });

            it("should generate distinct publication names for each event", () => {
                expect(result.events.tacoReady.publicationName).toBe("fiesta_event_taco_ready");
                expect(result.events.burritoReady.publicationName).toBe(
                    "fiesta_event_burrito_ready"
                );
            });
        });
    });
});
