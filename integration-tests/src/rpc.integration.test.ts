/* eslint-disable @typescript-eslint/no-explicit-any */
import hoppity, { ServiceBroker, defineDomain, onRpc } from "@apogeelabs/hoppity";
import { z } from "zod";
import { createTestTopology } from "./helpers/createTestTopology";
import { silentLogger } from "./helpers/silentLogger";

// Test domain — isolated naming avoids collisions with other integration tests
const TestRpcDomain = defineDomain("rpc_test", {
    rpc: {
        echo: {
            request: z.object({ message: z.string() }),
            response: z.object({ echoed: z.string(), handler: z.string() }),
        },
        add: {
            request: z.object({ a: z.number(), b: z.number() }),
            response: z.object({ sum: z.number() }),
        },
    },
});

function makeConnection() {
    const topology = createTestTopology();
    const rawVhost = (topology.vhosts as any)["/"];
    return {
        url: rawVhost.connection.url as string,
        vhost: "/",
        options: { heartbeat: 5 },
    };
}

describe("rpc: request/response round-trip", () => {
    describe("when a handler is registered and a request is made", () => {
        let handlerBroker: ServiceBroker;
        let requesterBroker: ServiceBroker;
        let rpcResult: any;

        beforeAll(async () => {
            const echoHandler = onRpc(TestRpcDomain.rpc.echo, async (request, _ctx) => ({
                echoed: request.message,
                handler: "RPC_HANDLER_SVC",
            }));

            handlerBroker = await hoppity
                .service("rpc-handler-svc", {
                    connection: makeConnection(),
                    handlers: [echoHandler],
                    logger: silentLogger,
                })
                .build();

            // Small delay to let the subscription settle
            await new Promise(r => setTimeout(r, 500));

            requesterBroker = await hoppity
                .service("rpc-requester-svc", {
                    connection: makeConnection(),
                    publishes: [TestRpcDomain.rpc.echo],
                    logger: silentLogger,
                })
                .build();

            rpcResult = await requesterBroker.request(TestRpcDomain.rpc.echo, {
                message: "TALK_TO_ME_GOOSE",
            });
        }, 30_000);

        afterAll(async () => {
            if (requesterBroker) await requesterBroker.shutdown();
            if (handlerBroker) await handlerBroker.shutdown();
        });

        it("should receive the response from the handler", () => {
            expect(rpcResult).toEqual({
                echoed: "TALK_TO_ME_GOOSE",
                handler: "RPC_HANDLER_SVC",
            });
        });
    });

    describe("when no handler is registered for the RPC method", () => {
        let requesterBroker: ServiceBroker;
        let rpcError: Error;

        beforeAll(async () => {
            requesterBroker = await hoppity
                .service("rpc-lonely-svc", {
                    connection: makeConnection(),
                    publishes: [TestRpcDomain.rpc.echo],
                    defaultTimeout: 3_000,
                    logger: silentLogger,
                })
                .build();

            try {
                // No handler broker — request will time out
                await requesterBroker.request(TestRpcDomain.rpc.echo, {
                    message: "ANYONE_HOME",
                });
            } catch (err) {
                rpcError = err as Error;
            }
        }, 15_000);

        afterAll(async () => {
            if (requesterBroker) await requesterBroker.shutdown();
        });

        it("should reject with a timeout error", () => {
            expect(rpcError).toBeDefined();
        });
    });

    describe("when the handler processes multiple sequential requests", () => {
        let handlerBroker: ServiceBroker;
        let requesterBroker: ServiceBroker;
        let results: any[];

        beforeAll(async () => {
            const addHandler = onRpc(TestRpcDomain.rpc.add, async (request, _ctx) => ({
                sum: request.a + request.b,
            }));

            handlerBroker = await hoppity
                .service("rpc-multi-handler", {
                    connection: makeConnection(),
                    handlers: [addHandler],
                    logger: silentLogger,
                })
                .build();

            await new Promise(r => setTimeout(r, 500));

            requesterBroker = await hoppity
                .service("rpc-multi-requester", {
                    connection: makeConnection(),
                    publishes: [TestRpcDomain.rpc.add],
                    logger: silentLogger,
                })
                .build();

            results = [];
            results.push(await requesterBroker.request(TestRpcDomain.rpc.add, { a: 2, b: 3 }));
            results.push(await requesterBroker.request(TestRpcDomain.rpc.add, { a: 40, b: 2 }));
            results.push(await requesterBroker.request(TestRpcDomain.rpc.add, { a: 8675, b: 309 }));
        }, 30_000);

        afterAll(async () => {
            if (requesterBroker) await requesterBroker.shutdown();
            if (handlerBroker) await handlerBroker.shutdown();
        });

        it("should return correct results for each request", () => {
            expect(results).toEqual([{ sum: 5 }, { sum: 42 }, { sum: 8984 }]);
        });
    });
});
