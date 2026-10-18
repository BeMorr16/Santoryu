import { tokens } from "../generated/tokens.ts";
import type { ComponentTokenMeta, SemanticTokenMeta, TokenMeta } from "./types.ts";

/** Generated token metadata, widened from its literal type so it can be filtered by tier. */
export const allTokens: readonly TokenMeta[] = tokens;

export const semanticTokens = allTokens.filter(
  (token): token is SemanticTokenMeta => token.tier === "semantic",
);

export const componentTokens = allTokens.filter(
  (token): token is ComponentTokenMeta => token.tier === "component",
);

/** Component tokens of one component, by kebab-case directory name (e.g. `theme-switcher`). */
export function componentTokensOf(component: string): readonly ComponentTokenMeta[] {
  return componentTokens.filter((token) => token.component === component);
}
