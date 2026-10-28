import { useId, useRef, useState } from "react";
import { Button } from "../components/Button/Button.tsx";
import { Stack } from "../components/Stack/Stack.tsx";
import { TextField } from "../components/TextField/TextField.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { experienceContent, positions, skillCategories } from "../content/experience.ts";
import styles from "./Experience.module.css";
import { categorySkills, emptySelection, usedSkillIds, type Selection } from "./model.ts";
import { groupMatches, SkillCategory, type SkillGroup } from "./SkillCategory.tsx";

// Content only, so computed once (design §4).
const used = usedSkillIds(positions);
const groups: readonly SkillGroup[] = skillCategories.map((category) => ({
  category,
  ...categorySkills(category, used),
}));

export interface SkillsPanelProps {
  selection: Selection;
  onSelectionChange: (selection: Selection) => void;
  /** Highlights the selection shows. */
  shown: number;
  /** All highlights. */
  total: number;
}

/**
 * The skills panel (R6–R8): the heading and hint, the live count and Clear, then the search and
 * the categories, which sit in a "Filter by skill" disclosure below 48em (R3.3). The selection is
 * the page's; the search query and the disclosure are the panel's own.
 */
export function SkillsPanel({ selection, onSelectionChange, shown, total }: SkillsPanelProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const bodyId = useId();
  const visibleGroups = groups.filter((group) => groupMatches(group, query));
  return (
    <Stack as="section" gap="md" aria-labelledby="experience-skills" className={styles.panel}>
      <Stack gap="xs">
        <Typography as="h2" variant="h4" id="experience-skills">
          {experienceContent.skillsHeading}
        </Typography>
        <Typography variant="small" tone="muted">
          {experienceContent.skillsHint}
        </Typography>
      </Stack>
      <Stack direction="horizontal" gap="sm" align="center">
        <Typography variant="small" aria-live="polite" aria-atomic="true">
          {experienceContent.count(shown, total)}
        </Typography>
        <Button
          size="sm"
          disabled={selection.size === 0}
          onClick={() => {
            onSelectionChange(emptySelection);
            searchRef.current?.focus();
          }}
        >
          {experienceContent.clearLabel}
        </Button>
      </Stack>
      <Button
        className={styles.toggle}
        size="sm"
        iconEnd="chevron-down"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => {
          setOpen(!open);
        }}
      >
        {experienceContent.disclosureLabel}
      </Button>
      <Stack id={bodyId} gap="md" className={styles.body} data-open={open || undefined}>
        <TextField
          ref={searchRef}
          type="search"
          size="sm"
          label={experienceContent.searchLabel}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        {visibleGroups.length === 0 && (
          <Typography variant="small" tone="muted">
            {experienceContent.noSkillsMatch(query.trim())}
          </Typography>
        )}
        {visibleGroups.map((group) => (
          <SkillCategory
            key={group.category}
            group={group}
            query={query}
            selection={selection}
            onSelectionChange={onSelectionChange}
          />
        ))}
      </Stack>
    </Stack>
  );
}
