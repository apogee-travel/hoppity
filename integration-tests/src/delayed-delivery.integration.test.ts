/* eslint-disable @typescript-eslint/no-explicit-any */
import hoppity, { defineDomain, onEvent, ServiceBroker } from "@apogeelabs/hoppity";
import { withCustomLogger } from "@apogeelabs/hoppity-logger";
import { z } from "zod";
import { silentLogger } from "./helpers/silentLogger";

const TestDomain = defineDomain("grub", {
    events: {
        delayedOrder: {
            schema: z.object({ order: z.string(), table: z.number() }),
            delay: { default: 2_000 },
        },
    },
});

describe("delayed-delivery: message arrives after TTL expiry", () => {
    describe("when a message is published with a 2s delay", () => {
        let broker: ServiceBroker;
        let receivedContent: any;
        let publishedAt: number;
        let receivedAt: number;
        const SERVICE_NAME = `DELAYED_TEST_${Date.now()}`;

        beforeAll(async () => {
            const receivedPromise = new Promise<void>((resolve, reject) => {
                const timer = setTimeout(
                    () => reject(new Error("Timed out waiting for delayed message")),
                    15_000
                );

                broker = undefined as any;

                hoppity
                    .service(SERVICE_NAME, {
                        connection: { url: process.env.RABBITMQ_URL! },
                        handlers: [
                            onEvent(TestDomain.events.delayedOrder, async payload => {
                                clearTimeout(timer);
                                receivedContent = payload;
                                receivedAt = Date.now();
                                resolve();
                            }),
                        ],
                        publishes: [TestDomain.events.delayedOrder],
                    })
                    .use(withCustomLogger({ logger: silentLogger }))
                    .build()
                    .then(async b => {
                        broker = b;
                        publishedAt = Date.now();
                        await broker.publishEvent(
                            TestDomain.events.delayedOrder,
                            { order: "PIZZA_MARGHERITA", table: 42 },
                            { delay: 2_000 }
                        );
                    })
                    .catch(reject);
            });

            await receivedPromise;
        }, 30_000);

        afterAll(async () => {
            if (broker) {
                await broker.shutdown();
            }
        });

        it("should deliver the message with the correct content", () => {
            expect(receivedContent).toEqual({
                order: "PIZZA_MARGHERITA",
                table: 42,
            });
        });

        it("should deliver the message after at least 1.5s", () => {
            const elapsed = receivedAt - publishedAt;
            expect(elapsed).toBeGreaterThanOrEqual(1500);
        });
    });

    describe("when a message is published using the contract default delay", () => {
        let broker: ServiceBroker;
        let receivedContent: any;
        let publishedAt: number;
        let receivedAt: number;
        const SERVICE_NAME = `DELAYED_DEFAULT_${Date.now()}`;

        beforeAll(async () => {
            const receivedPromise = new Promise<void>((resolve, reject) => {
                const timer = setTimeout(
                    () => reject(new Error("Timed out waiting for delayed message")),
                    15_000
                );

                broker = undefined as any;

                hoppity
                    .service(SERVICE_NAME, {
                        connection: { url: process.env.RABBITMQ_URL! },
                        handlers: [
                            onEvent(TestDomain.events.delayedOrder, async payload => {
                                clearTimeout(timer);
                                receivedContent = payload;
                                receivedAt = Date.now();
                                resolve();
                            }),
                        ],
                        publishes: [TestDomain.events.delayedOrder],
                    })
                    .use(withCustomLogger({ logger: silentLogger }))
                    .build()
                    .then(async b => {
                        broker = b;
                        publishedAt = Date.now();
                        // { delay: true } means "use the contract's default" (2000ms)
                        await broker.publishEvent(
                            TestDomain.events.delayedOrder,
                            { order: "CALZONE_SPECIAL", table: 7 },
                            { delay: true }
                        );
                    })
                    .catch(reject);
            });

            await receivedPromise;
        }, 30_000);

        afterAll(async () => {
            if (broker) {
                await broker.shutdown();
            }
        });

        it("should deliver the message with the correct content", () => {
            expect(receivedContent).toEqual({
                order: "CALZONE_SPECIAL",
                table: 7,
            });
        });

        it("should deliver the message after at least 1.5s (contract default = 2000ms)", () => {
            const elapsed = receivedAt - publishedAt;
            expect(elapsed).toBeGreaterThanOrEqual(1500);
        });
    });

    describe("when a message is published without delay (immediate delivery)", () => {
        let broker: ServiceBroker;
        let receivedContent: any;
        let publishedAt: number;
        let receivedAt: number;
        const SERVICE_NAME = `DELAYED_IMMEDIATE_${Date.now()}`;

        beforeAll(async () => {
            const receivedPromise = new Promise<void>((resolve, reject) => {
                const timer = setTimeout(
                    () => reject(new Error("Timed out waiting for immediate message")),
                    10_000
                );

                broker = undefined as any;

                hoppity
                    .service(SERVICE_NAME, {
                        connection: { url: process.env.RABBITMQ_URL! },
                        handlers: [
                            onEvent(TestDomain.events.delayedOrder, async payload => {
                                clearTimeout(timer);
                                receivedContent = payload;
                                receivedAt = Date.now();
                                resolve();
                            }),
                        ],
                        publishes: [TestDomain.events.delayedOrder],
                    })
                    .use(withCustomLogger({ logger: silentLogger }))
                    .build()
                    .then(async b => {
                        broker = b;
                        publishedAt = Date.now();
                        // No delay option — immediate delivery
                        await broker.publishEvent(TestDomain.events.delayedOrder, {
                            order: "IMMEDIATE_STROMBOLI",
                            table: 1,
                        });
                    })
                    .catch(reject);
            });

            await receivedPromise;
        }, 15_000);

        afterAll(async () => {
            if (broker) {
                await broker.shutdown();
            }
        });

        it("should deliver the message with correct content", () => {
            expect(receivedContent).toEqual({
                order: "IMMEDIATE_STROMBOLI",
                table: 1,
            });
        });

        it("should deliver within 2s (immediate, not delayed)", () => {
            const elapsed = receivedAt - publishedAt;
            expect(elapsed).toBeLessThan(2_000);
        });
    });
});
