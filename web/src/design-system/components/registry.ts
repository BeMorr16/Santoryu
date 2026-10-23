import type { ComponentPageId } from "./pages.ts";
import type { Showcase } from "./Showcase.ts";
import { accordionShowcase } from "./showcases/accordion.tsx";
import { backToTopShowcase } from "./showcases/back-to-top.tsx";
import { badgeShowcase } from "./showcases/badge.tsx";
import { buttonShowcase } from "./showcases/button.tsx";
import { cardShowcase } from "./showcases/card.tsx";
import { codeBlockShowcase } from "./showcases/code-block.tsx";
import { colorFieldShowcase } from "./showcases/color-field.tsx";
import { dialogShowcase } from "./showcases/dialog.tsx";
import { figureShowcase } from "./showcases/figure.tsx";
import { gridShowcase } from "./showcases/grid.tsx";
import { iconShowcase } from "./showcases/icon.tsx";
import { linkShowcase } from "./showcases/link.tsx";
import { menuShowcase } from "./showcases/menu.tsx";
import { separatorShowcase } from "./showcases/separator.tsx";
import { sliderShowcase } from "./showcases/slider.tsx";
import { stackShowcase } from "./showcases/stack.tsx";
import { tableShowcase } from "./showcases/table.tsx";
import { textFieldShowcase } from "./showcases/text-field.tsx";
import { themeSwitcherShowcase } from "./showcases/theme-switcher.tsx";
import { tooltipShowcase } from "./showcases/tooltip.tsx";
import { typographyShowcase } from "./showcases/typography.tsx";
import { visuallyHiddenShowcase } from "./showcases/visually-hidden.tsx";

/**
 * Every component page's showcase, by page id; a missing or extra one is a type error. Only tests
 * import this: a route imports its own showcase, so each page loads only its examples (R4.11).
 */
export const showcases = {
  button: buttonShowcase,
  link: linkShowcase,
  menu: menuShowcase,
  "back-to-top": backToTopShowcase,
  "text-field": textFieldShowcase,
  slider: sliderShowcase,
  "color-field": colorFieldShowcase,
  typography: typographyShowcase,
  "code-block": codeBlockShowcase,
  table: tableShowcase,
  figure: figureShowcase,
  separator: separatorShowcase,
  badge: badgeShowcase,
  stack: stackShowcase,
  grid: gridShowcase,
  card: cardShowcase,
  accordion: accordionShowcase,
  tooltip: tooltipShowcase,
  dialog: dialogShowcase,
  icon: iconShowcase,
  "visually-hidden": visuallyHiddenShowcase,
  "theme-switcher": themeSwitcherShowcase,
} satisfies Record<ComponentPageId, Showcase>;
