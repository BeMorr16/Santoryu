import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Link as RouterLink } from "react-router";
import { Button, type ButtonProps } from "../Button/Button.tsx";
import { Icon } from "../Icon/Icon.tsx";
import type { IconName } from "../Icon/registry.ts";
import { isRoutable, mergeRel, newTabText } from "../Link/Link.tsx";
import { cx } from "../shared/cx.ts";
import { placePopup, supportsAnchorPositioning } from "../shared/position.ts";
import { assignRef } from "../shared/ref.ts";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx";
import styles from "./Menu.module.css";

type Side = "bottom" | "top";
type Align = "start" | "end";

/*
 * WAI-ARIA menu button (R12, design §9). Items are found by DOM query in the popup, in DOM order,
 * so conditional items need no registration. Only the focused item is in the tab sequence.
 */

const itemSelector = '[role^="menuitem"]';

type FocusTarget = "first" | "last" | "checked-or-first";

/** What to focus once a requested open state is applied (refinement R5.11). */
interface Pending {
  open: boolean;
  focus: FocusTarget | "trigger" | "none";
}

interface MenuContextValue {
  open: boolean;
  triggerId: string;
  popupId: string;
  setTrigger: (node: HTMLButtonElement | null) => void;
  setPopup: (node: HTMLDivElement | null) => void;
  popup: () => HTMLDivElement | null;
  activeId: string | undefined;
  setActiveId: (id: string) => void;
  openMenu: (focus: FocusTarget) => void;
  closeMenu: (options: { focusTrigger: boolean }) => void;
  /** A primary press on the trigger while open: its click will toggle the menu closed (R12.6). */
  pressTrigger: (button: number) => void;
  /** Whether that press is pending, and (with `consume`) clear it. */
  triggerPressed: (consume?: boolean) => boolean;
}

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenu(part: string): MenuContextValue {
  const context = use(MenuContext);
  if (!context) throw new Error(`<${part}> must be inside a <Menu>.`);
  return context;
}

function items(popup: HTMLElement | null): HTMLElement[] {
  return popup ? [...popup.querySelectorAll<HTMLElement>(itemSelector)] : [];
}

export interface MenuOwnProps {
  /** Controlled open state; pair with `onOpenChange` (refinement R5.11). */
  open?: boolean | undefined;
  /** Called with every requested change, controlled or not. */
  onOpenChange?: ((open: boolean) => void) | undefined;
}

export type MenuProps = MenuOwnProps & ComponentPropsWithRef<"div">;

/** The menu's root. It scopes the anchor name and holds the open state. */
export function Menu({ open: openProp, onOpenChange, className, children, ...rest }: MenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const [activeId, setActiveId] = useState<string>();
  const triggerId = useId();
  const popupId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Whether the popover is showing: the applied state, which `open` leads by a render. */
  const openRef = useRef(false);
  const pending = useRef<Pending | null>(null);
  const pointerDownOnTriggerWhileOpen = useRef(false);
  const controlled = openProp !== undefined;

  const focusItem = useCallback((item: HTMLElement | undefined) => {
    if (!item) return;
    setActiveId(item.id);
    item.focus();
  }, []);

  const focusTarget = useCallback(
    (focus: FocusTarget) => {
      const all = items(popupRef.current);
      const checked = all.find((item) => item.getAttribute("aria-checked") === "true");
      focusItem(focus === "last" ? all.at(-1) : focus === "first" ? all[0] : (checked ?? all[0]));
    },
    [focusItem],
  );

  // Every open or close goes through here: applied now when uncontrolled, and only reported when
  // controlled, where the effect below applies it once `open` follows (refinement R5.11).
  const request = useCallback(
    (next: Pending) => {
      if (next.open === openRef.current) {
        if (next.open && next.focus !== "trigger" && next.focus !== "none") focusTarget(next.focus);
        return;
      }
      // Uncontrolled, a second request before the first is applied only updates its focus.
      const repeated = !controlled && pending.current?.open === next.open;
      pending.current = next;
      if (repeated) return;
      if (!controlled) setUncontrolledOpen(next.open);
      onOpenChange?.(next.open);
      // A parent that ignores the request mustn't leave its focus intent for a later outside
      // change: by the next task, React has applied any state the request led to.
      setTimeout(() => {
        if (pending.current === next) pending.current = null;
      }, 0);
    },
    [controlled, focusTarget, onOpenChange],
  );

  // Applies `open` to the popover, then moves focus as the request asked, or as an outside change
  // needs: into the menu when opened, back to the trigger when closed with focus inside.
  useLayoutEffect(() => {
    const popup = popupRef.current;
    if (!popup || open === openRef.current) return;
    const focus = pending.current?.open === open ? pending.current.focus : undefined;
    pending.current = null;
    openRef.current = open;
    if (open) {
      popup.showPopover();
      focusTarget(
        focus === undefined || focus === "trigger" || focus === "none" ? "checked-or-first" : focus,
      );
      return;
    }
    const focusWasInside = popup.contains(document.activeElement);
    popup.hidePopover();
    if (focus === "trigger" || (focus === undefined && focusWasInside)) triggerRef.current?.focus();
  }, [open, focusTarget]);

  const openMenu = useCallback(
    (focus: FocusTarget) => {
      request({ open: true, focus });
    },
    [request],
  );

  const closeMenu = useCallback(
    ({ focusTrigger }: { focusTrigger: boolean }) => {
      if (!openRef.current) return;
      request({ open: false, focus: focusTrigger ? "trigger" : "none" });
    },
    [request],
  );

  // A pointer press outside the menu closes it without moving focus (R12.6).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      closeMenu({ focusTrigger: false });
    };
    // A press on the trigger that never becomes a click (dragged off, a cancelled touch) mustn't
    // leave the press pending: settle it once the click would have fired.
    const settlePress = () => {
      setTimeout(() => {
        if (!pointerDownOnTriggerWhileOpen.current) return;
        pointerDownOnTriggerWhileOpen.current = false;
        if (!popupRef.current?.contains(document.activeElement)) closeMenu({ focusTrigger: false });
      }, 0);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", settlePress);
    document.addEventListener("pointercancel", settlePress);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", settlePress);
      document.removeEventListener("pointercancel", settlePress);
    };
  }, [open, closeMenu]);

  // JS fallback positioning (design §9.9): set through the CSSOM, never a markup style attribute.
  useEffect(() => {
    const popup = popupRef.current;
    const trigger = triggerRef.current;
    if (!open || !popup || !trigger || supportsAnchorPositioning()) return;
    // Neutralize any CSS anchor positioning first, so the margin read is the unflipped gap.
    popup.style.setProperty("position-area", "none");
    popup.style.setProperty("position-try-fallbacks", "none");
    const margins = getComputedStyle(popup);
    const gap =
      Math.max(parseFloat(margins.marginBlockStart), parseFloat(margins.marginBlockEnd)) || 0;
    const placement = {
      side: (popup.dataset.side ?? "bottom") as Side,
      align: (popup.dataset.align ?? "start") as Align,
      direction: getComputedStyle(trigger).direction === "rtl" ? "rtl" : "ltr",
    } as const;
    popup.style.setProperty("margin", "0");
    const place = () => {
      // Taller than the viewport would be unreachable: cap it, and the popup scrolls (WCAG 1.4.10).
      popup.style.setProperty(
        "max-block-size",
        `${String(document.documentElement.clientHeight - 2 * gap)}px`,
      );
      const { top, left } = placePopup(
        trigger.getBoundingClientRect(),
        { width: popup.offsetWidth, height: popup.offsetHeight },
        {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
        },
        gap,
        placement,
      );
      popup.style.setProperty("top", `${String(top)}px`);
      popup.style.setProperty("left", `${String(left)}px`);
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      for (const property of [
        "position-area",
        "position-try-fallbacks",
        "margin",
        "top",
        "left",
        "max-block-size",
      ]) {
        popup.style.removeProperty(property);
      }
    };
  }, [open]);

  const value = useMemo(
    () => ({
      open,
      triggerId,
      popupId,
      setTrigger: (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
      },
      setPopup: (node: HTMLDivElement | null) => {
        popupRef.current = node;
      },
      popup: () => popupRef.current,
      activeId,
      setActiveId,
      openMenu,
      closeMenu,
      pressTrigger: (button: number) => {
        pointerDownOnTriggerWhileOpen.current = openRef.current && button === 0;
      },
      triggerPressed: (consume = false) => {
        const pressed = pointerDownOnTriggerWhileOpen.current;
        if (consume) pointerDownOnTriggerWhileOpen.current = false;
        return pressed;
      },
    }),
    [open, triggerId, popupId, activeId, openMenu, closeMenu],
  );

  return (
    <div
      {...rest}
      ref={(node) => {
        rootRef.current = node;
        assignRef(rest.ref, node);
      }}
      className={cx(styles.menu, className)}
    >
      <MenuContext value={value}>{children}</MenuContext>
    </div>
  );
}

export type MenuTriggerProps = ButtonProps;

/** The button that opens the menu, styled with Button's variants and sizes (R12.1, R12.9). */
export function MenuTrigger({
  className,
  disabled = false,
  onClick,
  onKeyDown,
  onPointerDown,
  ref,
  ...rest
}: MenuTriggerProps) {
  const menu = useMenu("MenuTrigger");
  const props = {
    ...rest,
    disabled,
    id: menu.triggerId,
    "aria-haspopup": "menu",
    "aria-expanded": menu.open,
    "aria-controls": menu.popupId,
    // An end chevron flips while open (refinement R5.4).
    className: cx(styles.trigger, rest.iconEnd === "chevron-down" && styles.chevron, className),
    ref: (node: HTMLButtonElement | null) => {
      menu.setTrigger(node);
      assignRef(ref, node);
    },
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      menu.pressTrigger(event.button);
      onPointerDown?.(event);
    },
    // Click, Enter and Space all arrive here (R12.3).
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      const wasOpen = menu.triggerPressed(true) || menu.open;
      if (event.defaultPrevented) return;
      if (wasOpen) menu.closeMenu({ focusTrigger: true });
      else menu.openMenu("checked-or-first");
    },
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event);
      // Escape also closes an open menu while focus is on its trigger, and goes no further.
      if (event.key === "Escape" && menu.open) {
        // Prevented too: a native modal <dialog> closes on Escape's default action.
        event.preventDefault();
        event.stopPropagation();
        menu.closeMenu({ focusTrigger: true });
        return;
      }
      // Button's guard covers click, Enter and Space; arrows are ours to block (R4.5).
      if (disabled || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
      event.preventDefault();
      menu.openMenu(event.key === "ArrowDown" ? "first" : "last");
    },
  } as ButtonProps;
  return <Button {...props} />;
}

export interface MenuPopupOwnProps {
  /** Which side of the trigger it opens on; it still flips when it doesn't fit (refinement R5.12). */
  side?: Side | undefined;
  /** Which trigger edge it lines up with. */
  align?: Align | undefined;
}

export type MenuPopupProps = MenuPopupOwnProps &
  Omit<ComponentPropsWithRef<"div">, "role" | "popover">;

/** The popup list of items: `role="menu"`, labelled by its trigger (R12.1). */
export function MenuPopup({
  side = "bottom",
  align = "start",
  className,
  onKeyDown,
  onBlur,
  ref,
  ...rest
}: MenuPopupProps) {
  const menu = useMenu("MenuPopup");
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const all = items(menu.popup());
    const current = all.findIndex((item) => item === document.activeElement);
    const focus = (index: number) => {
      const item = all[(index + all.length) % all.length];
      if (!item) return;
      menu.setActiveId(item.id);
      item.focus();
    };
    switch (event.key) {
      case "ArrowDown":
        focus(current + 1);
        break;
      case "ArrowUp":
        focus(current - 1);
        break;
      case "Home":
        focus(0);
        break;
      case "End":
        focus(all.length - 1);
        break;
      case "Escape":
        event.stopPropagation();
        menu.closeMenu({ focusTrigger: true });
        break;
      default: {
        // Typeahead: the next item whose label starts with the character, cycling (R12.4).
        const key = event.key.toLowerCase();
        if (key.length !== 1 || !/\S/.test(key) || event.ctrlKey || event.metaKey || event.altKey) {
          return;
        }
        const order = [...all.slice(current + 1), ...all.slice(0, current + 1)];
        const match = order.find((item) => item.textContent.trim().toLowerCase().startsWith(key));
        if (match) focus(all.indexOf(match));
        break;
      }
    }
    event.preventDefault();
  };
  // Tab (or any focus move) out of the popup closes it and lets focus go on (R12.6).
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    onBlur?.(event);
    if (menu.triggerPressed()) return;
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    menu.closeMenu({ focusTrigger: false });
  };
  return (
    <div
      {...rest}
      ref={(node) => {
        menu.setPopup(node);
        assignRef(ref, node);
      }}
      id={menu.popupId}
      role="menu"
      tabIndex={-1}
      aria-labelledby={menu.triggerId}
      popover="manual"
      data-side={side}
      data-align={align}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={cx(styles.popup, className)}
    />
  );
}

interface ItemBaseProps {
  /** Shown and announced as unavailable, focusable, but never activated (R12.7). */
  disabled?: boolean | undefined;
  /** Decorative icon before the label. */
  icon?: IconName | undefined;
  /** true: always close on choosing it; false: never. By default, R5.9 decides. */
  closeOnSelect?: boolean | undefined;
}

type ItemKind = "action" | "link" | "toggle";

interface ItemHandlers<E extends HTMLElement> {
  onClick?: ((event: MouseEvent<E>) => void) | undefined;
  onKeyDown?: ((event: KeyboardEvent<E>) => void) | undefined;
  onPointerMove?: ((event: ReactPointerEvent<E>) => void) | undefined;
  onFocus?: ((event: FocusEvent<E>) => void) | undefined;
}

interface ItemOptions<E extends HTMLElement> {
  disabled: boolean;
  kind: ItemKind;
  closeOnSelect: boolean | undefined;
  activate: () => void;
  handlers: ItemHandlers<E>;
}

/**
 * Shared item behavior: roving tabindex, focus that follows the pointer, and choosing by click,
 * Enter or Space (R12.4, R12.5; refinement R5.3, R5.9). A consumer's handlers run first, and
 * preventing their default skips ours.
 */
function useItem<E extends HTMLElement>(
  part: string,
  { disabled, kind, closeOnSelect, activate, handlers }: ItemOptions<E>,
) {
  const menu = useMenu(part);
  const id = useId();
  const choose = (closeByDefault: boolean) => {
    if (disabled) return;
    activate();
    if (closeOnSelect ?? closeByDefault) menu.closeMenu({ focusTrigger: true });
  };
  return {
    id,
    tabIndex: menu.activeId === id ? 0 : -1,
    "aria-disabled": disabled ? true : undefined,
    // However focus arrives (keys, pointer, a tap, a screen reader), it's the item's tab stop.
    onFocus: (event: FocusEvent<E>) => {
      handlers.onFocus?.(event);
      menu.setActiveId(id);
    },
    // Pointing focuses, so one item is ever highlighted; not on touch (refinement R5.3).
    onPointerMove: (event: ReactPointerEvent<E>) => {
      handlers.onPointerMove?.(event);
      if (event.defaultPrevented || event.pointerType === "touch") return;
      if (event.currentTarget === document.activeElement) return;
      event.currentTarget.focus({ preventScroll: true });
    },
    onClick: (event: MouseEvent<E>) => {
      handlers.onClick?.(event);
      if (event.defaultPrevented) return;
      choose(true);
    },
    onKeyDown: (event: KeyboardEvent<E>) => {
      handlers.onKeyDown?.(event);
      if (event.defaultPrevented || (event.key !== "Enter" && event.key !== " ")) return;
      event.stopPropagation();
      if (kind === "link" && !disabled) {
        // Enter's own click follows the link; Space follows it too (refinement R5.8).
        if (event.key === " ") {
          event.preventDefault();
          event.currentTarget.click();
        }
        return;
      }
      event.preventDefault();
      // Space on a checkbox or radio item keeps the menu open (APG; refinement R5.9).
      choose(event.key === "Enter" || kind !== "toggle");
    },
  } as const;
}

/** The label, between an optional icon and an end slot (check mark or new-tab icon). */
function ItemContent({ icon, children }: { icon?: IconName | undefined; children?: ReactNode }) {
  return (
    <>
      {icon && <Icon name={icon} />}
      <span className={styles.label}>{children}</span>
    </>
  );
}

interface MenuItemSelect {
  /** Runs when the item is activated, before the menu closes (and before a link is followed). */
  onSelect?: (() => void) | undefined;
}

/** `newTab` and `rel` only with `href`, where they do something (refinement R5.8). */
type MenuItemAction = { href?: undefined; newTab?: never; rel?: never };
type MenuItemLink = {
  /** Renders a link item: `<a role="menuitem">`, routed for app paths. */
  href: string;
  /** Opens in a new tab and says so. */
  newTab?: boolean | undefined;
  /** Merged with noopener noreferrer when `newTab` is set. */
  rel?: string | undefined;
};

export type MenuItemOwnProps = ItemBaseProps & MenuItemSelect & (MenuItemAction | MenuItemLink);

type DivItemProps = Omit<ComponentPropsWithRef<"div">, "role" | "onSelect" | "children">;
type AnchorItemProps = Omit<
  ComponentPropsWithRef<"a">,
  "role" | "onSelect" | "children" | "href" | "target" | "rel"
>;

export type MenuItemProps = ItemBaseProps &
  MenuItemSelect & { children?: ReactNode } & (
    (MenuItemAction & DivItemProps) | (MenuItemLink & AnchorItemProps)
  );

/** An action item (`role="menuitem"`, R12.2), or with `href` a link item (refinement R5.8). */
export function MenuItem(props: MenuItemProps) {
  return props.href === undefined ? <ActionItem {...props} /> : <LinkItem {...props} />;
}

function ActionItem(props: MenuItemProps & MenuItemAction) {
  const {
    onSelect,
    disabled = false,
    icon,
    closeOnSelect,
    className,
    children,
    onClick,
    onKeyDown,
    onPointerMove,
    onFocus,
    ...rest
  } = props;
  const item = useItem("MenuItem", {
    disabled,
    kind: "action",
    closeOnSelect,
    activate: () => onSelect?.(),
    handlers: { onClick, onKeyDown, onPointerMove, onFocus },
  });
  return (
    <div {...rest} {...item} role="menuitem" className={cx(styles.item, className)}>
      <ItemContent icon={icon}>{children}</ItemContent>
    </div>
  );
}

function LinkItem({
  href,
  newTab = false,
  rel,
  onSelect,
  disabled = false,
  icon,
  closeOnSelect,
  className,
  children,
  onClick,
  onKeyDown,
  onPointerMove,
  onFocus,
  ...rest
}: ItemBaseProps & MenuItemSelect & { children?: ReactNode } & MenuItemLink & AnchorItemProps) {
  const item = useItem("MenuItem", {
    disabled,
    kind: "link",
    closeOnSelect,
    activate: () => onSelect?.(),
    handlers: { onClick, onKeyDown, onPointerMove, onFocus },
  });
  const anchor = { ...rest, ...item, role: "menuitem", className: cx(styles.item, className) };
  const content = (
    <>
      <ItemContent icon={icon}>{children}</ItemContent>
      {newTab && (
        <>
          <VisuallyHidden>{newTabText}</VisuallyHidden>
          <Icon name="external-link" />
        </>
      )}
    </>
  );
  // A disabled link item has no href (nor target or rel), so nothing can follow it.
  if (disabled) return <a {...anchor}>{content}</a>;
  const link = { ...anchor, ...(newTab && { target: "_blank" }), rel: mergeRel(rel, newTab) };
  if (isRoutable(href)) {
    return (
      <RouterLink {...link} to={href}>
        {content}
      </RouterLink>
    );
  }
  return (
    <a {...link} href={href}>
      {content}
    </a>
  );
}

export type MenuCheckboxItemOwnProps = ItemBaseProps & {
  /** Controlled state; pair with `onCheckedChange`. */
  checked?: boolean | undefined;
  /** Uncontrolled initial state. */
  defaultChecked?: boolean | undefined;
  onCheckedChange?: ((checked: boolean) => void) | undefined;
};

export type MenuCheckboxItemProps = MenuCheckboxItemOwnProps & { children?: ReactNode } & Omit<
    ComponentPropsWithRef<"div">,
    "role" | "children" | "defaultChecked"
  >;

/** An on/off option (`role="menuitemcheckbox"` with `aria-checked`, refinement R5.6). */
export function MenuCheckboxItem({
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  icon,
  closeOnSelect,
  className,
  children,
  onClick,
  onKeyDown,
  onPointerMove,
  onFocus,
  ...rest
}: MenuCheckboxItemProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const current = checked ?? uncontrolled;
  const item = useItem("MenuCheckboxItem", {
    disabled,
    kind: "toggle",
    closeOnSelect,
    activate: () => {
      setUncontrolled(!current);
      onCheckedChange?.(!current);
    },
    handlers: { onClick, onKeyDown, onPointerMove, onFocus },
  });
  return (
    <div
      {...rest}
      {...item}
      role="menuitemcheckbox"
      aria-checked={current}
      className={cx(styles.item, className)}
    >
      <ItemContent icon={icon}>{children}</ItemContent>
      <Icon name="check" className={styles.check} />
    </div>
  );
}

export type MenuSeparatorProps = Omit<ComponentPropsWithRef<"div">, "role" | "children">;

/** A divider between sections; never focused, so the keyboard skips it (refinement R5.7). */
export function MenuSeparator({ className, ...rest }: MenuSeparatorProps) {
  return <div {...rest} role="separator" className={cx(styles.separator, className)} />;
}

interface RadioGroupContextValue {
  value: string | undefined;
  select: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface MenuRadioGroupOwnProps<V extends string = string> {
  /** The group's accessible name, shown as a small label (R12.2). */
  label: string;
  /** Controlled value; pair with `onValueChange`. */
  value?: V | undefined;
  /** Uncontrolled initial value. */
  defaultValue?: V | undefined;
  onValueChange?: ((value: V) => void) | undefined;
}

export type MenuRadioGroupProps<V extends string = string> = MenuRadioGroupOwnProps<V> &
  Omit<ComponentPropsWithRef<"div">, "role" | "defaultValue">;

/** A single-select group of `MenuRadioItem`s (R12.2), controlled or uncontrolled. */
export function MenuRadioGroup<V extends string = string>({
  label,
  value,
  defaultValue,
  onValueChange,
  className,
  children,
  ...rest
}: MenuRadioGroupProps<V>) {
  const labelId = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const current = value ?? uncontrolled;
  const context = useMemo(
    () => ({
      value: current,
      select: (next: string) => {
        setUncontrolled(next as V);
        onValueChange?.(next as V);
      },
    }),
    [current, onValueChange],
  );
  return (
    <div {...rest} role="group" aria-labelledby={labelId} className={cx(styles.group, className)}>
      {/* Named by this label, which isn't itself a menu child for assistive technology. */}
      <div id={labelId} className={styles.groupLabel} aria-hidden="true">
        {label}
      </div>
      <RadioGroupContext value={context}>{children}</RadioGroupContext>
    </div>
  );
}

export type MenuRadioItemOwnProps = ItemBaseProps & {
  value: string;
};

export type MenuRadioItemProps = MenuRadioItemOwnProps & { children?: ReactNode } & Omit<
    ComponentPropsWithRef<"div">,
    "role" | "children"
  >;

/** One choice in a `MenuRadioGroup` (`role="menuitemradio"` with `aria-checked`). */
export function MenuRadioItem({
  value,
  icon,
  disabled = false,
  closeOnSelect,
  className,
  children,
  onClick,
  onKeyDown,
  onPointerMove,
  onFocus,
  ...rest
}: MenuRadioItemProps) {
  const group = use(RadioGroupContext);
  if (!group) throw new Error("<MenuRadioItem> must be inside a <MenuRadioGroup>.");
  const item = useItem("MenuRadioItem", {
    disabled,
    kind: "toggle",
    closeOnSelect,
    activate: () => {
      group.select(value);
    },
    handlers: { onClick, onKeyDown, onPointerMove, onFocus },
  });
  return (
    <div
      {...rest}
      {...item}
      role="menuitemradio"
      aria-checked={group.value === value}
      className={cx(styles.item, className)}
    >
      <ItemContent icon={icon}>{children}</ItemContent>
      <Icon name="check" className={styles.check} />
    </div>
  );
}
