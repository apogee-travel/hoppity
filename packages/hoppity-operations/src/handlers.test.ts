/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import { z } from "zod";
import { onEvent, onCommand, onRpc } from "./handlers";
import { EventContract, CommandContract, RpcContract } from "@apogeelabs/hoppity-contracts";

// Minimal contract stubs — only the fields the handlers module reads
const eventContract: EventContract = {
    _type: "event",
    _domain: "inventory",
    _name: "created",
    schema: z.object({ itemId: z.string() }),
    exchange: "inventory",
    routingKey: "inventory.event.created",
    publicationName: "inventory_event_created",
    subscriptionName: "inventory_event_created",
};

const commandContract: CommandContract = {
    _type: "command",
    _domain: "inventory",
    _name: "reserve",
    schema: z.object({ itemId: z.string(), quantity: z.number() }),
    exchange: "inventory",
    routingKey: "inventory.command.reserve",
    publicationName: "inventory_command_reserve",
    subscriptionName: "inventory_command_reserve",
};

const rpcContract: RpcContract = {
    _type: "rpc",
    _domain: "pricing",
    _name: "getQuote",
    requestSchema: z.object({ itemId: z.string() }),
    responseSchema: z.object({ price: z.number() }),
    exchange: "pricing_rpc",
    routingKey: "pricing.rpc.get_quote",
    publicationName: "pricing_rpc_get_quote",
    subscriptionName: "pricing_rpc_get_quote",
};

describe("hoppity-operations > src > handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    describe("onEvent", () => {
        describe("when called with a contract and handler", () => {
            let result: any;
            const handler = jest.fn();

            beforeEach(() => {
                result = onEvent(eventContract, handler);
            });

            it("should set _kind to 'event'", () => {
                expect(result._kind).toBe("event");
            });

            it("should carry the contract reference", () => {
                expect(result.contract).toBe(eventContract);
            });

            it("should carry the handler reference", () => {
                expect(result.handler).toBe(handler);
            });
        });
    });

    describe("onCommand", () => {
        describe("when called with a contract and handler", () => {
            let result: any;
            const handler = jest.fn();

            beforeEach(() => {
                result = onCommand(commandContract, handler);
            });

            it("should set _kind to 'command'", () => {
                expect(result._kind).toBe("command");
            });

            it("should carry the contract reference", () => {
                expect(result.contract).toBe(commandContract);
            });

            it("should carry the handler reference", () => {
                expect(result.handler).toBe(handler);
            });
        });
    });

    describe("onRpc", () => {
        describe("when called with a contract and handler", () => {
            let result: any;
            const handler = jest.fn();

            beforeEach(() => {
                result = onRpc(rpcContract, handler);
            });

            it("should set _kind to 'rpc'", () => {
                expect(result._kind).toBe("rpc");
            });

            it("should carry the contract reference", () => {
                expect(result.contract).toBe(rpcContract);
            });

            it("should carry the handler reference", () => {
                expect(result.handler).toBe(handler);
            });
        });
    });
});
