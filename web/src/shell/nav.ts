import { designSystemPath } from "../design-system/components/pages.ts";

export interface NavLink {
  href: string;
  label: string;
  /** "section" also marks the pages below href (Link's currentMatch). */
  currentMatch: "exact" | "section";
}

/** The bar's page links, in order (R6.5). Each later page spec adds its entry here. */
export const navLinks = [
  { href: designSystemPath, label: "Design System", currentMatch: "section" },
] as const satisfies readonly NavLink[];

/** Where "Contact" goes. "/" until the contact page exists (roadmap row 5 repoints it; R7.4). */
export const contactHref = "/";
