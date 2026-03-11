import { defineDomain } from "@apogeelabs/hoppity-contracts";
import { z } from "zod";

/**
 * Catalog domain — a minimal read-only domain exposing stock visibility via RPC.
 *
 * The getStockLevels RPC is a deliberate exception to "catalog has no domain of
 * its own". It exists purely so the runner can display stock changes — without it,
 * catalog-service's state changes would be invisible to anything outside its own
 * stdout log.
 */
export const CatalogDomain = defineDomain("catalog", {
    rpc: {
        getStockLevels: {
            request: z.object({}),
            response: z.object({
                products: z.array(
                    z.object({
                        productId: z.string(),
                        productName: z.string(),
                        unitPrice: z.number(),
                        stock: z.number().int(),
                    })
                ),
            }),
        },
    },
});
