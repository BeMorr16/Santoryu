import { componentPages } from "../components/pages.ts";
import type { AnyTokenMeta } from "../../tokens/types.ts";
import { groupId, tokenRowId } from "./reference-ids.ts";

export interface SearchEntry {
  rowId: string;
  groupId: string;
  /** The token's searchable fields, lowercased, one per line (ds-tokens §9.1). */
  haystack: string;
}

/** Every field a query can match (R11.2). */
function fields(token: AnyTokenMeta): string[] {
  if (token.tier === "primitive") return [token.name, token.description, token.css];
  const values = Object.values(token.values).flatMap((value) => [value.css, value.ref]);
  const common = [token.name, token.cssVar, token.description, ...values];
  if (token.tier === "semantic") return common;
  const page = componentPages.find(({ id }) => id === token.component);
  return [...common, token.aliases, token.component, page?.name ?? ""];
}

/**
 * One entry per token. The data is static, so callers build it once at module scope. `groupOf`
 * names the group a row opens in: the tokens page's tier and category by default.
 */
export function searchIndex(
  tokens: readonly AnyTokenMeta[],
  groupOf: (token: AnyTokenMeta) => string = (token) => groupId(token.tier, token.category),
): readonly SearchEntry[] {
  return tokens.map((token) => ({
    rowId: tokenRowId(token.name),
    groupId: groupOf(token),
    haystack: fields(token).join("\n").toLowerCase(),
  }));
}

/**
 * The row ids whose fields contain every whitespace-separated term, case-insensitively, or null
 * for an empty query (no filter). Fields are separate lines, so a term can't span two (R11.2).
 */
export function matchRows(
  index: readonly SearchEntry[],
  query: string,
): ReadonlySet<string> | null {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return null;
  return new Set(
    index
      .filter(({ haystack }) => terms.every((term) => haystack.includes(term)))
      .map(({ rowId }) => rowId),
  );
}
