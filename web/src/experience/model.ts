import {
  skills,
  type Highlight,
  type Position,
  type Skill,
  type SkillCategoryId,
  type SkillId,
  type YearMonth,
} from "../content/experience.ts";

/** The skills currently toggled on. */
export type Selection = ReadonlySet<SkillId>;

/** A skill from the content's list, so its id is a `SkillId`. */
export type ListedSkill = Skill & { id: SkillId };

/** Nothing selected: every highlight shows (R7.1). */
export const emptySelection: Selection = new Set();

/** Skills at least one highlight lists (R6.3). */
export function usedSkillIds(list: readonly Position[]): ReadonlySet<SkillId> {
  return new Set(list.flatMap((position) => position.highlights.flatMap((h) => h.skills)));
}

/**
 * A category's skills in authored order (R6.4), split into used (toggles) and other (also worked
 * with, R6.2). `from` defaults to the content's skill list.
 */
export function categorySkills(
  category: SkillCategoryId,
  used: ReadonlySet<SkillId>,
  from: readonly ListedSkill[] = skills,
): { used: readonly ListedSkill[]; other: readonly ListedSkill[] } {
  const inCategory = from.filter((skill) => skill.category === category);
  const isUsed = (skill: ListedSkill) => used.has(skill.id);
  return {
    used: inCategory.filter(isUsed),
    other: inCategory.filter((skill) => !isUsed(skill)),
  };
}

/** Nothing selected matches everything (R7.1); otherwise OR (R7.2). */
export function matchesSelection(highlight: Highlight, selection: Selection): boolean {
  return selection.size === 0 || highlight.skills.some((id) => selection.has(id));
}

/** How many highlights the selection shows, out of all of them (R7.7). */
export function countHighlights(
  list: readonly Position[],
  selection: Selection,
): { shown: number; total: number } {
  const all = list.flatMap((position) => position.highlights);
  return {
    shown: all.filter((highlight) => matchesSelection(highlight, selection)).length,
    total: all.length,
  };
}

/** Adds the skill, or removes it if it's selected (R7.2). */
export function toggleSkill(selection: Selection, id: SkillId): Selection {
  const next = new Set(selection);
  if (!next.delete(id)) next.add(id);
  return next;
}

/** Selects all of `ids` if any is unselected, otherwise unselects them all (R7.4). */
export function toggleSkills(selection: Selection, ids: readonly SkillId[]): Selection {
  const next = new Set(selection);
  const all = ids.every((id) => selection.has(id));
  for (const id of ids) {
    if (all) next.delete(id);
    else next.add(id);
  }
  return next;
}

/** How many of `ids` are selected (R7.5). */
export function selectedCount(selection: Selection, ids: readonly SkillId[]): number {
  return ids.filter((id) => selection.has(id)).length;
}

/** Label or any alias contains the trimmed query, ignoring case (R8.1). An empty query matches all. */
export function matchesQuery(skill: Skill, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  return [skill.label, ...(skill.aliases ?? [])].some((name) =>
    name.toLowerCase().includes(needle),
  );
}

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** "2025-04" → "Apr 2025", from a fixed month table, so prerender and browser agree (no Intl). */
export function formatYearMonth(value: YearMonth): string {
  const [year, month] = value.split("-");
  return `${months[Number(month) - 1] ?? ""} ${year ?? ""}`;
}
