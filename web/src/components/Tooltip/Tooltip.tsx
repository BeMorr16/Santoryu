import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ElementType,
  type FocusEvent,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { cx } from "../shared/cx.ts";
import {
  measureArrow,
  placePopup,
  supportsAnchorPositioning,
  type PlacedSide,
} from "../shared/position.ts";
import { assignRef } from "../shared/ref.ts";
import styles from "./Tooltip.module.css";

/*
 * WAI-ARIA APG tooltip and WCAG 1.4.13 (refinement R14, design §15): shows on hover and keyboard
 * focus, can be hovered, stays until dismissed, and Escape hides it. A manual popover in the top
 * layer, so nothing clips it.
 */

/** Behavior constants, not tokens (refinement R14.5). */
const showDelay = 300;
const hideDelay = 150;

/** The open tooltip, and when the last one hid: one shows at a time, and a warm row shows at once. */
const active: { owner: object | null; hide: () => void; hiddenAt: number } = {
  owner: null,
  hide: () => undefined,
  hiddenAt: Number.NEGATIVE_INFINITY,
};

export type TooltipSide = "top" | "bottom" | "start" | "end";

export interface TooltipOwnProps {
  /** The popup's text. No links or buttons (refinement R14.2). */
  content: ReactNode;
  /** "description" links it to the trigger; "name" only repeats the trigger's name (R14.3). */
  kind?: "description" | "name" | undefined;
  /** Which side of the trigger; it flips and shifts to stay in view (R14.7). */
  side?: TooltipSide | undefined;
  /** Controlled open state; pair with `onOpenChange` (R14.4). */
  open?: boolean | undefined;
  /** Uncontrolled initial state. Default false. */
  defaultOpen?: boolean | undefined;
  /** Called with every requested change, controlled or not. */
  onOpenChange?: ((open: boolean) => void) | undefined;
}

/** What the trigger must accept: every library control and native element does. */
type TriggerProps = Pick<
  HTMLAttributes<HTMLElement>,
  | "aria-describedby"
  | "onPointerEnter"
  | "onPointerLeave"
  | "onPointerDown"
  | "onFocus"
  | "onBlur"
  | "onClick"
> & { ref?: Ref<HTMLElement> | undefined };

type PopupProps = Omit<
  ComponentPropsWithRef<"span">,
  keyof TooltipOwnProps | "children" | "popover" | "role" | "id"
>;

export type TooltipProps = TooltipOwnProps & {
  /** Exactly one focusable element that takes a ref and DOM props (R14.1). */
  children: ReactElement<TriggerProps>;
} & PopupProps;

type TooltipBaseProps = Omit<TooltipOwnProps, "content" | "kind"> & {
  /** Shown first, never announced (it repeats the trigger's name). */
  name?: ReactNode;
  /** Announced through aria-describedby. */
  description?: ReactNode;
  /** A press on the trigger shows the tooltip instead of hiding it (a disabled Button's reason, R14.11). */
  showOnPress?: boolean | undefined;
  /** Checked when it would show; false skips showing (ThemeSwitcher's visible label, R14.13). */
  shouldShow?: (() => boolean) | undefined;
  children: ReactElement<TriggerProps>;
} & PopupProps;

const hasContent = (node: ReactNode) => node !== undefined && node !== null && node !== false;

/** The side the popup is drawn on before it's measured (design §15.4): physical, as in ltr. */
const requestedSide: Record<TooltipSide, PlacedSide> = {
  top: "top",
  bottom: "bottom",
  start: "left",
  end: "right",
};

/**
 * The library's tooltip: the cloned trigger, then the popup when there's a name or a description.
 * Button, Link and ThemeSwitcher always render through it, so the trigger is never remounted when
 * the popup comes or goes (design §15.2). Not exported from the library.
 */
export function TooltipBase({
  name,
  description,
  showOnPress = false,
  shouldShow,
  side = "top",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  onPointerEnter: onPopupPointerEnter,
  onPointerLeave: onPopupPointerLeave,
  ref,
  children,
  ...rest
}: TooltipBaseProps) {
  const id = useId();
  const descriptionId = `${id}description`;
  const anchorName = `--tooltip-${id.replace(/[^\w-]/g, "")}`;
  const hasName = hasContent(name);
  const hasDescription = hasContent(description);
  const hasPopup = hasName || hasDescription;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = hasPopup && (openProp ?? uncontrolledOpen);

  const triggerRef = useRef<HTMLElement | null>(null);
  const popupRef = useRef<HTMLSpanElement | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pointerOn = useRef(false);
  const pressed = useRef(false);
  const owner = useRef({});
  // The latest render's values, so the callbacks below stay stable: an inline onOpenChange
  // mustn't re-run the effects that show the popover (that would restart its fade).
  const values = {
    open,
    controlled: openProp !== undefined,
    onOpenChange,
    shouldShow,
    showOnPress,
    child: children.props,
  };
  const latest = useRef(values);
  // The last requested state, so a show and a hide in one event (a warm hover, then a press)
  // don't compare against a render that hasn't happened yet. Each commit resets it to what
  // applies, so a controlled parent that ignored a request can be asked again.
  const requested = useRef(open);
  useLayoutEffect(() => {
    latest.current = values;
    requested.current = values.open;
  });

  // Every show or hide goes through here: applied now when uncontrolled, only reported when
  // controlled (refinement R14.4).
  const request = useCallback((next: boolean) => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
    if (!next) pressed.current = false;
    if (next === requested.current) return;
    requested.current = next;
    if (!latest.current.controlled) setUncontrolledOpen(next);
    latest.current.onOpenChange?.(next);
  }, []);

  const show = useCallback(() => {
    // An open menu or panel takes over (R14.5).
    if (triggerRef.current?.getAttribute("aria-expanded") === "true") return;
    if (latest.current.shouldShow?.() === false) return;
    request(true);
  }, [request]);

  const hide = useCallback(() => {
    request(false);
  }, [request]);

  // A unique anchor name, appended to any the trigger already has (MenuTrigger's), set through
  // the CSSOM so the CSP stays strict (design §15.4).
  useLayoutEffect(() => {
    const popup = popupRef.current;
    const trigger = triggerRef.current;
    if (!hasPopup || !popup || !trigger || !supportsAnchorPositioning()) return;
    const existing = getComputedStyle(trigger).getPropertyValue("anchor-name").trim();
    trigger.style.setProperty(
      "anchor-name",
      existing === "" || existing === "none" ? anchorName : `${existing}, ${anchorName}`,
    );
    popup.style.setProperty("position-anchor", anchorName);
    return () => {
      trigger.style.removeProperty("anchor-name");
      popup.style.removeProperty("position-anchor");
    };
  }, [hasPopup, anchorName]);

  // Applies `open` to the popover, one tooltip at a time.
  useLayoutEffect(() => {
    const popup = popupRef.current;
    if (!open || !popup) return;
    const self = owner.current;
    if (active.owner !== null && active.owner !== self) active.hide();
    active.owner = self;
    active.hide = hide;
    popup.showPopover();
    return () => {
      if (active.owner === self) {
        active.owner = null;
        active.hiddenAt = Date.now();
      }
      if (popup.isConnected) popup.hidePopover();
    };
  }, [open, hide]);

  // Placement while open: the JS fallback where CSS anchor positioning is missing, then the arrow,
  // measured each time since WebKit can't tell CSS which fallback it used (R14.7, R14.8).
  useLayoutEffect(() => {
    const popup = popupRef.current;
    const trigger = triggerRef.current;
    if (!open || !popup || !trigger) return;
    const anchored = supportsAnchorPositioning();
    let gap = 0;
    if (!anchored) {
      popup.style.setProperty("position-area", "none");
      popup.style.setProperty("position-try-fallbacks", "none");
      gap = parseFloat(getComputedStyle(popup).marginTop) || 0;
      popup.style.setProperty("margin", "0");
    }
    const place = () => {
      if (!anchored) {
        const { top, left } = placePopup(
          trigger.getBoundingClientRect(),
          { width: popup.offsetWidth, height: popup.offsetHeight },
          {
            width: document.documentElement.clientWidth,
            height: document.documentElement.clientHeight,
          },
          gap,
          {
            side,
            align: "center",
            direction: getComputedStyle(trigger).direction === "rtl" ? "rtl" : "ltr",
          },
        );
        popup.style.setProperty("top", `${String(top)}px`);
        popup.style.setProperty("left", `${String(left)}px`);
      }
      const inset =
        (parseFloat(getComputedStyle(popup).borderTopLeftRadius) || 0) +
        (parseFloat(getComputedStyle(popup, "::before").width) || 0);
      const arrow = measureArrow(
        trigger.getBoundingClientRect(),
        popup.getBoundingClientRect(),
        inset,
      );
      popup.dataset.placed = arrow.side;
      popup.style.setProperty("--_arrow-offset", `${String(arrow.offset)}px`);
    };
    place();
    // Chromium moves an anchored popup for a scroll only by the second frame after it, so a
    // scroll is measured then (WebKit has moved it already). Coalesced, one pending at a time.
    let frame = 0;
    const placeAfterScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(place);
      });
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", placeAfterScroll, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", placeAfterScroll, true);
      for (const property of ["position-area", "position-try-fallbacks", "margin", "top", "left"]) {
        popup.style.removeProperty(property);
      }
    };
  }, [open, side]);

  // Escape hides it and goes no further, so a dialog or menu around it stays open (R14.6).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      hide();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, hide]);

  // An opened menu or panel takes over (R14.6): MenuTrigger needs no Menu-specific code.
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!open || !trigger) return;
    const observer = new MutationObserver(() => {
      if (trigger.getAttribute("aria-expanded") === "true") hide();
    });
    observer.observe(trigger, { attributes: true, attributeFilter: ["aria-expanded"] });
    return () => {
      observer.disconnect();
    };
  }, [open, hide]);

  // A reason shown by a press stays until a press outside, Escape or blur (R14.11).
  useEffect(() => {
    if (!open || !showOnPress) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!pressed.current || !(event.target instanceof Node)) return;
      if (triggerRef.current?.contains(event.target) || popupRef.current?.contains(event.target)) {
        return;
      }
      hide();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, showOnPress, hide]);

  useEffect(
    () => () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    },
    [],
  );

  const enter = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType === "touch") return;
      pointerOn.current = true;
      clearTimeout(hideTimer.current);
      if (requested.current) return;
      clearTimeout(showTimer.current);
      // Moving along a row of controls doesn't wait at each one (R14.5).
      if (active.owner !== null || Date.now() - active.hiddenAt < showDelay) show();
      else showTimer.current = setTimeout(show, showDelay);
    },
    [show],
  );

  const leave = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType === "touch") return;
      pointerOn.current = false;
      clearTimeout(showTimer.current);
      if (pressed.current || !requested.current) return;
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(hide, hideDelay);
    },
    [hide],
  );

  const childRef = children.props.ref;
  // Merged into the trigger's own: its ref still gets the node, and its handlers run first.
  const triggerProps = useMemo(
    () => ({
      ref: (node: HTMLElement | null) => {
        triggerRef.current = node;
        assignRef(childRef, node);
      },
      onPointerEnter: (event: ReactPointerEvent<HTMLElement>) => {
        latest.current.child.onPointerEnter?.(event);
        enter(event);
      },
      onPointerLeave: (event: ReactPointerEvent<HTMLElement>) => {
        latest.current.child.onPointerLeave?.(event);
        leave(event);
      },
      // A press acts now, and the tooltip would cover what changes (R14.6).
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        latest.current.child.onPointerDown?.(event);
        clearTimeout(showTimer.current);
        if (!latest.current.showOnPress) hide();
      },
      // Keyboard focus shows it at once; focus from a mouse press doesn't (R14.5).
      onFocus: (event: FocusEvent<HTMLElement>) => {
        latest.current.child.onFocus?.(event);
        if (event.currentTarget.matches(":focus-visible")) show();
      },
      onBlur: (event: FocusEvent<HTMLElement>) => {
        latest.current.child.onBlur?.(event);
        if (pressed.current || !pointerOn.current) hide();
      },
      // After Button's click guard, so click, tap, Enter and Space all show the reason (R14.11).
      onClick: (event: MouseEvent<HTMLElement>) => {
        latest.current.child.onClick?.(event);
        if (!latest.current.showOnPress) return;
        show();
        pressed.current = true;
      },
    }),
    [childRef, enter, leave, show, hide],
  );

  // The same two slots either way, so the trigger is never remounted.
  if (!hasPopup) {
    return (
      <>
        {children}
        {null}
      </>
    );
  }

  // The child's own element, with Tooltip's props merged in (as cloneElement would merge them).
  const Trigger = children.type as ElementType<TriggerProps>;
  const describedBy = children.props["aria-describedby"];

  return (
    <>
      <Trigger
        // A null key would become the key "null", and remount the trigger.
        key={children.key ?? undefined}
        {...children.props}
        {...triggerProps}
        aria-describedby={hasDescription ? cx(describedBy, descriptionId) : describedBy}
      />
      <span
        {...rest}
        ref={(node) => {
          popupRef.current = node;
          assignRef(ref, node);
        }}
        id={`${id}popup`}
        popover="manual"
        role={hasDescription ? "tooltip" : undefined}
        aria-hidden={hasDescription ? undefined : true}
        data-side={side}
        data-placed={requestedSide[side]}
        className={cx(styles.tooltip, className)}
        onPointerEnter={(event) => {
          onPopupPointerEnter?.(event);
          enter(event);
        }}
        onPointerLeave={(event) => {
          onPopupPointerLeave?.(event);
          leave(event);
        }}
      >
        {hasName && (
          <span className={styles.name} aria-hidden="true">
            {name}
          </span>
        )}
        {hasDescription && (
          <span className={styles.description} id={descriptionId}>
            {description}
          </span>
        )}
      </span>
    </>
  );
}

/**
 * A short hint for one focusable control: its description, or a visible copy of its name
 * (refinement R14). It wraps the control without adding an element around it.
 */
export function Tooltip({ content, kind = "description", children, ...rest }: TooltipProps) {
  return (
    <TooltipBase {...rest} {...(kind === "name" ? { name: content } : { description: content })}>
      {children}
    </TooltipBase>
  );
}
