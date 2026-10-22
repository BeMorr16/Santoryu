import { memo } from "react";
import { Accordion, AccordionItem } from "../../components/Accordion/Accordion.tsx";
import { VisuallyHidden } from "../../components/VisuallyHidden/VisuallyHidden.tsx";
import { ComponentTokenTable } from "../ComponentTokenTable.tsx";
import { DocSection } from "../DocSection.tsx";
import { ColorRamps } from "./ColorRamps.tsx";
import { categoryLabels, type Tier, type TokenGroup } from "./groups.ts";
import { PrimitiveTable } from "./PrimitiveTable.tsx";
import { tierSections, tokenRowId } from "./reference-ids.ts";
import { SemanticTokenTable } from "./SemanticTokenTable.tsx";
import { tierRules } from "./stats.ts";
import styles from "./TierSection.module.css";

type Matches = ReadonlySet<string> | null;

const tokensText = (count: number) => `${String(count)} token${count === 1 ? "" : "s"}`;

/** "Color, 40 tokens", or "Color, 3 of 40 tokens" while searching; the comma is for screen readers (R4.3). */
function GroupHeading({ label, shown, total }: { label: string; shown: number; total: number }) {
  return (
    <>
      {label}
      <VisuallyHidden>,</VisuallyHidden>{" "}
      <span className={styles.count}>
        {shown === total ? tokensText(total) : `${String(shown)} of ${tokensText(total)}`}
      </span>
    </>
  );
}

/** A group's table, or the color ramps (R5.3, R5.4, R6.1, R6.2). */
function GroupBody({ group, matches }: { group: TokenGroup; matches: Matches }) {
  const label = categoryLabels[group.category];
  switch (group.tier) {
    case "primitive":
      return group.category === "color" ? (
        <ColorRamps tokens={group.tokens} shown={matches} />
      ) : (
        <PrimitiveTable caption={`${label} primitives`} tokens={group.tokens} shown={matches} />
      );
    case "semantic":
      return (
        <SemanticTokenTable
          caption={`${label} semantic tokens`}
          tokens={group.tokens}
          shown={matches}
        />
      );
    case "component":
      return (
        <ComponentTokenTable
          caption={`${label} component tokens`}
          hideCaption
          showComponent
          tokens={group.tokens}
          shown={matches}
        />
      );
  }
}

const shownIn = (group: TokenGroup, matches: Matches) =>
  matches === null
    ? group.tokens.length
    : group.tokens.filter((token) => matches.has(tokenRowId(token.name))).length;

/**
 * One tier's h2 and rule, then an accordion item per category (R4.1–R4.3). While searching, groups
 * with no match hide, and a tier with none says so (R11.3).
 */
function TierSectionContent({
  tier,
  groups,
  openGroups,
  matches,
  onGroupOpenChange,
}: {
  tier: Tier;
  groups: readonly TokenGroup[];
  openGroups: ReadonlySet<string>;
  /** Search results, or null with no query. */
  matches: Matches;
  onGroupOpenChange: (group: string, open: boolean) => void;
}) {
  const counts = groups.map((group) => shownIn(group, matches));
  return (
    <DocSection {...tierSections[tier]}>
      <p>{tierRules[tier]}</p>
      {counts.every((count) => count === 0) && <p>No matches in this tier.</p>}
      <Accordion headingLevel={3}>
        {groups.map((group, index) => (
          <AccordionItem
            key={group.id}
            heading={
              <GroupHeading
                label={categoryLabels[group.category]}
                shown={counts[index] ?? 0}
                total={group.tokens.length}
              />
            }
            open={openGroups.has(group.id)}
            onOpenChange={(open) => {
              onGroupOpenChange(group.id, open);
            }}
            hidden={counts[index] === 0 || undefined}
          >
            <GroupBody group={group} matches={matches} />
          </AccordionItem>
        ))}
      </Accordion>
    </DocSection>
  );
}

/**
 * Memoized: typing in search renders the reference with the previous results first (a deferred
 * value), and this lets that render skip the tiers (ds-tokens §9.2, the feature's one memo).
 */
export const TierSection = memo(TierSectionContent);
