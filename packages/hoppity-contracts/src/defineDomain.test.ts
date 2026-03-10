/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import { z } from "zod";
import { defineDomain } from "./defineDomain";

describe("hoppity-contracts > src > defineDomain", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    describe("defineDomain", () => {
        describe("when given a domain with one event, one command, one RPC operation", () => {
            let result: any;
            const itemSchema = z.object({ id: z.string(), quantity: z.number() });
            const reserveSchema = z.object({ itemId: z.string() });
            const quoteRequestSchema = z.object({ itemId: z.string() });
            const quoteResponseSchema = z.object({ price: z.number() });

            beforeEach(() => {
                result = defineDomain("donated_inventory", {
                    events: { created: itemSchema },
                    commands: { reserveItem: reserveSchema },
                    rpc: {
                        getQuote: { request: quoteRequestSchema, response: quoteResponseSchema },
                    },
                });
            });

            it("should return the domain name", () => {
                expect(result.domain).toBe("donated_inventory");
            });

            it("should assign _type event to the event contract", () => {
                expect(result.events.created._type).toBe("event");
            });

            it("should assign _domain to the event contract", () => {
                expect(result.events.created._domain).toBe("donated_inventory");
            });

            it("should assign _name to the event contract", () => {
                expect(result.events.created._name).toBe("created");
            });

            it("should derive the correct exchange for the event", () => {
                // Events and commands share the domain exchange (no suffix)
                expect(result.events.created.exchange).toBe("donated_inventory");
            });

            it("should derive the correct routing key for the event", () => {
                expect(result.events.created.routingKey).toBe("donated_inventory.event.created");
            });

            it("should derive the correct publicationName for the event", () => {
                expect(result.events.created.publicationName).toBe(
                    "donated_inventory_event_created"
                );
            });

            it("should derive the correct subscriptionName for the event", () => {
                expect(result.events.created.subscriptionName).toBe(
                    "donated_inventory_event_created"
                );
            });

            it("should preserve the event schema on the contract", () => {
                expect(result.events.created.schema).toBe(itemSchema);
            });

            it("should assign _type command to the command contract", () => {
                expect(result.commands.reserveItem._type).toBe("command");
            });

            it("should assign _domain to the command contract", () => {
                expect(result.commands.reserveItem._domain).toBe("donated_inventory");
            });

            it("should assign _name to the command contract", () => {
                expect(result.commands.reserveItem._name).toBe("reserveItem");
            });

            it("should derive the correct exchange for the command", () => {
                expect(result.commands.reserveItem.exchange).toBe("donated_inventory");
            });

            it("should derive the correct routing key for the command", () => {
                expect(result.commands.reserveItem.routingKey).toBe(
                    "donated_inventory.command.reserve_item"
                );
            });

            it("should derive the correct publicationName for the command", () => {
                expect(result.commands.reserveItem.publicationName).toBe(
                    "donated_inventory_command_reserve_item"
                );
            });

            it("should derive the correct subscriptionName for the command", () => {
                expect(result.commands.reserveItem.subscriptionName).toBe(
                    "donated_inventory_command_reserve_item"
                );
            });

            it("should preserve the command schema on the contract", () => {
                expect(result.commands.reserveItem.schema).toBe(reserveSchema);
            });

            it("should assign _type rpc to the rpc contract", () => {
                expect(result.rpc.getQuote._type).toBe("rpc");
            });

            it("should assign _domain to the rpc contract", () => {
                expect(result.rpc.getQuote._domain).toBe("donated_inventory");
            });

            it("should assign _name to the rpc contract", () => {
                expect(result.rpc.getQuote._name).toBe("getQuote");
            });

            it("should derive the rpc exchange with _rpc suffix", () => {
                expect(result.rpc.getQuote.exchange).toBe("donated_inventory_rpc");
            });

            it("should derive the correct routing key for the rpc operation", () => {
                expect(result.rpc.getQuote.routingKey).toBe("donated_inventory.rpc.get_quote");
            });

            it("should derive the correct publicationName for the rpc operation", () => {
                expect(result.rpc.getQuote.publicationName).toBe("donated_inventory_rpc_get_quote");
            });

            it("should derive the correct subscriptionName for the rpc operation", () => {
                expect(result.rpc.getQuote.subscriptionName).toBe(
                    "donated_inventory_rpc_get_quote"
                );
            });

            it("should preserve the request schema on the rpc contract", () => {
                expect(result.rpc.getQuote.requestSchema).toBe(quoteRequestSchema);
            });

            it("should preserve the response schema on the rpc contract", () => {
                expect(result.rpc.getQuote.responseSchema).toBe(quoteResponseSchema);
            });
        });

        describe("when domain has no events (empty events object)", () => {
            let result: any;

            beforeEach(() => {
                result = defineDomain("pricing", {
                    events: {},
                    commands: {},
                    rpc: {},
                });
            });

            it("should return an empty events object", () => {
                expect(result.events).toEqual({});
            });

            it("should return an empty commands object", () => {
                expect(result.commands).toEqual({});
            });

            it("should return an empty rpc object", () => {
                expect(result.rpc).toEqual({});
            });
        });

        describe("when definition omits events, commands, and rpc entirely", () => {
            let result: any;

            beforeEach(() => {
                result = defineDomain("shipping", {});
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
    });
});
