import { primitives } from "../generated/primitives.ts";
import type { PrimitiveTokenMeta } from "./types.ts";

/**
 * Generated primitive metadata, widened from its literal type. Docs-only: only the tokens page
 * imports it, so component pages' bundles don't carry it (ds-tokens R9.3).
 */
export const primitiveTokens: readonly PrimitiveTokenMeta[] = primitives;
