/**
 * Barrel export for bookstore domain contracts.
 *
 * `OrdersDomain` and `CatalogDomain` are `defineDomain()` instances — typed contract
 * objects that describe every event, command, and RPC in their respective domains.
 * Services import these to declare their topology (via `buildServiceTopology`)
 * and to get typed publish/request methods on the broker (via `withOperations`).
 */
export { OrdersDomain } from "./orders";
export type { Order, OrderItem } from "./orders";
export { CatalogDomain } from "./catalog";
