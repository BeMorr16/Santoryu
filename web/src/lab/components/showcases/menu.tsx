import { useState } from "react";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  type MenuItemOwnProps,
  type MenuRadioGroupOwnProps,
  type MenuRadioItemOwnProps,
} from "../../../components/Menu/Menu.tsx";
import { Example } from "../Example.tsx";
import type { KeyboardRow } from "../KeyboardTable.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import { buttonDocs } from "./button.tsx";

const disabledDoc = {
  type: "boolean",
  default: "false",
  description: "Shown and announced as unavailable; focusable but never activated.",
};

const itemDocs = {
  onSelect: { type: "() => void", description: "Runs on activation, before the menu closes." },
  disabled: disabledDoc,
} satisfies PropDocs<MenuItemOwnProps>;

const groupDocs = {
  label: { type: "string", description: "Required. The group's accessible name, shown small." },
  value: { type: "string", description: "Controlled value; pair with onValueChange." },
  defaultValue: { type: "string", description: "Uncontrolled initial value." },
  onValueChange: { type: "(value: string) => void", description: "Called with the chosen value." },
} satisfies PropDocs<MenuRadioGroupOwnProps>;

const radioDocs = {
  value: { type: "string", description: "Required. The value this item selects." },
  icon: { type: "IconName", description: "Decorative icon before the label." },
  disabled: disabledDoc,
} satisfies PropDocs<MenuRadioItemOwnProps>;

export const menuKeyboard: readonly KeyboardRow[] = [
  {
    keys: "Enter / Space / click",
    action: "On the trigger: opens, focusing the checked item or the first.",
  },
  {
    keys: "Down Arrow / Up Arrow",
    action:
      "On the trigger: opens on the first or last item. In the menu: next or previous item, wrapping.",
  },
  { keys: "Home / End", action: "First or last item." },
  { keys: "A to Z", action: "Next item starting with that letter." },
  {
    keys: "Enter / Space",
    action: "Activates the item, closes, and returns focus to the trigger.",
  },
  { keys: "Escape", action: "Closes and returns focus to the trigger." },
  { keys: "Tab", action: "Closes and moves focus on as usual." },
];

function Examples() {
  const [sort, setSort] = useState("newest");
  const [last, setLast] = useState("nothing yet");
  return (
    <Example title="Actions, a radio group and a disabled item">
      <Menu>
        <MenuTrigger iconEnd="chevron-down">Project actions</MenuTrigger>
        <MenuPopup>
          <MenuRadioGroup label="Sort by" value={sort} onValueChange={setSort}>
            <MenuRadioItem value="newest">Newest first</MenuRadioItem>
            <MenuRadioItem value="oldest">Oldest first</MenuRadioItem>
            <MenuRadioItem value="name">Name</MenuRadioItem>
          </MenuRadioGroup>
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
      <Menu>
        <MenuTrigger variant="ghost" iconEnd="chevron-down">
          View (uncontrolled)
        </MenuTrigger>
        <MenuPopup>
          <MenuRadioGroup label="View" defaultValue="grid">
            <MenuRadioItem value="grid">Grid</MenuRadioItem>
            <MenuRadioItem value="list">List</MenuRadioItem>
            <MenuRadioItem value="compact" disabled>
              Compact (soon)
            </MenuRadioItem>
          </MenuRadioGroup>
        </MenuPopup>
      </Menu>
      <p aria-live="polite">
        Sorted by {sort}; last action: {last}.
      </p>
    </Example>
  );
}

export const menuShowcase: Showcase = {
  id: "menu",
  name: "Menu",
  exports: ["Menu", "MenuTrigger", "MenuPopup", "MenuItem", "MenuRadioGroup", "MenuRadioItem"],
  purpose: "A dropdown of actions and single-select choices behind a button.",
  Examples,
  props: [
    { part: "MenuTrigger (same as Button)", docs: buttonDocs },
    { part: "MenuItem", docs: itemDocs },
    { part: "MenuRadioGroup", docs: groupDocs },
    { part: "MenuRadioItem", docs: radioDocs },
  ],
  tokens: "menu",
  keyboard: menuKeyboard,
  a11y: [
    'WAI-ARIA menu button: the trigger has aria-haspopup="menu" and aria-expanded; the popup is role="menu", named by the trigger.',
    "Radio items are menuitemradio with aria-checked and a visible check mark, in a group named by its label.",
    "Only the focused item is in the tab sequence; disabled items stay focusable but never activate.",
    "The popup is in the top layer, so overflow can't clip it, and it flips to stay in the viewport.",
  ],
};
