import type { Attributes } from "@opentelemetry/api";
import type { InboundMetadata, OutboundMetadata } from "@apogeelabs/hoppity";

/**
 * Builds OTel semantic attributes for an inbound (handler) message.
 * Follows the OpenTelemetry messaging semantic conventions for RabbitMQ.
 */
export function buildInboundAttributes(meta: InboundMetadata): Attributes {
    return {
        "messaging.system": "rabbitmq",
        "messaging.operation.type": "receive",
        "messaging.destination.name": meta.contract.exchange,
        "hoppity.domain": meta.contract._domain,
        "hoppity.operation": meta.contract._name,
        "hoppity.kind": meta.kind,
        "service.name": meta.serviceName,
    };
}

/**
 * Builds OTel semantic attributes for an outbound (publish) message.
 * Follows the OpenTelemetry messaging semantic conventions for RabbitMQ.
 */
export function buildOutboundAttributes(meta: OutboundMetadata): Attributes {
    return {
        "messaging.system": "rabbitmq",
        "messaging.operation.type": "publish",
        "messaging.destination.name": meta.contract.exchange,
        "hoppity.domain": meta.contract._domain,
        "hoppity.operation": meta.contract._name,
        "hoppity.kind": meta.kind,
        "service.name": meta.serviceName,
    };
}
