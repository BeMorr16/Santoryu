import { Accordion, AccordionItem } from "../../components/Accordion/Accordion.tsx";
import { componentPages } from "../components/pages.ts";
import { tokenRowId } from "../tokens/reference-ids.ts";
import { KeyControls } from "./KeyControls.tsx";
import { sectionComponents, sectionSemantics, type SectionId } from "./model/controls.ts";
import { srgbToHex } from "./model/oklch.ts";
import { disclosureId, type DisclosureId } from "./model/search.ts";
import type { KeyValues, ResolvedTheme } from "./model/types.ts";
import styles from "./ThemeCreator.module.css";
import { ComponentRow, SemanticRow } from "./TokenRows.tsx";

/** "Semantic tokens (41)", or with edits "Semantic tokens (41 · 2 edited)" (R4.2). */
function disclosureLabel(label: string, count: number, edited: number): string {
  return `${label} (${String(count)}${edited > 0 ? ` · ${String(edited)} edited` : ""})`;
}

/** The component tokens of a section, grouped by component, in metadata order (R6.2). */
function byComponent(tokens: readonly { name: string; component: string }[]) {
  const groups = new Map<string, string[]>();
  for (const { name, component } of tokens)
    groups.set(component, [...(groups.get(component) ?? []), name]);
  return [...groups];
}

/**
 * One editor section (R4.1, R4.2): an h2, its key controls, then its semantic and component
 * tokens in closed disclosures, whose rows render only while open (design §8.2).
 */
export function CategorySection({
  id,
  title,
  keys,
  startKeys,
  startLabel,
  theme,
  openIds,
  matches,
  onOpenChange,
}: {
  id: SectionId;
  title: string;
  keys: KeyValues;
  startKeys: KeyValues;
  startLabel: string;
  theme: ResolvedTheme;
  openIds: ReadonlySet<string>;
  /** The rows matching "Find a token", or null with no query. */
  matches: ReadonlySet<string> | null;
  onOpenChange: (id: DisclosureId, open: boolean) => void;
}) {
  const shown = <T extends { name: string }>(tokens: readonly T[]) =>
    matches === null ? tokens : tokens.filter(({ name }) => matches.has(tokenRowId(name)));
  const semantics = sectionSemantics[id];
  const components = sectionComponents[id];
  const edited = (tokens: readonly { name: string }[]) =>
    tokens.filter(({ name }) => theme.sources[name] === "edited").length;
  const semanticId = disclosureId(id, "semantic");
  const componentId = disclosureId(id, "component");
  const headingId = `section-${id}`;
  return (
    <section aria-labelledby={headingId} className={styles.section}>
      <h2 id={headingId}>{title}</h2>
      <KeyControls section={id} keys={keys} start={startKeys} />
      <Accordion headingLevel={3}>
        <AccordionItem
          heading={disclosureLabel("Semantic tokens", semantics.length, edited(semantics))}
          open={openIds.has(semanticId)}
          onOpenChange={(open) => {
            onOpenChange(semanticId, open);
          }}
        >
          {openIds.has(semanticId) && (
            <ul className={styles.rows}>
              {shown(semantics).map(({ name }) => {
                const value = theme.semantic[name];
                return (
                  <SemanticRow
                    key={name}
                    token={name}
                    css={value?.css ?? ""}
                    hex={value?.srgb ? srgbToHex(value.srgb) : undefined}
                    colorRef={value?.ref}
                    source={theme.sources[name] ?? "base"}
                    startLabel={startLabel}
                  />
                );
              })}
            </ul>
          )}
        </AccordionItem>
        <AccordionItem
          heading={disclosureLabel("Component tokens", components.length, edited(components))}
          open={openIds.has(componentId)}
          onOpenChange={(open) => {
            onOpenChange(componentId, open);
          }}
        >
          {openIds.has(componentId) &&
            byComponent(shown(components)).map(([component, tokens]) => (
              <div key={component} className={styles.componentGroup}>
                <h4>
                  {componentPages.find(({ id: page }) => page === component)?.name ?? component}
                </h4>
                <ul className={styles.rows}>
                  {tokens.map((name) => (
                    <ComponentRow
                      key={name}
                      token={name}
                      target={theme.component[name] ?? ""}
                      edited={theme.sources[name] === "edited"}
                    />
                  ))}
                </ul>
              </div>
            ))}
        </AccordionItem>
      </Accordion>
    </section>
  );
}
