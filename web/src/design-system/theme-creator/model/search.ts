import { matchRows, searchIndex } from "../../tokens/search.ts";
import {
  sectionComponents,
  sectionOf,
  sectionSemantics,
  sections,
  type SectionId,
} from "./controls.ts";

/** The editor's "Find a token" (theme-creator R4.3): the tokens page's matching, over its rows. */

/** A section's two disclosures: its semantic and its component tokens. */
export type DisclosureId = `${SectionId}-${"semantic" | "component"}`;

export const disclosureId = (section: SectionId, tier: "semantic" | "component"): DisclosureId =>
  `${section}-${tier}`;

/** Every row in the editor, in section order: semantic tokens, then component tokens. */
const editorTokens = sections.flatMap(({ id }) => [
  ...sectionSemantics[id],
  ...sectionComponents[id],
]);

export const editorIndex = searchIndex(editorTokens, (token) => {
  const section = sectionOf(token.tier === "component" ? token.aliases : token.name);
  return section === null
    ? ""
    : disclosureId(section, token.tier === "component" ? "component" : "semantic");
});

/** The rows matching a query and the disclosures holding them, or null for an empty query. */
export function editorMatches(
  query: string,
): { rows: ReadonlySet<string>; disclosures: ReadonlySet<string> } | null {
  const rows = matchRows(editorIndex, query);
  if (rows === null) return null;
  const disclosures = new Set(
    editorIndex.filter(({ rowId }) => rows.has(rowId)).map(({ groupId }) => groupId),
  );
  return { rows, disclosures };
}
