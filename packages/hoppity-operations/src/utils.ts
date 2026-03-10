import { ZodError } from "zod";

/**
 * Converts a ZodError into a human-readable string listing each failed field
 * and its message, suitable for log output.
 */
export function formatZodError(error: ZodError): string {
    return error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
}
