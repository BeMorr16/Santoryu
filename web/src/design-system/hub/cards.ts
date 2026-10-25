import { componentsPath, themeCreatorPath, tokensPath } from "../components/pages.ts";

interface HubCard {
  id: string;
  href: string;
  title: string;
  description: string;
}

/** The hub's cards, in page order (ds-hub R2.4). */
export const hubCards = [
  {
    id: "tokens",
    href: tokensPath,
    title: "Tokens",
    description: "Every design token behind this site, with its light and dark values.",
  },
  {
    id: "components",
    href: componentsPath,
    title: "Components",
    description:
      "The component library: live examples, props, styling hooks and accessibility notes.",
  },
  {
    id: "theme-creator",
    href: themeCreatorPath,
    title: "Theme Creator",
    description:
      "Build your own theme from the tokens, see it on real components, and use it across the site.",
  },
] as const satisfies readonly HubCard[];

export type HubCardId = (typeof hubCards)[number]["id"];
