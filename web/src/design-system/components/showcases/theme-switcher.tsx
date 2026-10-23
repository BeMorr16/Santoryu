import { Stack } from "../../../components/Stack/Stack.tsx";
import {
  ThemeSwitcher,
  themeSwitcherName,
  type ThemeSwitcherOwnProps,
} from "../../../components/ThemeSwitcher/ThemeSwitcher.tsx";
import { useCustomThemes } from "../../../theme/useCustomThemes.ts";
import { useEffectiveTheme } from "../../../theme/useEffectiveTheme.ts";
import { Announced } from "../Announced.tsx";
import type { KeyboardRow } from "../KeyboardTable.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";
import { buttonLookDocs, menuKeyboard, popupDocs } from "../shared-docs.ts";
import { ThemeSwitcherExample } from "../examples/ThemeSwitcherExample.tsx";
import themeSwitcherExampleSource from "../examples/ThemeSwitcherExample.tsx?raw";

const props = {
  variant: { ...buttonLookDocs.variant, default: '"ghost"' },
  size: { ...buttonLookDocs.size, default: '"sm"' },
  showLabel: {
    type: "boolean",
    default: "auto: from 30em up",
    description:
      'Shows the visible "Theme" label; the accessible name always says the theme in effect.',
  },
  nameTooltip: {
    type: "boolean",
    default: "true",
    description: 'While "Theme" isn\'t displayed, shows the accessible name as a tooltip.',
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

function LooksExample() {
  return (
    <>
      <ThemeSwitcher />
      <ThemeSwitcher variant="secondary" size="md" />
      <ThemeSwitcher variant="primary" />
    </>
  );
}

function LabelExample() {
  const theme = useEffectiveTheme();
  const customThemes = useCustomThemes();
  // The trigger's own name, role and state at rest (refinement R10.5).
  const announced = {
    name: themeSwitcherName(theme, customThemes),
    role: "menu button, collapsed",
  };
  return (
    <>
      <div className={styles.row}>
        <ThemeSwitcher />
        <ThemeSwitcher showLabel />
        <ThemeSwitcher showLabel={false} />
      </div>
      <Announced {...announced} />
    </>
  );
}

function PlacementExample() {
  return (
    <Stack direction="horizontal" justify="between">
      <ThemeSwitcher align="start" />
      <ThemeSwitcher />
    </Stack>
  );
}

export const themeSwitcherShowcase: Showcase = {
  id: "theme-switcher",
  exports: ["ThemeSwitcher"],
  purpose:
    "Light, Dark or one of the visitor's own themes for the whole site: it starts from the visitor's OS setting, and a choice is remembered.",
  main: {
    Example: ThemeSwitcherExample,
    source: themeSwitcherExampleSource,
    file: "ThemeSwitcherExample.tsx",
  },
  examples: [
    { title: "Looks (each changes the whole site, not this panel)", Content: LooksExample },
    {
      title: "Label (changes the whole site, not this panel)",
      layout: "column",
      Content: LabelExample,
    },
    {
      title: "Placement (changes the whole site, not this panel)",
      layout: "column",
      Content: PlacementExample,
    },
  ],
  props: [{ part: "ThemeSwitcher", docs: props }],
  tokens: null,
  tokensNote: "None of its own: it's a Menu with a Button trigger, so it uses their tokens.",
  keyboard: themeSwitcherKeyboard,
  a11y: [
    'The trigger is named by the theme in effect, e.g. "Theme: Dark" or "Theme: Ocean", with a matching icon: a sun, a moon, or a palette for a custom theme.',
    'Custom themes made in the theme creator follow Light and Dark, by name, in the same radio group. After a separator, a link item ("Create a theme…", or "Edit themes…" once one exists) opens the theme creator.',
    "Until the visitor chooses, it shows and follows their OS color scheme, live.",
    "The choice applies before first paint on every page, and follows other tabs.",
    "Without JavaScript it's hidden and the system theme applies.",
    "The chevron shows sighted users that the trigger opens a menu. Screen readers announce a menu button with its state, collapsed or expanded.",
    'A visible "Theme" label is the start of the accessible name, so voice control can use the word on screen.',
    'Hide the label (showLabel={false}) only where the icons make the purpose clear. Its name ("Theme: Dark") then shows as a tooltip on hover and keyboard focus, but voice control users still have to discover the word "Theme" before they can say it.',
    "Space applies a theme and closes the menu, as Enter does.",
    "The icon and name report the site's theme, even inside a preview panel set to another theme.",
    "The “Announced as” caption gives the trigger's accessible name, role and state. Exact wording varies by screen reader.",
  ],
};
