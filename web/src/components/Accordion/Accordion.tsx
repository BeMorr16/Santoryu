import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { cx } from "../shared/cx.ts";
import { Icon } from "../Icon/Icon.tsx";
import { Typography, type TypographyVariant } from "../Typography/Typography.tsx";
import styles from "./Accordion.module.css";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

export interface AccordionOwnProps {
  /** Every item's heading level, from the page outline (refinement R13.3). Default 3. */
  headingLevel?: HeadingLevel | undefined;
  /** Every item's heading look (Typography). Default "h4". */
  headingVariant?: TypographyVariant | undefined;
  /** Opening an item closes the others (refinement R13.5). */
  exclusive?: boolean | undefined;
  /** Panels become regions named by their button; only for about six or fewer panels (R13.9). */
  region?: boolean | undefined;
}

export type AccordionProps = AccordionOwnProps &
  Omit<ComponentPropsWithRef<"div">, keyof AccordionOwnProps>;

export interface AccordionItemOwnProps {
  /** The heading's content, inside its button. No links or buttons (refinement R13.2). */
  heading: ReactNode;
  /** Controlled open state; pair with `onOpenChange` (refinement R13.4). */
  open?: boolean | undefined;
  /** Uncontrolled initial state. Default false. */
  defaultOpen?: boolean | undefined;
  /** Called with every requested change, controlled or not. */
  onOpenChange?: ((open: boolean) => void) | undefined;
}

/** `children` is the panel's content. */
export type AccordionItemProps = AccordionItemOwnProps &
  Omit<ComponentPropsWithRef<"div">, keyof AccordionItemOwnProps>;

type Motion = "animate" | "instant";

interface AccordionContextValue {
  headingLevel: HeadingLevel;
  headingVariant: TypographyVariant;
  region: boolean;
  /** Registers an item's close request; returns the unregister. */
  register: (id: string, close: () => void) => () => void;
  /** Reports that an item opened, so an exclusive group closes the others. */
  opened: (id: string) => void;
}

// Without an Accordion, an item works alone with the defaults (refinement R13.3).
const AccordionContext = createContext<AccordionContextValue>({
  headingLevel: 3,
  headingVariant: "h4",
  region: false,
  register: () => () => undefined,
  opened: () => undefined,
});

/** A group of `AccordionItem`s sharing a heading level and look (refinement R13). */
export function Accordion({
  headingLevel = 3,
  headingVariant = "h4",
  exclusive = false,
  region = false,
  className,
  children,
  ...rest
}: AccordionProps) {
  const closers = useRef(new Map<string, () => void>());
  const register = useCallback((id: string, close: () => void) => {
    closers.current.set(id, close);
    return () => {
      closers.current.delete(id);
    };
  }, []);
  const opened = useCallback(
    (id: string) => {
      if (!exclusive) return;
      for (const [other, close] of closers.current) if (other !== id) close();
    },
    [exclusive],
  );
  const context = useMemo(
    () => ({ headingLevel, headingVariant, region, register, opened }),
    [headingLevel, headingVariant, region, register, opened],
  );
  return (
    <AccordionContext value={context}>
      <div {...rest} className={cx(styles.accordion, className)}>
        {children}
      </div>
    </AccordionContext>
  );
}

/** One heading button and its panel (the WAI-ARIA APG accordion pattern, refinement R13.2). */
export function AccordionItem({
  heading,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...rest
}: AccordionItemProps) {
  const { headingLevel, headingVariant, region, register, opened } = useContext(AccordionContext);
  const id = useId();
  const triggerId = `${id}trigger`;
  const panelId = `${id}panel`;
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  const controlled = openProp !== undefined;
  const [motion, setMotion] = useState<Motion>("animate");

  // A change after the first render animates; a closing panel stays rendered until it ends (R13.8).
  const [animating, setAnimating] = useState(false);
  const [previousOpen, setPreviousOpen] = useState(open);
  if (open !== previousOpen) {
    setPreviousOpen(open);
    setAnimating(motion === "animate");
  }
  const hidden = !open && !animating;

  // Every open or close goes through here: applied when uncontrolled, only reported when
  // controlled (refinement R13.4).
  const request = useCallback(
    (next: boolean, nextMotion: Motion) => {
      setMotion(nextMotion);
      if (!controlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );

  const close = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    close.current = () => {
      if (open) request(false, "animate");
    };
  }, [open, request]);
  useLayoutEffect(
    () =>
      register(id, () => {
        close.current();
      }),
    [register, id],
  );

  // In a layout effect, so an exclusive group's other items close in the same frame (R13.5).
  const wasOpen = useRef(open);
  useLayoutEffect(() => {
    if (open && !wasOpen.current) opened(id);
    wasOpen.current = open;
  }, [open, opened, id]);

  // getAnimations() flushes style, so the transition this render started is already listed.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!animating || !panel) return;
    let current = true;
    void Promise.allSettled(panel.getAnimations().map((animation) => animation.finished)).then(
      () => {
        if (current) setAnimating(false);
      },
    );
    return () => {
      current = false;
    };
  }, [animating, open]);

  // An instant reveal lasts one change: once its open row has computed (read here, with the
  // transition off), turning the transition back on starts nothing, and later changes animate.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (motion !== "instant" || !panel) return;
    getComputedStyle(panel).getPropertyValue("grid-template-rows");
    setMotion("animate");
  }, [motion, open]);

  // React renders `hidden` as a boolean and has no onBeforeMatch, so the component sets
  // `until-found` and the listener itself; the prerendered HTML keeps plain `hidden` (R13.7).
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!hidden || !panel) return;
    // Closed by something other than its button (an exclusive sibling, a controlled parent), a
    // panel holding focus would drop it to the page; it goes to the button instead.
    if (panel.contains(document.activeElement)) triggerRef.current?.focus();
    panel.setAttribute("hidden", "until-found");
    const reveal = () => {
      flushSync(() => {
        request(true, "instant");
      });
      // The browser drops `hidden` after this event. If a controlled item stayed closed (its
      // parent ignored the request), hide it again so it keeps following `open` (R13.4).
      requestAnimationFrame(() => {
        if (!panel.hasAttribute("data-open")) panel.setAttribute("hidden", "until-found");
      });
    };
    panel.addEventListener("beforematch", reveal);
    return () => {
      panel.removeEventListener("beforematch", reveal);
    };
  }, [hidden, request]);

  return (
    <div {...rest} className={cx(styles.item, className)}>
      <Typography as={`h${String(headingLevel)}` as `h${HeadingLevel}`} variant={headingVariant}>
        <button
          type="button"
          ref={triggerRef}
          id={triggerId}
          className={styles.trigger}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            request(!open, "animate");
          }}
        >
          <span className={styles.label}>{heading}</span>
          <Icon name="chevron-down" size="inherit" className={styles.chevron} />
        </button>
      </Typography>
      <div
        ref={panelRef}
        id={panelId}
        className={styles.panel}
        hidden={hidden}
        data-open={open ? "" : undefined}
        data-animating={animating ? "" : undefined}
        data-motion={motion === "instant" ? "instant" : undefined}
        role={region ? "region" : undefined}
        aria-labelledby={region ? triggerId : undefined}
      >
        <div className={styles.clip}>
          <div className={styles.body}>{children}</div>
        </div>
      </div>
    </div>
  );
}
