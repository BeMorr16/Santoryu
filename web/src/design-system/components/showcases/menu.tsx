import { useState } from "react";
import { CodeBlock } from "../../../components/CodeBlock/CodeBlock.tsx";
import {
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
  type MenuCheckboxItemOwnProps,
  type MenuItemOwnProps,
  type MenuOwnProps,
  type MenuRadioGroupOwnProps,
  type MenuRadioItemOwnProps,
} from "../../../components/Menu/Menu.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";
import { buttonDocs, menuKeyboard, popupDocs } from "../shared-docs.ts";
import { MenuExample } from "../examples/MenuExample.tsx";
import menuExampleSource from "../examples/MenuExample.tsx?raw";

const disabledDoc = {
  type: "boolean",
  default: "false",
  description: "Shown and announced as unavailable; focusable but never activated.",
};

const iconDoc = { type: "IconName", description: "Decorative icon before the label." };

const closeOnSelectDoc = {
  type: "boolean",
  description:
    "true always closes the menu on choosing this item, false never does. By default Enter and click close; Space closes only on action and link items.",
};

const menuDocs = {
  open: { type: "boolean", description: "Controlled open state; pair with onOpenChange." },
  onOpenChange: {
    type: "(open: boolean) => void",
    description:
      "Called on every requested open or close, controlled or not. An outside press, Escape and Tab always request closing.",
  },
} satisfies PropDocs<MenuOwnProps>;

const itemDocs = {
  onSelect: {
    type: "() => void",
    description: "Runs on activation, before the menu closes (and before a link is followed).",
  },
  disabled: disabledDoc,
  icon: iconDoc,
  closeOnSelect: closeOnSelectDoc,
  href: {
    type: "string",
    description:
      'Makes it a link item (<a role="menuitem">). A /path routes client-side; modifier-clicks work as on any link.',
  },
  newTab: {
    type: "boolean",
    default: "false",
    description:
      "With href: opens in a new tab, with an icon and “, opens in new tab” in its name.",
  },
  rel: { type: "string", description: "With href: merged with noopener noreferrer for newTab." },
} satisfies PropDocs<MenuItemOwnProps>;

const checkboxDocs = {
  checked: { type: "boolean", description: "Controlled state; pair with onCheckedChange." },
  defaultChecked: { type: "boolean", default: "false", description: "Uncontrolled initial state." },
  onCheckedChange: {
    type: "(checked: boolean) => void",
    description: "Called with the new state.",
  },
  icon: iconDoc,
  disabled: disabledDoc,
  closeOnSelect: closeOnSelectDoc,
} satisfies PropDocs<MenuCheckboxItemOwnProps>;

const groupDocs = {
  label: { type: "string", description: "Required. The group's accessible name, shown small." },
  value: { type: "string", description: "Controlled value; pair with onValueChange." },
  defaultValue: { type: "string", description: "Uncontrolled initial value." },
  onValueChange: { type: "(value: string) => void", description: "Called with the chosen value." },
} satisfies PropDocs<MenuRadioGroupOwnProps>;

const radioDocs = {
  value: { type: "string", description: "Required. The value this item selects." },
  icon: iconDoc,
  disabled: disabledDoc,
  closeOnSelect: closeOnSelectDoc,
} satisfies PropDocs<MenuRadioItemOwnProps>;

/** The customized example's CSS, shown under it and applied by `.compactMenu`. */
export const compactMenuCss = `.compactMenu {
  --component-menu-item-font-size: var(--type-size-small);
  --component-menu-item-checked-indicator: var(--color-accent-2-text);
}`;

const triggerLooks = [
  { variant: "primary", label: "Primary" },
  { variant: "secondary", label: "Secondary" },
  { variant: "ghost", label: "Ghost" },
] as const;

const placements = [
  { label: "Bottom start", side: "bottom", align: "start" },
  { label: "Bottom end", side: "bottom", align: "end" },
  { label: "Top start", side: "top", align: "start" },
  { label: "Top end", side: "top", align: "end" },
] as const;

function ActionsExample() {
  const [last, setLast] = useState("nothing yet");
  return (
    <>
      <Menu>
        <MenuTrigger iconEnd="chevron-down">Project actions</MenuTrigger>
        <MenuPopup>
          <MenuItem
            onSelect={() => {
              setLast("Copy link");
            }}
          >
            Copy link
          </MenuItem>
          <MenuItem
            onSelect={() => {
              setLast("Download");
            }}
          >
            Download
          </MenuItem>
          <MenuItem
            disabled
            onSelect={() => {
              setLast("Delete");
            }}
          >
            Delete
          </MenuItem>
        </MenuPopup>
      </Menu>
      <p aria-live="polite">Last action: {last}.</p>
    </>
  );
}

function IconsAndLinksExample() {
  const [contact, setContact] = useState("nothing yet");
  return (
    <>
      <Menu>
        <MenuTrigger variant="secondary" iconEnd="chevron-down">
          Contact
        </MenuTrigger>
        <MenuPopup>
          <MenuItem
            icon="mail"
            onSelect={() => {
              setContact("Copy email address");
            }}
          >
            Copy email address
          </MenuItem>
          <MenuItem icon="github" href="https://github.com/" newTab>
            GitHub
          </MenuItem>
          <MenuItem icon="linkedin" href="https://www.linkedin.com/" newTab>
            LinkedIn
          </MenuItem>
        </MenuPopup>
      </Menu>
      <p aria-live="polite">Last action: {contact}.</p>
    </>
  );
}

function RadioGroupExample() {
  const [sort, setSort] = useState("newest");
  return (
    <>
      <Menu>
        <MenuTrigger variant="secondary" iconEnd="chevron-down">
          Sort by
        </MenuTrigger>
        <MenuPopup>
          <MenuRadioGroup label="Sort by" value={sort} onValueChange={setSort}>
            <MenuRadioItem value="newest">Newest first</MenuRadioItem>
            <MenuRadioItem value="oldest">Oldest first</MenuRadioItem>
            <MenuRadioItem value="name">Name</MenuRadioItem>
          </MenuRadioGroup>
        </MenuPopup>
      </Menu>
      <p aria-live="polite">Sorted by {sort}.</p>
    </>
  );
}

function CheckboxesAndASeparatorExample() {
  const [descriptions, setDescriptions] = useState(true);
  const [archived, setArchived] = useState(false);
  return (
    <>
      <Menu>
        <MenuTrigger variant="ghost" iconEnd="chevron-down">
          View
        </MenuTrigger>
        <MenuPopup>
          <MenuRadioGroup label="View" defaultValue="grid">
            <MenuRadioItem value="grid">Grid</MenuRadioItem>
            <MenuRadioItem value="list">List</MenuRadioItem>
            <MenuRadioItem value="compact" disabled>
              Compact (soon)
            </MenuRadioItem>
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuCheckboxItem checked={descriptions} onCheckedChange={setDescriptions}>
            Show descriptions
          </MenuCheckboxItem>
          <MenuCheckboxItem checked={archived} onCheckedChange={setArchived}>
            Show archived
          </MenuCheckboxItem>
        </MenuPopup>
      </Menu>
      <p aria-live="polite">
        Descriptions {descriptions ? "shown" : "hidden"}; archived {archived ? "shown" : "hidden"}.
      </p>
      <p>Space toggles an option and keeps the menu open; Enter or a click closes it.</p>
    </>
  );
}

function TriggerLooksExample() {
  return (
    <>
      {triggerLooks.map(({ variant, label }) => (
        <Menu key={variant}>
          <MenuTrigger variant={variant} iconEnd="chevron-down">
            {label}
          </MenuTrigger>
          <MenuPopup>
            <MenuItem>Rename</MenuItem>
            <MenuItem>Duplicate</MenuItem>
          </MenuPopup>
        </Menu>
      ))}
      <Menu>
        <MenuTrigger variant="ghost" iconStart="chevron-down" aria-label="More options" />
        <MenuPopup>
          <MenuItem>Rename</MenuItem>
          <MenuItem>Duplicate</MenuItem>
        </MenuPopup>
      </Menu>
    </>
  );
}

function PlacementExample() {
  return (
    <>
      {placements.map(({ label, side, align }) => (
        <Menu key={label}>
          <MenuTrigger variant="secondary">{label}</MenuTrigger>
          <MenuPopup side={side} align={align}>
            <MenuItem>First item</MenuItem>
            <MenuItem>Second item</MenuItem>
          </MenuPopup>
        </Menu>
      ))}
    </>
  );
}

function ControlledOpenExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Menu open={open} onOpenChange={setOpen}>
        <MenuTrigger variant="secondary" iconEnd="chevron-down">
          Controlled
        </MenuTrigger>
        <MenuPopup>
          <MenuItem>First item</MenuItem>
          <MenuItem>Second item</MenuItem>
        </MenuPopup>
      </Menu>
      <p aria-live="polite">The menu is {open ? "open" : "closed"}.</p>
    </>
  );
}

function CustomizedWithComponentTokensExample() {
  return (
    <>
      <Menu className={styles.compactMenu}>
        <MenuTrigger variant="secondary" iconEnd="chevron-down">
          Compact
        </MenuTrigger>
        <MenuPopup>
          <MenuCheckboxItem defaultChecked>Wrap lines</MenuCheckboxItem>
          <MenuCheckboxItem>Show whitespace</MenuCheckboxItem>
        </MenuPopup>
      </Menu>
      <CodeBlock label="CSS" language="css">
        {compactMenuCss}
      </CodeBlock>
    </>
  );
}

export const menuShowcase: Showcase = {
  id: "menu",
  exports: [
    "Menu",
    "MenuTrigger",
    "MenuPopup",
    "MenuItem",
    "MenuCheckboxItem",
    "MenuRadioGroup",
    "MenuRadioItem",
    "MenuSeparator",
  ],
  purpose: "A dropdown of actions, links and options behind a button.",
  main: { Example: MenuExample, source: menuExampleSource, file: "MenuExample.tsx" },
  examples: [
    { title: "Actions", layout: "column", Content: ActionsExample },
    { title: "Icons and links", layout: "column", Content: IconsAndLinksExample },
    { title: "Radio group (controlled)", layout: "column", Content: RadioGroupExample },
    {
      title: "Checkboxes and a separator",
      layout: "column",
      Content: CheckboxesAndASeparatorExample,
    },
    { title: "Trigger looks", Content: TriggerLooksExample },
    { title: "Placement", Content: PlacementExample },
    { title: "Controlled open", layout: "column", Content: ControlledOpenExample },
    {
      title: "Customized with component tokens",
      layout: "column",
      Content: CustomizedWithComponentTokensExample,
    },
  ],
  props: [
    { part: "Menu", docs: menuDocs },
    { part: "MenuTrigger (same as Button)", docs: buttonDocs },
    { part: "MenuPopup", docs: popupDocs },
    { part: "MenuItem", docs: itemDocs },
    { part: "MenuCheckboxItem", docs: checkboxDocs },
    { part: "MenuRadioGroup", docs: groupDocs },
    { part: "MenuRadioItem", docs: radioDocs },
  ],
  tokens: "menu",
  keyboard: menuKeyboard,
  a11y: [
    'WAI-ARIA menu button: the trigger has aria-haspopup="menu" and aria-expanded; the popup is role="menu", named by the trigger.',
    "Pointing at an item focuses it, so only one item is ever highlighted, and the keyboard continues from there.",
    "Checkbox items are menuitemcheckbox and radio items menuitemradio, each with aria-checked and a visible check mark; radio items sit in a group named by its label.",
    'Separators are role="separator" and the keyboard skips them.',
    'Link items are real links (<a role="menuitem">): new tabs and modifier-clicks work, and a new-tab item\'s name ends “, opens in new tab”.',
    "Only the focused item is in the tab sequence; disabled items stay focusable but never activate.",
    "A controlled menu opens and closes through onOpenChange; an outside press, Escape and Tab always request closing.",
    "The focus ring is component.menu.item.focus-ring-color, drawn inside the item.",
    "In forced colors, the focused item uses Highlight and a disabled item GrayText; a focused disabled item keeps GrayText and gets a Highlight ring instead.",
    "The popup is in the top layer, so overflow can't clip it, and it flips to stay in the viewport.",
  ],
};
