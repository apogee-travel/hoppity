/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerConfig } from "rascal";
import { MiddlewareContext, MiddlewareFunction, MiddlewareResult } from "@apogeelabs/hoppity";

/**
 * Middleware factory that inserts a per-service fanout outbound exchange.
 *
 * Why: A fanout outbound exchange lets you tap all outbound messages for a
 * service in one place (audit, metrics, replay) without changing domain exchange
 * topology. Publishers write to the outbound; the outbound fans to domain exchanges.
 *
 * What it does per vhost:
 *  1. Creates {serviceName}_outbound (fanout, durable)
 *  2. Scans all publications for the set of unique domain exchange names
 *  3. For each unique exchange, adds an exchange-to-exchange binding:
 *       source: outbound → destination: domain exchange
 *  4. Rewrites each publication's exchange to point at the outbound
 *
 * Subscriptions and inbound queue bindings are untouched — this is a
 * publisher-side concern only.
 */
export const withOutboundExchange = (serviceName: string): MiddlewareFunction => {
    if (!serviceName?.trim()) {
        throw new Error(
            "withOutboundExchange: serviceName is required and must be a non-empty string"
        );
    }

    const outboundExchangeName = `${serviceName}_outbound`;

    return (topology: BrokerConfig, context: MiddlewareContext): MiddlewareResult => {
        context.logger.info(
            `[OutboundExchange] Applying outbound exchange middleware for service: ${serviceName}`
        );

        const modifiedTopology = structuredClone(topology);

        if (!modifiedTopology.vhosts) {
            modifiedTopology.vhosts = {};
        }

        Object.keys(modifiedTopology.vhosts).forEach(vhostKey => {
            const vhost = modifiedTopology.vhosts![vhostKey];

            ensureCollections(vhost);

            // Add the fanout outbound exchange for this service
            (vhost.exchanges as any)[outboundExchangeName] = {
                type: "fanout",
                options: { durable: true },
            };

            const publications = vhost.publications as any;

            // Collect the unique set of domain exchanges targeted by publications
            const domainExchanges = new Set<string>();
            for (const pubName of Object.keys(publications)) {
                const exchange: string | undefined = publications[pubName].exchange;
                // Skip publications that already target the outbound or have no exchange
                if (exchange && exchange !== outboundExchangeName) {
                    domainExchanges.add(exchange);
                }
            }

            // Bind outbound fanout → each unique domain exchange
            // destinationType: "exchange" is required for exchange-to-exchange bindings
            for (const domainExchange of domainExchanges) {
                const bindingName = `${outboundExchangeName}_to_${domainExchange}_binding`;
                (vhost.bindings as any)[bindingName] = {
                    source: outboundExchangeName,
                    destination: domainExchange,
                    destinationType: "exchange",
                    bindingKey: "#",
                };
                context.logger.debug(
                    `[OutboundExchange] Bound ${outboundExchangeName} → ${domainExchange} (exchange-to-exchange)`
                );
            }

            // Rewrite publications to target the outbound exchange, preserving routing keys
            for (const pubName of Object.keys(publications)) {
                const pub = publications[pubName];
                if (pub.exchange && pub.exchange !== outboundExchangeName) {
                    publications[pubName] = {
                        ...pub,
                        exchange: outboundExchangeName,
                    };
                }
            }

            context.logger.debug(
                `[OutboundExchange] Created outbound exchange '${outboundExchangeName}' in vhost '${vhostKey}'`
            );
        });

        // Make the outbound exchange name available to downstream middleware
        context.data.outboundExchange = outboundExchangeName;

        return { topology: modifiedTopology };
    };
};

function ensureCollections(vhost: any): void {
    if (!vhost.exchanges) vhost.exchanges = {};
    if (!vhost.bindings) vhost.bindings = {};
    if (!vhost.publications) vhost.publications = {};
}
