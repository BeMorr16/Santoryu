import { componentTokens, semanticTokens } from "../../../tokens/metadata.ts";
import type { ComponentTokenMeta, SemanticTokenMeta, TokenValue } from "../../../tokens/types.ts";
import type { BuiltInTheme } from "./types.ts";

/** The built-in themes' tokens, from the generated metadata (theme-creator design §3.2 step 1). */

export const semanticByName: ReadonlyMap<string, SemanticTokenMeta> = new Map(
  semanticTokens.map((token) => [token.name, token]),
);

export const componentByName: ReadonlyMap<string, ComponentTokenMeta> = new Map(
  componentTokens.map((token) => [token.name, token]),
);

/** A semantic token's value in a built-in theme. */
export function builtInValue(token: SemanticTokenMeta, theme: BuiltInTheme): TokenValue {
  return token.themed ? token.values[theme] : token.values.all;
}

/** A semantic token's value in a built-in theme, by name. */
export function builtInValueOf(name: string, theme: BuiltInTheme): TokenValue {
  const token = semanticByName.get(name);
  if (!token) throw new Error(`Unknown semantic token ${name}`);
  return builtInValue(token, theme);
}
