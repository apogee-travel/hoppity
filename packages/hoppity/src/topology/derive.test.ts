/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import { z } from "zod";
import { defineDomain } from "../contracts/defineDomain";
import { onEvent } from "../handlers/onEvent";
import { onCommand } from "../handlers/onCommand";
import { onRpc } from "../handlers/onRpc";
import { deriveTopology, ConnectionConfig } from "./derive";

const GrubDomain = defineDomain("grub", {
    events: {
        burgerReady: z.object({ burgerId: z.string() }),
        orderCancelled: z.object({ burgerId: z.string() }),
        burgerDelayed: {
            schema: z.object({ burgerId: z.string() }),
            delay: { default: 5_000 },
        },
    },
    commands: {
        flipBurger: z.object({ burgerId: z.string() }),
        flipWithDelay: {
            schema: z.object({ burgerId: z.string() }),
            delay: true,
        },
    },
    rpc: {
        orderBurger: {
            request: z.object({ size: z.string() }),
            response: z.object({ burgerId: z.string() }),
        },
    },
});

const CONNECTION: ConnectionConfig = {
    url: "amqp://localhost",
    vhost: "/grub",
    options: { heartbeat: 10 },
    retry: { factor: 2, min: 1000, max: 5000 },
};

const INSTANCE_ID = "cafe-8675309";

describe("hoppity > topology > deriveTopology", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    describe("when deriving topology with an event handler", () => {
        let result: any;
        const mockHandler = jest.fn();

        beforeEach(() => {
            result = deriveTopology(
                "counter-service",
                [onEvent(GrubDomain.events.burgerReady, mockHandler)],
                [],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should create a vhost keyed by the connection vhost", () => {
            expect(result.vhosts).toHaveProperty("/grub");
        });

        it("should add the domain exchange", () => {
            expect(result.vhosts["/grub"].exchanges["grub"]).toEqual({
                type: "topic",
                options: { durable: true },
            });
        });

        it("should add a quorum queue for the handler", () => {
            expect(
                result.vhosts["/grub"].queues["counter-service_grub_event_burger_ready"]
            ).toEqual({
                options: {
                    durable: true,
                    arguments: { "x-queue-type": "quorum" },
                },
            });
        });

        it("should add a binding for the queue", () => {
            expect(
                result.vhosts["/grub"].bindings["counter-service_grub_event_burger_ready_binding"]
            ).toEqual({
                source: "grub",
                destination: "counter-service_grub_event_burger_ready",
                destinationType: "queue",
                bindingKey: "grub.event.burger_ready",
            });
        });

        it("should add a subscription for the handler", () => {
            expect(result.vhosts["/grub"].subscriptions["grub_event_burger_ready"]).toEqual({
                queue: "counter-service_grub_event_burger_ready",
                redeliveries: { limit: 5 },
            });
        });

        it("should not add reply infrastructure when no RPC handlers", () => {
            expect(
                result.vhosts["/grub"].queues[`counter-service_${INSTANCE_ID}_reply`]
            ).toBeUndefined();
        });
    });

    describe("when deriving topology with a command handler with custom options", () => {
        let result: any;
        const mockHandler = jest.fn();

        beforeEach(() => {
            result = deriveTopology(
                "grill-service",
                [
                    onCommand(GrubDomain.commands.flipBurger, mockHandler, {
                        queueType: "classic",
                        redeliveries: { limit: 3 },
                        deadLetter: { exchange: "grill-dlx", routingKey: "dead.burgers" },
                    }),
                ],
                [],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should apply the custom queue type", () => {
            expect(
                result.vhosts["/grub"].queues["grill-service_grub_command_flip_burger"].options
                    .arguments["x-queue-type"]
            ).toBe("classic");
        });

        it("should apply the dead-letter exchange", () => {
            expect(
                result.vhosts["/grub"].queues["grill-service_grub_command_flip_burger"].options
                    .arguments["x-dead-letter-exchange"]
            ).toBe("grill-dlx");
        });

        it("should apply the dead-letter routing key", () => {
            expect(
                result.vhosts["/grub"].queues["grill-service_grub_command_flip_burger"].options
                    .arguments["x-dead-letter-routing-key"]
            ).toBe("dead.burgers");
        });

        it("should apply the custom redelivery limit", () => {
            expect(
                result.vhosts["/grub"].subscriptions["grub_command_flip_burger"].redeliveries
            ).toEqual({ limit: 3 });
        });
    });

    describe("when deriving topology with a publish declaration", () => {
        let result: any;

        beforeEach(() => {
            result = deriveTopology(
                "order-service",
                [],
                [GrubDomain.events.burgerReady],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should add the domain exchange for the publication", () => {
            expect(result.vhosts["/grub"].exchanges["grub"]).toBeDefined();
        });

        it("should add the publication for the event", () => {
            expect(result.vhosts["/grub"].publications["grub_event_burger_ready"]).toEqual({
                exchange: "grub",
                routingKey: "grub.event.burger_ready",
            });
        });

        it("should not add any subscriptions for a publish declaration", () => {
            expect(Object.keys(result.vhosts["/grub"].subscriptions)).toHaveLength(0);
        });
    });

    describe("when deriving topology with an RPC handler", () => {
        let result: any;
        const mockHandler = jest.fn();

        beforeEach(() => {
            result = deriveTopology(
                "grill-service",
                [onRpc(GrubDomain.rpc.orderBurger, mockHandler)],
                [],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should add the rpc exchange", () => {
            expect(result.vhosts["/grub"].exchanges["grub_rpc"]).toBeDefined();
        });

        it("should add the request queue", () => {
            expect(
                result.vhosts["/grub"].queues["grill-service_grub_rpc_order_burger"]
            ).toBeDefined();
        });

        it("should add the rpc binding", () => {
            expect(
                result.vhosts["/grub"].bindings["grill-service_grub_rpc_order_burger_binding"]
            ).toEqual({
                source: "grub_rpc",
                destination: "grill-service_grub_rpc_order_burger",
                destinationType: "queue",
                bindingKey: "grub.rpc.order_burger",
            });
        });

        it("should add reply queue infrastructure", () => {
            expect(result.vhosts["/grub"].queues[`grill-service_${INSTANCE_ID}_reply`]).toEqual({
                options: { exclusive: true, autoDelete: true },
            });
        });

        it("should add reply queue subscription", () => {
            expect(
                result.vhosts["/grub"].subscriptions[
                    `grill-service_${INSTANCE_ID}_reply_subscription`
                ]
            ).toEqual({
                queue: `grill-service_${INSTANCE_ID}_reply`,
                options: { prefetch: 1 },
            });
        });

        it("should add rpc_reply publication", () => {
            expect(result.vhosts["/grub"].publications["rpc_reply"]).toEqual({
                exchange: "",
                routingKey: "{{replyTo}}",
                options: { persistent: false },
            });
        });
    });

    describe("when deriving topology with an RPC publish declaration (caller-only service)", () => {
        let result: any;

        beforeEach(() => {
            result = deriveTopology(
                "menu-service",
                [],
                [GrubDomain.rpc.orderBurger],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should add the rpc exchange", () => {
            expect(result.vhosts["/grub"].exchanges["grub_rpc"]).toBeDefined();
        });

        it("should add the rpc caller publication", () => {
            expect(result.vhosts["/grub"].publications["grub_rpc_order_burger"]).toEqual({
                exchange: "grub_rpc",
                routingKey: "grub.rpc.order_burger",
            });
        });

        it("should add reply queue infrastructure for the caller", () => {
            expect(result.vhosts["/grub"].queues[`menu-service_${INSTANCE_ID}_reply`]).toEqual({
                options: { exclusive: true, autoDelete: true },
            });
        });

        it("should add reply queue subscription for the caller", () => {
            expect(
                result.vhosts["/grub"].subscriptions[
                    `menu-service_${INSTANCE_ID}_reply_subscription`
                ]
            ).toEqual({
                queue: `menu-service_${INSTANCE_ID}_reply`,
                options: { prefetch: 1 },
            });
        });

        it("should add rpc_reply publication for the caller", () => {
            expect(result.vhosts["/grub"].publications["rpc_reply"]).toEqual({
                exchange: "",
                routingKey: "{{replyTo}}",
                options: { persistent: false },
            });
        });
    });

    describe("when connection vhost is not provided", () => {
        let result: any;

        beforeEach(() => {
            result = deriveTopology(
                "order-service",
                [],
                [],
                { url: "amqp://localhost" },
                INSTANCE_ID
            );
        });

        it("should default to vhost /", () => {
            expect(result.vhosts).toHaveProperty("/");
        });
    });

    describe("when connection has retry config", () => {
        let result: any;

        beforeEach(() => {
            result = deriveTopology(
                "order-service",
                [],
                [],
                { url: "amqp://localhost", retry: { factor: 2, min: 500, max: 10000 } },
                INSTANCE_ID
            );
        });

        it("should include retry config in the connection", () => {
            expect(result.vhosts["/"].connection.retry).toEqual({
                factor: 2,
                min: 500,
                max: 10000,
            });
        });
    });

    describe("when deriving topology with no handlers and no publishes", () => {
        let result: any;

        beforeEach(() => {
            result = deriveTopology("empty-service", [], [], CONNECTION, INSTANCE_ID);
        });

        it("should produce a vhost with no exchanges", () => {
            expect(result.vhosts["/grub"].exchanges).toEqual({});
        });

        it("should produce a vhost with no queues", () => {
            expect(result.vhosts["/grub"].queues).toEqual({});
        });

        it("should produce a vhost with no bindings", () => {
            expect(result.vhosts["/grub"].bindings).toEqual({});
        });

        it("should produce a vhost with no publications", () => {
            expect(result.vhosts["/grub"].publications).toEqual({});
        });

        it("should produce a vhost with no subscriptions", () => {
            expect(result.vhosts["/grub"].subscriptions).toEqual({});
        });

        it("should not add reply infrastructure", () => {
            expect(
                result.vhosts["/grub"].queues[`empty-service_${INSTANCE_ID}_reply`]
            ).toBeUndefined();
        });
    });

    describe("when two handlers share the same domain (same exchange name)", () => {
        let result: any;
        const mockHandler = jest.fn();

        beforeEach(() => {
            result = deriveTopology(
                "kitchen-service",
                [
                    onEvent(GrubDomain.events.burgerReady, mockHandler),
                    onEvent(GrubDomain.events.orderCancelled, mockHandler),
                ],
                [],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should produce only one exchange entry (last write wins, but both are identical)", () => {
            expect(Object.keys(result.vhosts["/grub"].exchanges)).toHaveLength(1);
            expect(result.vhosts["/grub"].exchanges["grub"]).toEqual({
                type: "topic",
                options: { durable: true },
            });
        });

        it("should produce a separate queue for each handler", () => {
            expect(
                result.vhosts["/grub"].queues["kitchen-service_grub_event_burger_ready"]
            ).toBeDefined();
            expect(
                result.vhosts["/grub"].queues["kitchen-service_grub_event_order_cancelled"]
            ).toBeDefined();
        });

        it("should produce a separate subscription for each handler", () => {
            expect(result.vhosts["/grub"].subscriptions["grub_event_burger_ready"]).toBeDefined();
            expect(
                result.vhosts["/grub"].subscriptions["grub_event_order_cancelled"]
            ).toBeDefined();
        });
    });

    describe("when handler has dead letter config without a routing key", () => {
        let result: any;
        const mockHandler = jest.fn();

        beforeEach(() => {
            result = deriveTopology(
                "grill-service",
                [
                    onCommand(GrubDomain.commands.flipBurger, mockHandler, {
                        deadLetter: { exchange: "grill-dlx" },
                        // no routingKey — tests the conditional branch in buildQueue
                    }),
                ],
                [],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should set the dead letter exchange", () => {
            const args =
                result.vhosts["/grub"].queues["grill-service_grub_command_flip_burger"].options
                    .arguments;
            expect(args["x-dead-letter-exchange"]).toBe("grill-dlx");
        });

        it("should not set x-dead-letter-routing-key when routingKey is omitted", () => {
            const args =
                result.vhosts["/grub"].queues["grill-service_grub_command_flip_burger"].options
                    .arguments;
            expect(args["x-dead-letter-routing-key"]).toBeUndefined();
        });
    });

    describe("when service has mixed handler types (event + command + rpc) and a publish", () => {
        let result: any;
        const mockHandler = jest.fn();

        beforeEach(() => {
            result = deriveTopology(
                "full-service",
                [
                    onEvent(GrubDomain.events.burgerReady, mockHandler),
                    onCommand(GrubDomain.commands.flipBurger, mockHandler),
                    onRpc(GrubDomain.rpc.orderBurger, mockHandler),
                ],
                [GrubDomain.events.orderCancelled],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should add queues for all three handlers", () => {
            expect(
                result.vhosts["/grub"].queues["full-service_grub_event_burger_ready"]
            ).toBeDefined();
            expect(
                result.vhosts["/grub"].queues["full-service_grub_command_flip_burger"]
            ).toBeDefined();
            expect(
                result.vhosts["/grub"].queues["full-service_grub_rpc_order_burger"]
            ).toBeDefined();
        });

        it("should add subscriptions for all three handlers", () => {
            expect(result.vhosts["/grub"].subscriptions["grub_event_burger_ready"]).toBeDefined();
            expect(result.vhosts["/grub"].subscriptions["grub_command_flip_burger"]).toBeDefined();
            expect(result.vhosts["/grub"].subscriptions["grub_rpc_order_burger"]).toBeDefined();
        });

        it("should add reply infrastructure because an rpc handler is present", () => {
            expect(
                result.vhosts["/grub"].queues[`full-service_${INSTANCE_ID}_reply`]
            ).toBeDefined();
        });

        it("should add the publication for the outbound event", () => {
            expect(result.vhosts["/grub"].publications["grub_event_order_cancelled"]).toBeDefined();
        });
    });

    describe("when deriving topology with a delay-capable event handler", () => {
        let result: any;
        const mockHandler = jest.fn();

        beforeEach(() => {
            result = deriveTopology(
                "counter-service",
                [onEvent(GrubDomain.events.burgerDelayed, mockHandler)],
                [],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should add the wait queue with dead-letter routing to the ready queue", () => {
            expect(result.vhosts["/grub"].queues["grub_event_burger_delayed_wait"]).toEqual({
                options: {
                    durable: true,
                    arguments: {
                        "x-queue-type": "quorum",
                        "x-dead-letter-exchange": "",
                        "x-dead-letter-routing-key": "grub_event_burger_delayed_ready",
                    },
                },
            });
        });

        it("should add the ready queue as a plain quorum queue", () => {
            expect(result.vhosts["/grub"].queues["grub_event_burger_delayed_ready"]).toEqual({
                options: {
                    durable: true,
                    arguments: { "x-queue-type": "quorum" },
                },
            });
        });

        it("should add the error queue as a plain quorum queue", () => {
            expect(result.vhosts["/grub"].queues["grub_event_burger_delayed_errors"]).toEqual({
                options: {
                    durable: true,
                    arguments: { "x-queue-type": "quorum" },
                },
            });
        });

        it("should add the wait publication via the default exchange", () => {
            expect(
                result.vhosts["/grub"].publications["grub_event_burger_delayed_delayed"]
            ).toEqual({
                exchange: "",
                routingKey: "grub_event_burger_delayed_wait",
            });
        });

        it("should add the ready subscription with prefetch: 1", () => {
            expect(result.vhosts["/grub"].subscriptions["grub_event_burger_delayed_ready"]).toEqual(
                {
                    queue: "grub_event_burger_delayed_ready",
                    options: { prefetch: 1 },
                }
            );
        });

        it("should add the error queue publication via the default exchange", () => {
            expect(result.vhosts["/grub"].publications["grub_event_burger_delayed_errors"]).toEqual(
                {
                    exchange: "",
                    routingKey: "grub_event_burger_delayed_errors",
                }
            );
        });
    });

    describe("when deriving topology with a delay-capable command handler", () => {
        let result: any;
        const mockHandler = jest.fn();

        beforeEach(() => {
            result = deriveTopology(
                "grill-service",
                [onCommand(GrubDomain.commands.flipWithDelay, mockHandler)],
                [],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should add the wait queue for the command", () => {
            expect(
                result.vhosts["/grub"].queues["grub_command_flip_with_delay_wait"]
            ).toBeDefined();
        });

        it("should add the ready queue for the command", () => {
            expect(
                result.vhosts["/grub"].queues["grub_command_flip_with_delay_ready"]
            ).toBeDefined();
        });

        it("should add the error queue for the command", () => {
            expect(
                result.vhosts["/grub"].queues["grub_command_flip_with_delay_errors"]
            ).toBeDefined();
        });

        it("should add the wait publication for the command", () => {
            expect(
                result.vhosts["/grub"].publications["grub_command_flip_with_delay_delayed"]
            ).toBeDefined();
        });

        it("should add the ready subscription for the command", () => {
            expect(
                result.vhosts["/grub"].subscriptions["grub_command_flip_with_delay_ready"]
            ).toBeDefined();
        });

        it("should add the error queue publication for the command", () => {
            expect(
                result.vhosts["/grub"].publications["grub_command_flip_with_delay_errors"]
            ).toEqual({
                exchange: "",
                routingKey: "grub_command_flip_with_delay_errors",
            });
        });
    });

    describe("when deriving topology with a delay-capable event in publishes (publisher-only service)", () => {
        let result: any;

        beforeEach(() => {
            result = deriveTopology(
                "order-service",
                [],
                [GrubDomain.events.burgerDelayed],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should add the wait publication for the delayed event", () => {
            expect(
                result.vhosts["/grub"].publications["grub_event_burger_delayed_delayed"]
            ).toEqual({
                exchange: "",
                // Operation-scoped name — matches the queue created by whichever service handles this contract
                routingKey: "grub_event_burger_delayed_wait",
            });
        });

        it("should add the standard publication as well", () => {
            expect(result.vhosts["/grub"].publications["grub_event_burger_delayed"]).toBeDefined();
        });

        it("should not add queue or subscription infrastructure on the publisher side", () => {
            expect(result.vhosts["/grub"].queues["grub_event_burger_delayed_wait"]).toBeUndefined();
            expect(
                result.vhosts["/grub"].queues["grub_event_burger_delayed_ready"]
            ).toBeUndefined();
        });
    });

    describe("when a service both handles and publishes the same delay-capable event", () => {
        let result: any;
        const mockHandler = jest.fn();

        beforeEach(() => {
            result = deriveTopology(
                "counter-service",
                [onEvent(GrubDomain.events.burgerDelayed, mockHandler)],
                [GrubDomain.events.burgerDelayed],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should produce only one wait publication (not duplicated)", () => {
            const publications = result.vhosts["/grub"].publications;
            const delayedPubs = Object.keys(publications).filter(k =>
                k.includes("burger_delayed_delayed")
            );
            expect(delayedPubs).toHaveLength(1);
        });

        it("should have the full queue infrastructure from the handler side", () => {
            expect(result.vhosts["/grub"].queues["grub_event_burger_delayed_wait"]).toBeDefined();
        });
    });

    describe("when a non-delay event handler is registered (no delay infrastructure expected)", () => {
        let result: any;
        const mockHandler = jest.fn();

        beforeEach(() => {
            result = deriveTopology(
                "counter-service",
                [onEvent(GrubDomain.events.burgerReady, mockHandler)],
                [],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should not add a wait queue", () => {
            expect(
                result.vhosts["/grub"].queues["counter-service_grub_event_burger_ready_wait"]
            ).toBeUndefined();
        });

        it("should not add a ready queue", () => {
            expect(
                result.vhosts["/grub"].queues["counter-service_grub_event_burger_ready_ready"]
            ).toBeUndefined();
        });

        it("should not add a wait publication", () => {
            expect(
                result.vhosts["/grub"].publications["grub_event_burger_ready_delayed"]
            ).toBeUndefined();
        });
    });

    describe("when an RPC handler is registered (no delay infrastructure expected)", () => {
        let result: any;
        const mockHandler = jest.fn();

        beforeEach(() => {
            result = deriveTopology(
                "grill-service",
                [onRpc(GrubDomain.rpc.orderBurger, mockHandler)],
                [],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should not add a wait queue for the rpc handler", () => {
            // RPC never participates in delayed delivery
            expect(result.vhosts["/grub"].queues["grub_rpc_order_burger_wait"]).toBeUndefined();
        });

        it("should not add a ready queue for the rpc handler", () => {
            expect(result.vhosts["/grub"].queues["grub_rpc_order_burger_ready"]).toBeUndefined();
        });

        it("should not add an error queue for the rpc handler", () => {
            expect(result.vhosts["/grub"].queues["grub_rpc_order_burger_errors"]).toBeUndefined();
        });

        it("should not add a wait publication for the rpc handler", () => {
            expect(
                result.vhosts["/grub"].publications["grub_rpc_order_burger_delayed"]
            ).toBeUndefined();
        });

        it("should not add a ready subscription for the rpc handler", () => {
            expect(
                result.vhosts["/grub"].subscriptions["grub_rpc_order_burger_ready"]
            ).toBeUndefined();
        });
    });

    describe("when an RPC publish declaration is registered (no delay infrastructure expected)", () => {
        let result: any;

        beforeEach(() => {
            result = deriveTopology(
                "menu-service",
                [],
                [GrubDomain.rpc.orderBurger],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should not add a wait publication for the rpc caller", () => {
            expect(
                result.vhosts["/grub"].publications["grub_rpc_order_burger_delayed"]
            ).toBeUndefined();
        });

        it("should not add a ready subscription for the rpc caller", () => {
            expect(
                result.vhosts["/grub"].subscriptions["grub_rpc_order_burger_ready"]
            ).toBeUndefined();
        });
    });

    describe("when a non-delay publish contract is used (no wait publication expected)", () => {
        let result: any;

        beforeEach(() => {
            result = deriveTopology(
                "order-service",
                [],
                [GrubDomain.events.burgerReady],
                CONNECTION,
                INSTANCE_ID
            );
        });

        it("should not add a wait publication for a non-delay publish contract", () => {
            expect(
                result.vhosts["/grub"].publications["grub_event_burger_ready_delayed"]
            ).toBeUndefined();
        });

        it("should not add an error queue publication for a non-delay publish contract", () => {
            expect(
                result.vhosts["/grub"].publications["grub_event_burger_ready_errors"]
            ).toBeUndefined();
        });
    });

    describe("when connection has no options field", () => {
        let result: any;

        beforeEach(() => {
            result = deriveTopology(
                "bare-service",
                [],
                [],
                { url: "amqp://bare-host" },
                INSTANCE_ID
            );
        });

        it("should not include options in the connection config", () => {
            expect(result.vhosts["/"].connection.options).toBeUndefined();
        });

        it("should not include retry in the connection config", () => {
            expect(result.vhosts["/"].connection.retry).toBeUndefined();
        });
    });
});
