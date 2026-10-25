import type { CustomProperty } from "../../../theme/apply-theme.ts";
import { componentTokens, semanticTokens } from "../../../tokens/metadata.ts";
import { builtInValue } from "./builtin.ts";
import type { ResolvedTheme } from "./types.ts";

/**
 * A resolved theme as custom properties (design §3.3). `diff`: what differs from the built-in
 * theme with the same scheme, plus re-pointed component tokens; a saved theme stores and applies
 * this. `full`: every semantic and component property, for "Copy CSS".
 */
export function themeVars(
  theme: ResolvedTheme,
  mode: "diff" | "full",
): Record<CustomProperty, string> {
  const vars: Record<CustomProperty, string> = {};
  for (const token of semanticTokens) {
    const css = theme.semantic[token.name]?.css;
    if (css === undefined) continue;
    if (mode === "full" || css !== builtInValue(token, theme.scheme).css) vars[token.cssVar] = css;
  }
  for (const token of componentTokens) {
    const target = theme.component[token.name] ?? token.aliases;
    if (mode === "full" || target !== token.aliases) {
      vars[token.cssVar] = `var(--${target.replaceAll(".", "-")})`;
    }
  }
  return vars;
}
