import { MAX_NAME_LENGTH } from "../../../theme/custom-themes.ts";

/** Pure helpers for the themes library and the draft toolbar (theme-creator-controls design §6). */

export type CardAction = "useOnSite" | "duplicate" | "rename" | "delete";

export type CardMenuItem = CardAction | "separator";

const copySuffix = " copy";

/** "<name> copy", cut so the result is at most MAX_NAME_LENGTH (30) characters, trimmed (R2.8). */
export function copyName(name: string): string {
  const base = name
    .trim()
    .slice(0, MAX_NAME_LENGTH - copySuffix.length)
    .trimEnd();
  // "copy" alone for an empty name, so the prefill never starts with a space.
  return `${base}${copySuffix}`.trimStart();
}

/** The card menu's items, in order (R2.6): Use on site is omitted while the theme is in use. */
export function cardMenuItems({ inUse }: { inUse: boolean }): readonly CardMenuItem[] {
  return [...(inUse ? [] : (["useOnSite"] as const)), "duplicate", "rename", "separator", "delete"];
}

/**
 * Index of the current section: the last heading at or above `line`, else 0 (R5.3). At the end of
 * the page it's the last one: a short last section can't scroll up to the line.
 */
export function currentSection(
  headingTops: readonly number[],
  line: number,
  atEnd = false,
): number {
  if (atEnd) return Math.max(0, headingTops.length - 1);
  return Math.max(
    0,
    headingTops.findLastIndex((top) => top <= line),
  );
}
