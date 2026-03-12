/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerAsPromised, PublicationConfig } from "rascal";
import { ZodTypeAny } from "zod";
import { DelayConfig } from "../contracts/types";
import { getDelayedWaitPublicationName } from "../contracts/naming";
import { ServiceBroker } from "./types";
import {
    DelayedDeliveryEnvelope,
    DelayedDeliveryError,
    DelayedDeliveryErrorCode,
} from "./delayedDeliveryTypes";
import { Interceptor, OutboundMetadata } from "../interceptors/types";
import { composeOutboundWrappers } from "../interceptors/compose";

interface WireOutboundOptions {
    validateOutbound: boolean;
    interceptors?: Interceptor[];
    serviceName?: string;
}

/**
 * Resolves the actual numeric delay from the call-site override and the contract config.
 *
 * `delay: true` means "use the contract's default" — it's an error if the contract
 * declared `delay: true` (no default) rather than `delay: { default: N }`.
 *
 * `delay: number` is used as-is after validation that it's > 0.
 */
function resolveDelay(
    delayOverride: number | true,
    contractDelay: DelayConfig | undefined,
    contractIdentifier: string
): number {
    if (delayOverride === true) {
        if (contractDelay === true || contractDelay === undefined) {
            throw new DelayedDeliveryError(
                DelayedDeliveryErrorCode.INVALID_DELAY,
                `${contractIdentifier}: { delay: true } requires the contract to declare a default delay (delay: { default: N }). ` +
                    `This contract has no default.`,
                { contractDelay }
            );
        }
        return contractDelay.default;
    }

    // NaN and Infinity both pass a plain `<= 0` check but are nonsensical TTL values,
    // so we reject them explicitly with Number.isFinite before the sign check.
    if (!Number.isFinite(delayOverride) || delayOverride <= 0) {
        throw new DelayedDeliveryError(
            DelayedDeliveryErrorCode.INVALID_DELAY,
            `${contractIdentifier}: delay must be greater than 0 (got ${delayOverride}).`,
            { providedDelay: delayOverride }
        );
    }

    return delayOverride;
}

/**
 * Publishes a message via the delayed delivery pipeline.
 *
 * Wraps the message in a DelayedDeliveryEnvelope and publishes it to the contract's
 * wait queue with per-message TTL equal to the resolved delay. RabbitMQ dead-letters
 * the envelope to the ready queue when the TTL expires, where it is unwrapped and
 * re-published to the original destination.
 */
async function publishDelayed(
    broker: BrokerAsPromised,
    contract: {
        _domain: string;
        _type: string;
        _name: string;
        publicationName: string;
        delay?: DelayConfig;
    },
    message: any,
    overrides: PublicationConfig & { delay?: number | true },
    serviceName: string
): Promise<void> {
    const { delay: delayOverride, ...cleanOverrides } = overrides;
    const contractIdentifier = `${contract._domain}.${contract._type}.${contract._name}`;

    const actualDelay = resolveDelay(
        delayOverride as number | true,
        contract.delay,
        contractIdentifier
    );

    const waitPublicationName = getDelayedWaitPublicationName(
        contract._domain,
        contract._type,
        contract._name
    );

    const envelope: DelayedDeliveryEnvelope = {
        originalMessage: message,
        originalPublication: contract.publicationName,
        originalOverrides: cleanOverrides as PublicationConfig,
        targetDelay: actualDelay,
        createdAt: Date.now(),
        retryCount: 0,
    };

    try {
        await broker.publish(waitPublicationName, envelope, {
            options: { expiration: actualDelay, persistent: true },
        });
    } catch (error) {
        throw new DelayedDeliveryError(
            DelayedDeliveryErrorCode.QUEUE_FULL,
            `Failed to publish delayed message for '${contractIdentifier}': ${error instanceof Error ? error.message : String(error)}`,
            { originalError: error, serviceName, waitPublicationName, actualDelay }
        );
    }
}

/**
 * Attaches publishEvent and sendCommand methods to the broker instance.
 *
 * Both methods resolve the publication name from the contract — no string
 * literals required at the call site. Validation is optional and controlled
 * by the validateOutbound flag in the service config.
 *
 * When interceptors are provided, outbound wrappers are composed per-call
 * because the contract isn't known until call time. Zod validation runs
 * before the wrapper chain so interceptors receive validated data.
 *
 * When overrides include `delay`, the message is routed through the delayed
 * delivery pipeline (wait queue → TTL expiry → re-publish). Passing `delay`
 * to a contract that doesn't declare delay support is a runtime error.
 */
export function wireOutbound(broker: BrokerAsPromised, options: WireOutboundOptions): void {
    const { validateOutbound, interceptors = [], serviceName = "" } = options;

    (broker as ServiceBroker).publishEvent = async function publishEvent<
        TSchema extends ZodTypeAny,
    >(
        contract: {
            schema: TSchema;
            publicationName: string;
            _type: string;
            _domain: string;
            _name: string;
            delay?: DelayConfig;
        },
        message: any,
        overrides?: PublicationConfig & { delay?: number | true }
    ): Promise<void> {
        if (validateOutbound) {
            contract.schema.parse(message);
        }

        if (overrides?.delay !== undefined) {
            if (contract.delay === undefined) {
                throw new DelayedDeliveryError(
                    DelayedDeliveryErrorCode.INVALID_DELAY,
                    `Cannot use delayed delivery on '${contract._domain}.${contract._type}.${contract._name}' — this contract does not declare delay support.`
                );
            }
            return publishDelayed(broker, contract, message, overrides, serviceName);
        }

        const meta: OutboundMetadata = {
            contract: contract as any,
            kind: "event",
            serviceName,
        };

        const publish = composeOutboundWrappers(
            (msg, ovr) => broker.publish(contract.publicationName, msg, ovr),
            interceptors,
            meta
        );

        await publish(message, overrides);
    };

    (broker as ServiceBroker).sendCommand = async function sendCommand<TSchema extends ZodTypeAny>(
        contract: {
            schema: TSchema;
            publicationName: string;
            _type: string;
            _domain: string;
            _name: string;
            delay?: DelayConfig;
        },
        message: any,
        overrides?: PublicationConfig & { delay?: number | true }
    ): Promise<void> {
        if (validateOutbound) {
            contract.schema.parse(message);
        }

        if (overrides?.delay !== undefined) {
            if (contract.delay === undefined) {
                throw new DelayedDeliveryError(
                    DelayedDeliveryErrorCode.INVALID_DELAY,
                    `Cannot use delayed delivery on '${contract._domain}.${contract._type}.${contract._name}' — this contract does not declare delay support.`
                );
            }
            return publishDelayed(broker, contract, message, overrides, serviceName);
        }

        const meta: OutboundMetadata = {
            contract: contract as any,
            kind: "command",
            serviceName,
        };

        const publish = composeOutboundWrappers(
            (msg, ovr) => broker.publish(contract.publicationName, msg, ovr),
            interceptors,
            meta
        );

        await publish(message, overrides);
    };
}
