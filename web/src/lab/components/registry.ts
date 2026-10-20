import type { Showcase } from "./Showcase.ts";
import { accordionShowcase } from "./showcases/accordion.tsx";
import { badgeShowcase } from "./showcases/badge.tsx";
import { buttonShowcase } from "./showcases/button.tsx";
import { cardShowcase } from "./showcases/card.tsx";
import { gridShowcase } from "./showcases/grid.tsx";
import { iconShowcase } from "./showcases/icon.tsx";
import { linkShowcase } from "./showcases/link.tsx";
import { menuShowcase } from "./showcases/menu.tsx";
import { stackShowcase } from "./showcases/stack.tsx";
import { themeSwitcherShowcase } from "./showcases/theme-switcher.tsx";
import { tooltipShowcase } from "./showcases/tooltip.tsx";
import { typographyShowcase } from "./showcases/typography.tsx";
import { visuallyHiddenShowcase } from "./showcases/visually-hidden.tsx";

/** Every /lab/components section, in page order. registry.test.ts keeps it in step with the library. */
export const showcases: readonly Showcase[] = [
  buttonShowcase,
  linkShowcase,
  iconShowcase,
  visuallyHiddenShowcase,
  typographyShowcase,
  stackShowcase,
  gridShowcase,
  cardShowcase,
  badgeShowcase,
  accordionShowcase,
  menuShowcase,
  tooltipShowcase,
  themeSwitcherShowcase,
];
