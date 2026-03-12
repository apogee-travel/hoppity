/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerAsPromised, PublicationConfig } from "rascal";
import { EventContract, CommandContract, RpcContract } from "../contracts/types";
import { z, ZodTypeAny } from "zod";

/**
 * The fully-wired broker returned by ServiceBuilder.build().
 *
 * Extends BrokerAsPromised with typed outbound methods derived from the
 * service's contracts. These methods are monkey-patched onto the broker
 * instance during the outbound wiring phase.
 */
export interface ServiceBroker extends BrokerAsPromised {
    /**
     * Publishes an event payload using the contract's derived publication name.
     * Validates the payload against the contract schema if validateOutbound is enabled.
     *
     * When overrides include `delay`, the message is routed through delayed delivery
     * (published to the wait queue with per-message TTL). The contract must declare
     * delay support or a runtime error is thrown. `delay: true` uses the contract's
     * default delay; `delay: number` overrides it.
     */
    publishEvent<TSchema extends ZodTypeAny>(
        contract: EventContract<any, any, TSchema>,
        message: z.infer<TSchema>,
        overrides?: PublicationConfig & { delay?: number | true }
    ): Promise<void>;

    /**
     * Sends a command payload using the contract's derived publication name.
     * Validates the payload against the contract schema if validateOutbound is enabled.
     *
     * Supports the same `delay` option as publishEvent — see that method for details.
     */
    sendCommand<TSchema extends ZodTypeAny>(
        contract: CommandContract<any, any, TSchema>,
        message: z.infer<TSchema>,
        overrides?: PublicationConfig & { delay?: number | true }
    ): Promise<void>;

    /**
     * Makes an RPC call and returns a Promise resolving to the response.
     * Times out after defaultTimeout ms (default 30s). Validates request if
     * validateOutbound is enabled, validates response if validateInbound is enabled.
     */
    request<TReq extends ZodTypeAny, TRes extends ZodTypeAny>(
        contract: RpcContract<any, any, TReq, TRes>,
        message: z.infer<TReq>,
        overrides?: PublicationConfig
    ): Promise<z.infer<TRes>>;

    /**
     * Cancels a pending RPC request by correlation ID.
     * Returns true if the request was found and cancelled, false if not found.
     */
    cancelRequest(correlationId: string): boolean;
}
