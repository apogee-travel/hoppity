/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrokerConfig } from "rascal";

/**
 * Merges a raw (base) topology with a derived topology.
 *
 * The raw topology is the base layer — its vhost structure and connection config
 * are preserved. The derived topology is layered on top: its exchanges, queues,
 * bindings, publications, and subscriptions are merged into each matching vhost.
 *
 * Collision strategy: derived topology wins on a per-key basis within each
 * collection. If both raw and derived define an exchange with the same name,
 * the derived definition takes precedence. This is intentional — the framework-
 * generated topology is the authoritative source for contract-derived artifacts.
 *
 * If no raw topology is provided, the derived topology is returned as-is.
 */
export function mergeTopology(
    rawTopology: BrokerConfig | undefined,
    derivedTopology: BrokerConfig
): BrokerConfig {
    if (!rawTopology || !rawTopology.vhosts) {
        return derivedTopology;
    }

    if (!derivedTopology.vhosts) {
        return structuredClone(rawTopology);
    }

    const merged: BrokerConfig = structuredClone(rawTopology);

    // Merge each vhost from derived topology into the raw topology clone.
    // Vhosts present in derived but not in raw are added wholesale.
    for (const [vhostKey, derivedVhost] of Object.entries(derivedTopology.vhosts)) {
        const rawVhost = (merged.vhosts as any)[vhostKey];

        if (!rawVhost) {
            (merged.vhosts as any)[vhostKey] = structuredClone(derivedVhost);
            continue;
        }

        const v = rawVhost as any;
        const d = derivedVhost as any;

        // Merge each topology collection — derived keys win on collision.
        v.exchanges = { ...(v.exchanges ?? {}), ...(d.exchanges ?? {}) };
        v.queues = { ...(v.queues ?? {}), ...(d.queues ?? {}) };
        v.bindings = { ...(v.bindings ?? {}), ...(d.bindings ?? {}) };
        v.publications = { ...(v.publications ?? {}), ...(d.publications ?? {}) };
        v.subscriptions = { ...(v.subscriptions ?? {}), ...(d.subscriptions ?? {}) };
    }

    return merged;
}
