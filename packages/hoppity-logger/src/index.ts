/**
 * @module @apogeelabs/hoppity-logger
 *
 * Custom logger injection middleware for the hoppity pipeline.
 * Re-exports the {@link Logger} type from core so consumers don't need
 * a direct dependency on `@apogeelabs/hoppity` just to implement the interface.
 */
export { withCustomLogger } from "./withCustomLogger";
export type { WithCustomLoggerOptions } from "./withCustomLogger";

// Re-exported from core — avoids forcing consumers to depend on @apogeelabs/hoppity
// solely for the Logger type when they only use the logger middleware.
export type { Logger } from "@apogeelabs/hoppity";
