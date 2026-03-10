/* eslint-disable @typescript-eslint/no-explicit-any */

export default {};

const mockWireHandlers = jest.fn();
const mockWireEventCommandOutbound = jest.fn();
const mockWireRpcHandlers = jest.fn();
const mockWireRpcOutbound = jest.fn();
const mockCorrelationManager = {
    addRequest: jest.fn(),
    resolveRequest: jest.fn(),
    rejectRequest: jest.fn(),
    cancelRequest: jest.fn(),
    cleanup: jest.fn(),
};

jest.mock("./wireHandlers", () => ({
    wireHandlers: mockWireHandlers,
    wireEventCommandOutbound: mockWireEventCommandOutbound,
}));

jest.mock("./rpc", () => ({
    wireRpcHandlers: mockWireRpcHandlers,
    wireRpcOutbound: mockWireRpcOutbound,
}));

jest.mock("./correlationManager", () => ({
    createCorrelationManager: () => mockCorrelationManager,
}));

import { z } from "zod";
import { onEvent, onCommand, onRpc } from "./handlers";
import { EventContract, CommandContract, RpcContract } from "@apogeelabs/hoppity-contracts";

const baseTopology = {
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

const mockContext: any = {
    logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
    middlewareNames: [],
    data: {},
};

const eventContract: EventContract = {
    _type: "event",
    _domain: "order",
    _name: "placed",
    schema: z.object({ orderId: z.string() }),
    exchange: "order",
    routingKey: "order.event.placed",
    publicationName: "order_event_placed",
    subscriptionName: "order_event_placed",
};

const commandContract: CommandContract = {
    _type: "command",
    _domain: "inventory",
    _name: "reserve",
    schema: z.object({ itemId: z.string() }),
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

describe("hoppity-operations > src > withOperations", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        mockWireHandlers.mockResolvedValue(undefined);
        mockWireRpcHandlers.mockResolvedValue(undefined);
        mockWireRpcOutbound.mockResolvedValue(undefined);
    });

    describe("withOperations", () => {
        describe("when serviceName is empty", () => {
            let error: any;

            beforeEach(async () => {
                const { withOperations } = await import("./withOperations");
                try {
                    withOperations({ serviceName: "", instanceId: "1", handlers: [] });
                } catch (e) {
                    error = e;
                }
            });

            it("should throw a validation error", () => {
                expect(error).toEqual(
                    new Error(
                        "withOperations: serviceName is required and must be a non-empty string"
                    )
                );
            });
        });

        describe("when instanceId is empty", () => {
            let error: any;

            beforeEach(async () => {
                const { withOperations } = await import("./withOperations");
                try {
                    withOperations({ serviceName: "warehouse", instanceId: "", handlers: [] });
                } catch (e) {
                    error = e;
                }
            });

            it("should throw a validation error", () => {
                expect(error).toEqual(
                    new Error(
                        "withOperations: instanceId is required and must be a non-empty string"
                    )
                );
            });
        });

        describe("when topology has no vhosts property", () => {
            let result: any;

            beforeEach(async () => {
                const { withOperations } = await import("./withOperations");
                const middleware = withOperations({
                    serviceName: "warehouse",
                    instanceId: "1",
                    handlers: [],
                });
                result = middleware({} as any, mockContext);
            });

            it("should initialize vhosts as an empty object", () => {
                expect(result.topology.vhosts).toEqual({});
            });
        });

        describe("when no RPC handlers are declared", () => {
            let result: any;
            let handlers: any[];

            beforeEach(async () => {
                handlers = [
                    onEvent(eventContract, jest.fn()),
                    onCommand(commandContract, jest.fn()),
                ];
                const { withOperations } = await import("./withOperations");
                const middleware = withOperations({
                    serviceName: "warehouse",
                    instanceId: "1",
                    handlers,
                });
                result = middleware(baseTopology as any, mockContext);
            });

            it("should not add reply queue to topology", () => {
                expect(result.topology.vhosts["/"].queues).not.toHaveProperty("warehouse_1_reply");
            });

            it("should not add reply subscription to topology", () => {
                expect(result.topology.vhosts["/"].subscriptions).not.toHaveProperty(
                    "warehouse_1_reply_subscription"
                );
            });

            it("should not add rpc_reply publication to topology", () => {
                expect(result.topology.vhosts["/"].publications).not.toHaveProperty("rpc_reply");
            });

            it("should store operationsConfig in context.data", () => {
                expect(mockContext.data.operationsConfig).toEqual(
                    expect.objectContaining({
                        serviceName: "warehouse",
                        instanceId: "1",
                        hasRpcHandlers: false,
                        handlerCount: 2,
                    })
                );
            });

            it("should not mutate the original topology", () => {
                expect(baseTopology.vhosts["/"].queues).toEqual({});
            });

            it("should return an onBrokerCreated callback", () => {
                expect(typeof result.onBrokerCreated).toBe("function");
            });
        });

        describe("when RPC handlers are declared", () => {
            let result: any;
            let handlers: any[];

            beforeEach(async () => {
                handlers = [onRpc(rpcContract, jest.fn())];
                const { withOperations } = await import("./withOperations");
                const middleware = withOperations({
                    serviceName: "warehouse",
                    instanceId: "1",
                    handlers,
                });
                result = middleware(baseTopology as any, mockContext);
            });

            it("should add reply queue to topology", () => {
                expect(result.topology.vhosts["/"].queues).toHaveProperty("warehouse_1_reply");
            });

            it("should configure reply queue as exclusive and auto-delete", () => {
                expect(result.topology.vhosts["/"].queues["warehouse_1_reply"]).toEqual({
                    options: { exclusive: true, autoDelete: true },
                });
            });

            it("should add reply subscription to topology", () => {
                expect(result.topology.vhosts["/"].subscriptions).toHaveProperty(
                    "warehouse_1_reply_subscription"
                );
            });

            it("should add rpc_reply publication with default exchange", () => {
                expect(result.topology.vhosts["/"].publications["rpc_reply"]).toEqual({
                    exchange: "",
                    routingKey: "{{replyTo}}",
                    options: { persistent: false },
                });
            });

            it("should store hasRpcHandlers as true in context.data", () => {
                expect(mockContext.data.operationsConfig.hasRpcHandlers).toBe(true);
            });
        });

        describe("when rpc_reply publication already exists in the topology", () => {
            let result: any;
            let handlers: any[];

            beforeEach(async () => {
                handlers = [onRpc(rpcContract, jest.fn())];
                const { withOperations } = await import("./withOperations");
                const middleware = withOperations({
                    serviceName: "warehouse",
                    instanceId: "1",
                    handlers,
                });
                const topologyWithExistingRpcReply = {
                    vhosts: {
                        "/": {
                            exchanges: {},
                            queues: {},
                            bindings: {},
                            publications: {
                                rpc_reply: { exchange: "", routingKey: "{{replyTo}}" },
                            },
                            subscriptions: {},
                        },
                    },
                };
                result = middleware(topologyWithExistingRpcReply as any, mockContext);
            });

            it("should not overwrite the existing rpc_reply publication", () => {
                expect(result.topology.vhosts["/"].publications["rpc_reply"]).toEqual({
                    exchange: "",
                    routingKey: "{{replyTo}}",
                });
            });

            it("should log a warning about the collision", () => {
                expect(mockContext.logger.warn).toHaveBeenCalledWith(
                    expect.stringContaining("rpc_reply publication already exists")
                );
            });
        });

        describe("when onBrokerCreated is called", () => {
            let onBrokerCreated: any;
            let handlers: any[];
            const mockBroker = {};

            beforeEach(async () => {
                handlers = [onEvent(eventContract, jest.fn()), onRpc(rpcContract, jest.fn())];
                const { withOperations } = await import("./withOperations");
                const middleware = withOperations({
                    serviceName: "warehouse",
                    instanceId: "1",
                    handlers,
                    defaultTimeout: 10_000,
                    validateInbound: false,
                    validateOutbound: true,
                });
                const result = middleware(baseTopology as any, mockContext);
                onBrokerCreated = result.onBrokerCreated;
                await onBrokerCreated(mockBroker);
            });

            it("should call wireHandlers with the broker and handlers", () => {
                expect(mockWireHandlers).toHaveBeenCalledTimes(1);
                expect(mockWireHandlers).toHaveBeenCalledWith(mockBroker, handlers, mockContext, {
                    validateInbound: false,
                });
            });

            it("should call wireEventCommandOutbound with the broker", () => {
                expect(mockWireEventCommandOutbound).toHaveBeenCalledTimes(1);
                expect(mockWireEventCommandOutbound).toHaveBeenCalledWith(mockBroker, {
                    validateOutbound: true,
                });
            });

            it("should call wireRpcHandlers with the broker and handlers", () => {
                expect(mockWireRpcHandlers).toHaveBeenCalledTimes(1);
                expect(mockWireRpcHandlers).toHaveBeenCalledWith(
                    mockBroker,
                    handlers,
                    mockContext,
                    { validateInbound: false }
                );
            });

            it("should call wireRpcOutbound with correct config", () => {
                expect(mockWireRpcOutbound).toHaveBeenCalledTimes(1);
                expect(mockWireRpcOutbound).toHaveBeenCalledWith(
                    mockBroker,
                    expect.objectContaining({
                        serviceName: "warehouse",
                        instanceId: "1",
                        replyQueueName: "warehouse_1_reply",
                        correlationManager: mockCorrelationManager,
                        defaultTimeout: 10_000,
                        validateInbound: false,
                        validateOutbound: true,
                    })
                );
            });
        });
    });
});
