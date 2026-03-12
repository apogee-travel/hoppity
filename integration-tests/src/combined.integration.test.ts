/* eslint-disable @typescript-eslint/no-explicit-any */
import hoppity, { ServiceBroker, defineDomain, onRpc, onEvent } from "@apogeelabs/hoppity";
import { z } from "zod";
import { createTestTopology } from "./helpers/createTestTopology";
import { silentLogger } from "./helpers/silentLogger";

// Isolated domain names to avoid collisions between integration test suites
const CombinedDomain = defineDomain("combined_test", {
    events: {
        thingHappened: z.object({ event: z.string() }),
    },
    rpc: {
        greet: {
            request: z.object({ name: z.string() }),
            response: z.object({ greeting: z.string() }),
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

describe("combined: multiple middleware on one broker", () => {
    describe("when logger + rpc + event handler middleware are all applied", () => {
        let serverBroker: ServiceBroker;
        let clientBroker: ServiceBroker;
        let rpcResult: any;
        let subscriptionMessages: any[];
        let subscriptionReceived: Promise<void>;
        let resolveSubscription: () => void;

        beforeAll(async () => {
            subscriptionMessages = [];
            subscriptionReceived = new Promise<void>(resolve => {
                resolveSubscription = resolve;
            });

            // Server handles RPC greet AND subscribes to thingHappened events
            const greetHandler = onRpc(CombinedDomain.rpc.greet, async (request, _ctx) => ({
                greeting: `HELLO_${request.name}`,
            }));

            const thingHappenedHandler = onEvent(
                CombinedDomain.events.thingHappened,
                async (content, _ctx) => {
                    subscriptionMessages.push(content);
                    resolveSubscription();
                }
            );

            serverBroker = await hoppity
                .service("combined-server", {
                    connection: makeConnection(),
                    handlers: [greetHandler, thingHappenedHandler],
                    // Server also publishes thingHappened so it can fire events
                    publishes: [CombinedDomain.events.thingHappened],
                    logger: silentLogger,
                })
                .build();

            await new Promise(r => setTimeout(r, 500));

            // Client calls the RPC and publishes events
            clientBroker = await hoppity
                .service("combined-client", {
                    connection: makeConnection(),
                    publishes: [CombinedDomain.rpc.greet, CombinedDomain.events.thingHappened],
                    logger: silentLogger,
                })
                .build();

            rpcResult = await clientBroker.request(CombinedDomain.rpc.greet, { name: "MCFLY" });
            await clientBroker.publishEvent(CombinedDomain.events.thingHappened, {
                event: "FLUX_CAPACITOR_ENGAGED",
            });
            await subscriptionReceived;
        }, 30_000);

        afterAll(async () => {
            if (clientBroker) await clientBroker.shutdown();
            if (serverBroker) await serverBroker.shutdown();
        });

        it("should complete the RPC round-trip", () => {
            expect(rpcResult).toEqual({ greeting: "HELLO_MCFLY" });
        });

        it("should deliver the event message to the handler", () => {
            expect(subscriptionMessages).toHaveLength(1);
            expect(subscriptionMessages[0]).toEqual({
                event: "FLUX_CAPACITOR_ENGAGED",
            });
        });
    });
});
