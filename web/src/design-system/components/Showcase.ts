import type { ComponentType } from "react";
import type { KeyboardRow } from "./KeyboardTable.tsx";
import type { ComponentPageId } from "./pages.ts";
import type { PropDoc } from "./PropDocs.ts";

/** One example in a component page's Examples panel (ds-components design §3.2). */
export interface ExampleDoc {
  /** The example's h3, and (slugged) its id and On this page entry. */
  title: string;
  layout?: "row" | "column";
  /** A named, module-scope component holding the example's own state. */
  Content: ComponentType;
}

/** The example shown first, with its module's source below it (ds-components R4.4, R4.5). */
export interface MainExample {
  Example: ComponentType;
  /** The module's source, from `?raw`. */
  source: string;
  /** Its file name, the CodeBlock label. */
  file: string;
}

/** The documentation of one component page. Its name and group come from pages.ts. */
export interface Showcase {
  id: ComponentPageId;
  /** Library exports this page documents (R15.2). */
  exports: readonly string[];
  /** One sentence. */
  purpose: string;
  main: MainExample;
  examples: readonly ExampleDoc[];
  /** One props table per part with own props; propsNote covers the rest. */
  props: readonly { part: string; docs: Readonly<Record<string, PropDoc>> }[];
  /** What else reaches the root element, beyond the native props, when it needs saying. */
  propsNote?: string;
  /** Kebab-case name of its component tokens, or null when it has none. */
  tokens: string | null;
  /** Why there are no component tokens, when `tokens` is null. */
  tokensNote?: string;
  keyboard?: readonly KeyboardRow[];
  /** Role, accessible name and behavior notes (R15.3). */
  a11y: readonly string[];
}
