import {
  ThemeSwitcher,
  type ThemeSwitcherOwnProps,
} from "../../../components/ThemeSwitcher/ThemeSwitcher.tsx";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import { buttonLookDocs } from "./button.tsx";
import { menuKeyboard } from "./menu.tsx";

const props = {
  variant: { ...buttonLookDocs.variant, default: '"ghost"' },
  size: { ...buttonLookDocs.size, default: '"sm"' },
} satisfies PropDocs<ThemeSwitcherOwnProps>;

function Examples() {
  return (
    <Example title="The site switcher (changes the whole site)">
      <ThemeSwitcher />
      <ThemeSwitcher variant="secondary" size="md" />
      <ThemeSwitcher variant="primary" />
    </Example>
  );
}

export const themeSwitcherShowcase: Showcase = {
  id: "theme-switcher",
  name: "ThemeSwitcher",
  exports: ["ThemeSwitcher"],
  purpose:
    "Light or Dark for the whole site: it starts from the visitor's OS setting, and a choice is remembered.",
  Examples,
  props: [{ part: "ThemeSwitcher", docs: props }],
  tokens: null,
  tokensNote: "None of its own: it's a Menu with a Button trigger, so it uses their tokens.",
  keyboard: menuKeyboard,
  a11y: [
    'The trigger is named by the theme in effect, e.g. "Theme: Dark", with a matching icon.',
    "Until the visitor chooses, it shows and follows their OS color scheme, live.",
    "The choice applies before first paint on every page, and follows other tabs.",
    "Without JavaScript it's hidden and the system theme applies.",
  ],
};
