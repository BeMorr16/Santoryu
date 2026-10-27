import { designSystemPath } from "../design-system/components/pages.ts";

export interface NavLink {
  href: string;
  label: string;
  /** "section" also marks the pages below href (Link's currentMatch). */
  currentMatch: "exact" | "section";
}

/** The contact page (contact R1). The nav entry, Home's call to action and the prerender list use it. */
export const contactHref = "/contact";

/**
 * The bar's page links, in order (R6.5; contact R3.1). Each later page spec adds its entry here;
 * row 6 inserts Experience first.
 */
export const navLinks = [
  { href: designSystemPath, label: "Design System", currentMatch: "section" },
  { href: contactHref, label: "Contact", currentMatch: "exact" },
] as const satisfies readonly NavLink[];
