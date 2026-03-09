/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Full pipeline integration-style unit test.
 *
 * Verifies that the three public APIs compose correctly:
 *   defineDomain → buildServiceTopology → withOutboundExchange
 *
 * This is a real execution with no mocks. If any naming convention or topology
 * generation logic drifts, this test will catch it at the seam between layers.
 */

export default {};

import { z } from "zod";
import { BrokerConfig } from "rascal";
import { MiddlewareContext } from "@apogeelabs/hoppity";
import { defineDomain } from "./defineDomain";
import { buildServiceTopology } from "./buildServiceTopology";
import { withOutboundExchange } from "./withOutboundExchange";

describe("hoppity-contracts > pipeline integration", () => {
    let result: any,
        mockLogger: any,
        mockContext: MiddlewareContext,
        BASE_TOPOLOGY: BrokerConfig,
        GiftingDomain: ReturnType<typeof defineDomain>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
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
        GiftingDomain = defineDomain("gifting", {
            events: { giftCreated: z.object({ giftId: z.string() }) },
            commands: { processGift: z.object({ giftId: z.string(), recipientId: z.string() }) },
        });
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

    describe("when chaining defineDomain → buildServiceTopology → withOutboundExchange", () => {
        beforeEach(() => {
            // Step 1: build service topology from contract declarations
            const serviceTopology = buildServiceTopology(BASE_TOPOLOGY, "gifting_processor", t => {
                t.publishesEvent(GiftingDomain.events.giftCreated);
                t.handlesCommand(GiftingDomain.commands.processGift);
            });

            // Step 2: apply outbound exchange middleware
            const middleware = withOutboundExchange("gifting_processor");
            result = middleware(serviceTopology, mockContext);
        });

        it("should create the outbound fanout exchange", () => {
            expect(
                (result.topology.vhosts as any)["/"].exchanges["gifting_processor_outbound"]
            ).toEqual({
                type: "fanout",
                options: { durable: true },
            });
        });

        it("should create the domain topic exchange", () => {
            expect((result.topology.vhosts as any)["/"].exchanges["gifting"]).toEqual({
                type: "topic",
                options: { durable: true },
            });
        });

        it("should create the handler queue for processGift", () => {
            expect(
                (result.topology.vhosts as any)["/"].queues[
                    "gifting_processor_gifting_command_process_gift"
                ]
            ).toEqual({
                options: {
                    durable: true,
                    arguments: { "x-queue-type": "quorum" },
                },
            });
        });

        it("should create the domain → queue binding for processGift", () => {
            expect(
                (result.topology.vhosts as any)["/"].bindings[
                    "gifting_processor_gifting_command_process_gift_binding"
                ]
            ).toEqual({
                source: "gifting",
                destination: "gifting_processor_gifting_command_process_gift",
                destinationType: "queue",
                bindingKey: "gifting.command.process_gift",
            });
        });

        it("should create the outbound → domain exchange binding", () => {
            expect(
                (result.topology.vhosts as any)["/"].bindings[
                    "gifting_processor_outbound_to_gifting_binding"
                ]
            ).toEqual({
                source: "gifting_processor_outbound",
                destination: "gifting",
                destinationType: "exchange",
                bindingKey: "#",
            });
        });

        it("should rewrite the giftCreated publication to target the outbound", () => {
            expect(
                (result.topology.vhosts as any)["/"].publications["gifting_event_gift_created"]
                    .exchange
            ).toBe("gifting_processor_outbound");
        });

        it("should preserve the routing key on the rewritten publication", () => {
            expect(
                (result.topology.vhosts as any)["/"].publications["gifting_event_gift_created"]
                    .routingKey
            ).toBe("gifting.event.gift_created");
        });

        it("should create the subscription for processGift", () => {
            expect(
                (result.topology.vhosts as any)["/"].subscriptions["gifting_command_process_gift"]
            ).toEqual({
                queue: "gifting_processor_gifting_command_process_gift",
                redeliveries: { limit: 5 },
            });
        });

        it("should store the outbound exchange name in context", () => {
            expect(mockContext.data.outboundExchange).toBe("gifting_processor_outbound");
        });
    });
});
