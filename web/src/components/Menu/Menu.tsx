import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react";
import { Button, type ButtonProps } from "../Button/Button.tsx";
import { Icon } from "../Icon/Icon.tsx";
import type { IconName } from "../Icon/registry.ts";
import { cx } from "../shared/cx.ts";
import styles from "./Menu.module.css";
import { placePopup } from "./position.ts";

/*
 * WAI-ARIA menu button (R12, design §9). Items are found by DOM query in the popup, in DOM order,
 * so conditional items need no registration. Only the focused item is in the tab sequence.
 */

const itemSelector = '[role^="menuitem"]';

type FocusTarget = "first" | "last" | "checked-or-first";

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

/** CSS anchor positioning with `anchor-scope`, or the JS fallback (decision 0007 G). */
function supportsAnchorPositioning(): boolean {
  return (
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("anchor-name: --a") &&
    CSS.supports("anchor-scope: --a")
  );
}

/** Sets a consumer ref and an internal one to the same node. */
function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

export type MenuProps = ComponentPropsWithRef<"div">;

/** The menu's root. It scopes the anchor name and holds the open state. */
export function Menu({ className, children, ...rest }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>();
  const triggerId = useId();
  const popupId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const pointerDownOnTriggerWhileOpen = useRef(false);

  const focusItem = useCallback((item: HTMLElement | undefined) => {
    if (!item) return;
    setActiveId(item.id);
    item.focus();
  }, []);

  const openMenu = useCallback(
    (focus: FocusTarget) => {
      const popup = popupRef.current;
      if (!popup) return;
      if (!openRef.current) {
        popup.showPopover();
        openRef.current = true;
        setOpen(true);
      }
      const all = items(popup);
      const checked = all.find((item) => item.getAttribute("aria-checked") === "true");
      focusItem(focus === "last" ? all.at(-1) : focus === "first" ? all[0] : (checked ?? all[0]));
    },
    [focusItem],
  );

  const closeMenu = useCallback(({ focusTrigger }: { focusTrigger: boolean }) => {
    if (!openRef.current) return;
    openRef.current = false;
    popupRef.current?.hidePopover();
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

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
    const gap = parseFloat(getComputedStyle(popup).marginBlockStart) || 0;
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
    className: cx(styles.trigger, className),
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

export type MenuPopupProps = Omit<ComponentPropsWithRef<"div">, "role" | "popover">;

/** The popup list of items: `role="menu"`, labelled by its trigger (R12.1). */
export function MenuPopup({ className, onKeyDown, onBlur, ref, ...rest }: MenuPopupProps) {
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
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={cx(styles.popup, className)}
    />
  );
}

interface ItemBaseProps {
  /** Shown and announced as unavailable, focusable, but never activated (R12.7). */
  disabled?: boolean | undefined;
}

/** Shared item behavior: roving tabindex, activation by click, Enter or Space (R12.4, R12.5). */
function useItem(part: string, disabled: boolean, activate: () => void) {
  const menu = useMenu(part);
  const id = useId();
  const run = () => {
    if (disabled) return;
    activate();
    menu.closeMenu({ focusTrigger: true });
  };
  return {
    id,
    tabIndex: menu.activeId === id ? 0 : -1,
    "aria-disabled": disabled ? true : undefined,
    onClick: run,
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      run();
    },
  } as const;
}

export type MenuItemOwnProps = ItemBaseProps & {
  /** Runs when the item is activated, before the menu closes. */
  onSelect?: (() => void) | undefined;
};

export type MenuItemProps = MenuItemOwnProps & { children?: ReactNode } & Omit<
    ComponentPropsWithRef<"div">,
    "role" | "onSelect" | "children"
  >;

/** An action item (`role="menuitem"`, R12.2). */
export function MenuItem({
  onSelect,
  disabled = false,
  className,
  children,
  ...rest
}: MenuItemProps) {
  const item = useItem("MenuItem", disabled, () => onSelect?.());
  return (
    <div {...rest} {...item} role="menuitem" className={cx(styles.item, className)}>
      <span className={styles.label}>{children}</span>
    </div>
  );
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
  /** Decorative icon before the label. */
  icon?: IconName | undefined;
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
  className,
  children,
  ...rest
}: MenuRadioItemProps) {
  const group = use(RadioGroupContext);
  if (!group) throw new Error("<MenuRadioItem> must be inside a <MenuRadioGroup>.");
  const item = useItem("MenuRadioItem", disabled, () => {
    group.select(value);
  });
  return (
    <div
      {...rest}
      {...item}
      role="menuitemradio"
      aria-checked={group.value === value}
      className={cx(styles.item, className)}
    >
      {icon && <Icon name={icon} />}
      <span className={styles.label}>{children}</span>
      <Icon name="check" className={styles.check} />
    </div>
  );
}
