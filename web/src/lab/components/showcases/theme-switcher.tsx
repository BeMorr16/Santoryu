import { Stack } from "../../../components/Stack/Stack.tsx";
import {
  ThemeSwitcher,
  themeSwitcherName,
  type ThemeSwitcherOwnProps,
} from "../../../components/ThemeSwitcher/ThemeSwitcher.tsx";
import { useEffectiveTheme } from "../../../theme/useEffectiveTheme.ts";
import { Announced } from "../Announced.tsx";
import { Example } from "../Example.tsx";
import type { KeyboardRow } from "../KeyboardTable.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";
import { buttonLookDocs } from "./button.tsx";
import { menuKeyboard, popupDocs } from "./menu.tsx";

const props = {
  variant: { ...buttonLookDocs.variant, default: '"ghost"' },
  size: { ...buttonLookDocs.size, default: '"sm"' },
  showLabel: {
    type: "boolean",
    default: "auto: from 30em up",
    description:
      'Shows the visible "Theme" label; the accessible name always says the theme in effect.',
  },
  side: popupDocs.side,
  align: { ...popupDocs.align, default: '"end"' },
} satisfies PropDocs<ThemeSwitcherOwnProps>;

/** Menu's rows, except that Space closes too: its radio items set closeOnSelect (refinement R10.4). */
const themeSwitcherKeyboard: readonly KeyboardRow[] = menuKeyboard.flatMap((row) => {
  if (row.keys === "Space") return [];
  if (row.keys !== "Enter") return [row];
  return [
    {
      keys: "Enter / Space",
      action: "In the menu: applies the theme, closes, and returns focus to the trigger.",
    },
  ];
});

function Examples() {
  const theme = useEffectiveTheme();
  // The trigger's own name, role and state at rest (refinement R10.5).
  const announced = { name: themeSwitcherName(theme), role: "menu button, collapsed" };
  return (
    <>
      <Example title="Looks (each changes the whole site, not this panel)">
        <ThemeSwitcher />
        <ThemeSwitcher variant="secondary" size="md" />
        <ThemeSwitcher variant="primary" />
      </Example>
      <Example title="Label (changes the whole site, not this panel)" layout="column">
        <div className={styles.row}>
          <ThemeSwitcher />
          <ThemeSwitcher showLabel />
          <ThemeSwitcher showLabel={false} />
        </div>
        <Announced {...announced} />
      </Example>
      <Example title="Placement (changes the whole site, not this panel)" layout="column">
        <Stack direction="horizontal" justify="between">
          <ThemeSwitcher align="start" />
          <ThemeSwitcher />
        </Stack>
      </Example>
    </>
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
  keyboard: themeSwitcherKeyboard,
  a11y: [
    'The trigger is named by the theme in effect, e.g. "Theme: Dark", with a matching icon.',
    "Until the visitor chooses, it shows and follows their OS color scheme, live.",
    "The choice applies before first paint on every page, and follows other tabs.",
    "Without JavaScript it's hidden and the system theme applies.",
    "The chevron shows sighted users that the trigger opens a menu. Screen readers announce a menu button with its state, collapsed or expanded.",
    'A visible "Theme" label is the start of the accessible name, so voice control can use the word on screen.',
    'Hide the label (showLabel={false}) only where the icons make the purpose clear: with no word on screen, voice control users have to guess the name "Theme".',
    "Space applies a theme and closes the menu, as Enter does.",
    "The icon and name report the site's theme, even inside a preview panel set to another theme.",
    "The “Announced as” caption gives the trigger's accessible name, role and state. Exact wording varies by screen reader.",
  ],
};
