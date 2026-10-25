import type { TokenCategory } from "../../tokens/types.ts";
import { slug } from "../components/slug.ts";
import type { TocItem } from "../components/toc.ts";
import type { Tier } from "./groups.ts";

/**
 * A token row's fragment id: its path with dots as dashes, so `#color-text-muted` matches
 * `--color-text-muted` (ds-tokens R6.4, decision 0011). No data imports: component pages use it.
 */
export function tokenRowId(path: string): string {
  return path.replaceAll(".", "-");
}

/** One group's id: its tier and category, e.g. `semantic-color`. */
export function groupId(tier: Tier, category: TokenCategory): string {
  return `${tier}-${category}`;
}

const section = (label: string) => ({ id: slug(label), label });

/** The overview topics' h2s, in page order (R1.1, R3). */
export const topicSections = {
  naming: section("Naming"),
  theming: section("Theming"),
  usage: section("Usage"),
  accessibility: section("Accessibility"),
} as const;

/** The search's h2, so heading navigation finds it and it doesn't sit under Accessibility. */
export const searchSection: TocItem = section("Find a token");

/** Each tier's h2 (R4.1). */
export const tierSections: Record<Tier, TocItem> = {
  primitive: section("Primitives"),
  semantic: section("Semantic"),
  component: section("Component"),
};

/** The page's On this page entries: its eight h2s, in order (R1.2). */
export const tokensToc: readonly TocItem[] = [
  ...Object.values(topicSections),
  searchSection,
  tierSections.primitive,
  tierSections.semantic,
  tierSections.component,
];
