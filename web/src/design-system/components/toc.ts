import type { Showcase } from "./Showcase.ts";
import { slug } from "./slug.ts";

/** One On this page entry: a heading's id and text, with the headings nested under it. */
export interface TocItem {
  id: string;
  label: string;
  children?: readonly TocItem[];
}

/** A component page's h2 sections, in page order (ds-components R4.1). */
export const sections = [
  { id: "examples", label: "Examples" },
  { id: "props", label: "Props" },
  { id: "component-tokens", label: "Component tokens" },
  { id: "accessibility", label: "Accessibility" },
] as const;

/** A component page's On this page entries: its h2s, with the examples' h3s under Examples (R4.2). */
export function tocItems(showcase: Showcase): TocItem[] {
  return sections.map((section) =>
    section.id === "examples"
      ? {
          ...section,
          children: showcase.examples.map(({ title }) => ({ id: slug(title), label: title })),
        }
      : section,
  );
}
