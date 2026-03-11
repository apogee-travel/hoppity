import { onRpc } from "@apogeelabs/hoppity-operations";
import { CatalogDomain } from "@bookstore/contracts";
import { getAllProducts } from "../../store";

/**
 * Handles getStockLevels RPC — returns all products with current stock counts.
 * The runner queries this before and after key operations to display stock changes.
 */
export const getStockLevelsHandler = onRpc(
    CatalogDomain.rpc.getStockLevels,
    async (_request, _context) => {
        return { products: getAllProducts() };
    }
);
