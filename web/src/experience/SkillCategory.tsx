import { useId } from "react";
import { Button } from "../components/Button/Button.tsx";
import { Stack } from "../components/Stack/Stack.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { experienceContent, type SkillCategoryId } from "../content/experience.ts";
import {
  matchesQuery,
  selectedCount,
  toggleSkill,
  toggleSkills,
  type ListedSkill,
  type Selection,
} from "./model.ts";

/** One category's skills, split into used (toggles) and other (also worked with). */
export interface SkillGroup {
  category: SkillCategoryId;
  used: readonly ListedSkill[];
  other: readonly ListedSkill[];
}

/** Whether the search leaves any of the group's skills visible (R8.2). */
export function groupMatches(group: SkillGroup, query: string): boolean {
  return [...group.used, ...group.other].some((skill) => matchesQuery(skill, query));
}

export interface SkillCategoryProps {
  group: SkillGroup;
  query: string;
  selection: Selection;
  onSelectionChange: (selection: Selection) => void;
}

/**
 * One category: its h3 (a toggle for all its used skills, R7.4–R7.6), its used skills as toggles,
 * then its other skills as plain "Also worked with" text (R6.2). The search narrows the skills
 * shown, never what the category toggle covers (R8.5).
 */
export function SkillCategory({ group, query, selection, onSelectionChange }: SkillCategoryProps) {
  const headingId = useId();
  const countId = useId();
  const label = experienceContent.categories[group.category];
  const usedIds = group.used.map((skill) => skill.id);
  const selected = selectedCount(selection, usedIds);
  const all = usedIds.length > 0 && selected === usedIds.length;
  const partial = selected > 0 && !all;
  const shownUsed = group.used.filter((skill) => matchesQuery(skill, query));
  const shownOther = group.other.filter((skill) => matchesQuery(skill, query));
  return (
    <Stack gap="xs" role="group" aria-labelledby={headingId}>
      <Stack direction="horizontal" gap="sm" align="center">
        <Typography as="h3" variant="h6" id={headingId}>
          {usedIds.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={all}
              aria-describedby={partial ? countId : undefined}
              onClick={() => {
                onSelectionChange(toggleSkills(selection, usedIds));
              }}
            >
              {label}
            </Button>
          ) : (
            label
          )}
        </Typography>
        {partial && (
          <Typography as="span" variant="small" tone="muted" id={countId}>
            {experienceContent.categoryCount(selected, usedIds.length)}
          </Typography>
        )}
      </Stack>
      {shownUsed.length > 0 && (
        <Stack as="ul" direction="horizontal" gap="xs">
          {shownUsed.map((skill) => (
            <li key={skill.id}>
              <Button
                size="sm"
                aria-pressed={selection.has(skill.id)}
                onClick={() => {
                  onSelectionChange(toggleSkill(selection, skill.id));
                }}
              >
                {skill.label}
              </Button>
            </li>
          ))}
        </Stack>
      )}
      {shownOther.length > 0 && (
        <Typography variant="small" tone="muted">
          {experienceContent.alsoLabel}: {shownOther.map((skill) => skill.label).join(", ")}
        </Typography>
      )}
    </Stack>
  );
}
