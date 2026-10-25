import type { ButtonOwnProps, ButtonProps } from "../../components/Button/Button.tsx";
import type { MenuPopupOwnProps } from "../../components/Menu/Menu.tsx";
import type { ButtonLookProps } from "../../components/shared/button.tsx";
import type { KeyboardRow } from "./KeyboardTable.tsx";
import type { PropDocs } from "./PropDocs.ts";

// Prop docs and keyboard rows that more than one showcase shows. They live here, not in a
// showcase, so no component page's chunk pulls in another's (ds-components design §3.2).

export const buttonLookDocs = {
  variant: {
    type: '"primary" | "secondary" | "ghost"',
    default: '"secondary"',
    description:
      "Emphasis: one primary action per view, secondary for the rest, ghost for toolbars.",
  },
  size: { type: '"sm" | "md"', default: '"md"', description: "32px or 40px tall." },
  iconStart: { type: "IconName", description: "Decorative icon before the label." },
  iconEnd: { type: "IconName", description: "Decorative icon after the label." },
} satisfies PropDocs<ButtonLookProps>;

/** Button's own props, plus the native ones it treats differently. */
export const buttonDocs = {
  ...buttonLookDocs,
  type: {
    type: '"button" | "submit" | "reset"',
    default: '"button"',
    description: 'Defaults to "button", not the native "submit".',
  },
  disabled: {
    type: "boolean",
    default: "false",
    description:
      "Sets aria-disabled, not the native attribute: still focusable, announced, and never activated.",
  },
  "aria-pressed": {
    type: 'boolean | "mixed"',
    description: 'Makes it a toggle button. "mixed" has no look of its own.',
  },
  disabledReason: {
    type: "ReactNode",
    description:
      "While disabled: why. It's the button's accessible description, and shows as a tooltip on hover, keyboard focus, and a press or tap.",
  },
  nameTooltip: {
    type: "boolean",
    default: "true",
    description:
      "Icon-only buttons named by aria-label or VisuallyHidden show that name as a tooltip; false turns it off.",
  },
} satisfies PropDocs<ButtonOwnProps & Pick<ButtonProps, "type" | "disabled" | "aria-pressed">>;

export const popupDocs = {
  side: {
    type: '"bottom" | "top"',
    default: '"bottom"',
    description: "The side of the trigger it opens on. It still flips when it doesn't fit.",
  },
  align: {
    type: '"start" | "end"',
    default: '"start"',
    description: "The trigger edge it lines up with. It still shifts to stay in the viewport.",
  },
} satisfies PropDocs<MenuPopupOwnProps>;

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
    keys: "Enter",
    action: "Chooses the item (or follows the link), closes, and returns focus to the trigger.",
  },
  {
    keys: "Space",
    action:
      "Chooses an action or link item and closes. Toggles a checkbox or radio item and keeps the menu open.",
  },
  { keys: "Escape", action: "Closes and returns focus to the trigger." },
  { keys: "Tab", action: "Closes and moves focus on as usual." },
];

export const layoutAsDoc = {
  type: '"div" | "section" | "article" | "aside" | "header" | "footer" | "nav" | "main" | "ul" | "ol" | "li" | "form" | "fieldset"',
  default: '"div"',
  description: "The root element. Lists keep their semantics without markers.",
};

export const gapDoc = {
  type: '"none" | "xs" | "sm" | "md" | "lg" | "xl"',
  default: '"md"',
  description: "Sets the row gap (space.stack.*) and the column gap (space.inline.*).",
};

export const axisGap = (description: string) => ({
  type: gapDoc.type,
  default: "gap",
  description,
});
