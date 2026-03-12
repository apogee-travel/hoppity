/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

import { z } from "zod";
import { defineDomain } from "../contracts/defineDomain";
import { onEvent } from "./onEvent";
import { onCommand } from "./onCommand";
import { onRpc } from "./onRpc";

const TestDomain = defineDomain("grub", {
    events: { burgerReady: z.object({ burgerId: z.string(), toppings: z.array(z.string()) }) },
    commands: { flipBurger: z.object({ burgerId: z.string() }) },
    rpc: {
        orderBurger: {
            request: z.object({ size: z.enum(["small", "medium", "large"]) }),
            response: z.object({ burgerId: z.string(), estimatedWait: z.number() }),
        },
    },
});

describe("hoppity > handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    describe("onEvent", () => {
        describe("when called with a contract and handler", () => {
            let result: any;
            const mockHandler = jest.fn();

            beforeEach(() => {
                result = onEvent(TestDomain.events.burgerReady, mockHandler);
            });

            it("should set _kind to event", () => {
                expect(result._kind).toBe("event");
            });

            it("should attach the contract", () => {
                expect(result.contract).toBe(TestDomain.events.burgerReady);
            });

            it("should attach the handler", () => {
                expect(result.handler).toBe(mockHandler);
            });

            it("should not include options when not provided", () => {
                expect(result.options).toBeUndefined();
            });
        });

        describe("when called with options", () => {
            let result: any;
            const mockHandler = jest.fn();
            const opts = { queueType: "classic" as const, redeliveries: { limit: 3 } };

            beforeEach(() => {
                result = onEvent(TestDomain.events.burgerReady, mockHandler, opts);
            });

            it("should attach the options", () => {
                expect(result.options).toEqual(opts);
            });
        });
    });

    describe("onCommand", () => {
        describe("when called with a contract and handler", () => {
            let result: any;
            const mockHandler = jest.fn();

            beforeEach(() => {
                result = onCommand(TestDomain.commands.flipBurger, mockHandler);
            });

            it("should set _kind to command", () => {
                expect(result._kind).toBe("command");
            });

            it("should attach the contract", () => {
                expect(result.contract).toBe(TestDomain.commands.flipBurger);
            });

            it("should attach the handler", () => {
                expect(result.handler).toBe(mockHandler);
            });

            it("should not include options when not provided", () => {
                expect(result.options).toBeUndefined();
            });
        });

        describe("when called with options including deadLetter config", () => {
            let result: any;
            const mockHandler = jest.fn();
            const opts = {
                queueType: "quorum" as const,
                deadLetter: { exchange: "grub-dlx", routingKey: "dead" },
            };

            beforeEach(() => {
                result = onCommand(TestDomain.commands.flipBurger, mockHandler, opts);
            });

            it("should attach the options", () => {
                expect(result.options).toEqual(opts);
            });
        });
    });

    describe("onRpc", () => {
        describe("when called with a contract and handler", () => {
            let result: any;
            const mockHandler = jest.fn();

            beforeEach(() => {
                result = onRpc(TestDomain.rpc.orderBurger, mockHandler);
            });

            it("should set _kind to rpc", () => {
                expect(result._kind).toBe("rpc");
            });

            it("should attach the contract", () => {
                expect(result.contract).toBe(TestDomain.rpc.orderBurger);
            });

            it("should attach the handler", () => {
                expect(result.handler).toBe(mockHandler);
            });

            it("should not include options when not provided", () => {
                expect(result.options).toBeUndefined();
            });
        });

        describe("when called with options", () => {
            let result: any;
            const mockHandler = jest.fn();
            const opts = { redeliveries: { limit: 10 } };

            beforeEach(() => {
                result = onRpc(TestDomain.rpc.orderBurger, mockHandler, opts);
            });

            it("should attach the options", () => {
                expect(result.options).toEqual(opts);
            });
        });
    });
});
