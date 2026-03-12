/* eslint-disable @typescript-eslint/no-explicit-any */
import hoppity, { ServiceBroker } from "@apogeelabs/hoppity";
import { createTestTopology } from "./helpers/createTestTopology";
import { silentLogger } from "./helpers/silentLogger";

/**
 * These tests exercise raw topology subscriptions through the ServiceBroker escape hatch.
 * Subscription wiring via contract handlers is tested in the combined integration test.
 * Here we verify the base broker can publish/receive without contract overhead.
 */
describe("subscriptions: auto-wired handlers receive messages", () => {
    describe("when a handler is registered for a subscription", () => {
        let broker: ServiceBroker;
        let receivedMessages: any[];
        let messageReceived: Promise<void>;
        let resolveMessageReceived: () => void;

        beforeAll(async () => {
            receivedMessages = [];
            messageReceived = new Promise<void>(resolve => {
                resolveMessageReceived = resolve;
            });

            const topology = createTestTopology();
            const vhost = topology.vhosts!["/"] as any;
            vhost.exchanges = {
                sub_test_exchange: {
                    type: "topic",
                    options: { durable: false, autoDelete: true },
                },
            };
            vhost.queues = {
                sub_test_queue: { options: { durable: false, autoDelete: true } },
            };
            vhost.bindings = {
                sub_test_binding: {
                    source: "sub_test_exchange",
                    destination: "sub_test_queue",
                    destinationType: "queue",
                    bindingKey: "#",
                },
            };
            vhost.publications = {
                sub_test_pub: { exchange: "sub_test_exchange" },
            };
            vhost.subscriptions = {
                sub_test_sub: { queue: "sub_test_queue" },
            };

            broker = await hoppity
                .service("sub-test", {
                    connection: { url: "unused" },
                    topology,
                    logger: silentLogger,
                })
                .build();

            // Subscribe directly via the underlying Rascal broker
            const sub = await broker.subscribe("sub_test_sub");
            sub.on("message", (_msg, content, ackOrNack) => {
                receivedMessages.push(content);
                ackOrNack();
                resolveMessageReceived();
            });

            await broker.publish("sub_test_pub", {
                pizza: "CAL_ZONE",
                quantity: 8675309,
            });
            await messageReceived;
        });

        afterAll(async () => {
            if (broker) {
                await broker.shutdown();
            }
        });

        it("should call the handler with the published message content", () => {
            expect(receivedMessages).toHaveLength(1);
            expect(receivedMessages[0]).toEqual({
                pizza: "CAL_ZONE",
                quantity: 8675309,
            });
        });
    });

    describe("when multiple handlers are registered", () => {
        let broker: ServiceBroker;
        let alphaMessages: any[];
        let bravoMessages: any[];
        let bothReceived: Promise<void>;

        beforeAll(async () => {
            alphaMessages = [];
            bravoMessages = [];

            let alphaResolve: () => void;
            let bravoResolve: () => void;
            const alphaReceived = new Promise<void>(r => {
                alphaResolve = r;
            });
            const bravoReceived = new Promise<void>(r => {
                bravoResolve = r;
            });
            bothReceived = Promise.all([alphaReceived, bravoReceived]).then(() => {});

            const topology = createTestTopology();
            const vhost = topology.vhosts!["/"] as any;
            vhost.exchanges = {
                sub_multi_exchange: {
                    type: "topic",
                    options: { durable: false, autoDelete: true },
                },
            };
            vhost.queues = {
                sub_alpha_queue: { options: { durable: false, autoDelete: true } },
                sub_bravo_queue: { options: { durable: false, autoDelete: true } },
            };
            vhost.bindings = {
                sub_alpha_binding: {
                    source: "sub_multi_exchange",
                    destination: "sub_alpha_queue",
                    destinationType: "queue",
                    bindingKey: "alpha.#",
                },
                sub_bravo_binding: {
                    source: "sub_multi_exchange",
                    destination: "sub_bravo_queue",
                    destinationType: "queue",
                    bindingKey: "bravo.#",
                },
            };
            vhost.publications = {
                sub_alpha_pub: {
                    exchange: "sub_multi_exchange",
                    routingKey: "alpha.test",
                },
                sub_bravo_pub: {
                    exchange: "sub_multi_exchange",
                    routingKey: "bravo.test",
                },
            };
            vhost.subscriptions = {
                sub_alpha_sub: { queue: "sub_alpha_queue" },
                sub_bravo_sub: { queue: "sub_bravo_queue" },
            };

            broker = await hoppity
                .service("sub-multi-test", {
                    connection: { url: "unused" },
                    topology,
                    logger: silentLogger,
                })
                .build();

            const alphaSub = await broker.subscribe("sub_alpha_sub");
            alphaSub.on("message", (_msg, content, ackOrNack) => {
                alphaMessages.push(content);
                ackOrNack();
                alphaResolve();
            });

            const bravoSub = await broker.subscribe("sub_bravo_sub");
            bravoSub.on("message", (_msg, content, ackOrNack) => {
                bravoMessages.push(content);
                ackOrNack();
                bravoResolve();
            });

            await broker.publish("sub_alpha_pub", { team: "ALPHA" });
            await broker.publish("sub_bravo_pub", { team: "BRAVO" });
            await bothReceived;
        });

        afterAll(async () => {
            if (broker) {
                await broker.shutdown();
            }
        });

        it("should route alpha messages to the alpha handler", () => {
            expect(alphaMessages).toHaveLength(1);
            expect(alphaMessages[0]).toEqual({ team: "ALPHA" });
        });

        it("should route bravo messages to the bravo handler", () => {
            expect(bravoMessages).toHaveLength(1);
            expect(bravoMessages[0]).toEqual({ team: "BRAVO" });
        });
    });
});
