import type { ComponentType } from "react";
import type { KeyboardRow } from "./KeyboardTable.tsx";
import type { PropDoc } from "./PropDocs.ts";

/** One /lab/components section (design §10.2). */
export interface Showcase {
  /** In-page anchor, e.g. `button`. */
  id: string;
  /** The section's h2. */
  name: string;
  /** Library exports this section documents (R15.2). */
  exports: readonly string[];
  /** One sentence. */
  purpose: string;
  Examples: ComponentType;
  /** One props table per exported part. */
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
