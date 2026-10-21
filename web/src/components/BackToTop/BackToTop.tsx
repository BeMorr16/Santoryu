import { useState } from "react";
import { Button, type ButtonProps } from "../Button/Button.tsx";
import type { ButtonLookProps } from "../shared/button.tsx";
import { cx } from "../shared/cx.ts";
import { focusWithoutScroll, pageFocusTarget } from "../shared/focus.ts";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx";
import styles from "./BackToTop.module.css";
import { useMediaQuery } from "./useMediaQuery.ts";
import { useScrolledPast } from "./useScrolledPast.ts";

export type BackToTopPlacement = "corner" | "inline";

/**
 * size.breakpoint.md. Narrower, the corner button never shows by itself: phones scroll to the top
 * from the status bar, and a tall sticky header leaves no room for its scroll padding (owner,
 * 2026-10-21).
 */
const wideViewport = "(min-width: 48em)";

export interface BackToTopOwnProps extends Pick<ButtonLookProps, "variant" | "size"> {
  /** Accessible name. Default "Back to top". */
  label?: string | undefined;
  /** Show the label as text beside the icon. Default false: icon-only, name as a tooltip. */
  showLabel?: boolean | undefined;
  /** Pixels scrolled before it shows. Default: the viewport's height. The corner placement shows only from 48em wide. */
  threshold?: number | undefined;
  /** Overrides the automatic visibility: true always shows it, false always hides it. */
  visible?: boolean | undefined;
  /** "corner" (default): fixed at the viewport's block-end, inline-end corner. "inline": in the flow. */
  placement?: BackToTopPlacement | undefined;
  /** Where focus goes after scrolling. Default: main's h1, else main, else nowhere. */
  focusTarget?: (() => HTMLElement | null) | undefined;
}

export type BackToTopProps = BackToTopOwnProps &
  Omit<
    ButtonProps,
    | keyof BackToTopOwnProps
    | "children"
    | "iconStart"
    | "iconEnd"
    | "aria-pressed"
    | "disabled"
    | "disabledReason"
  >;

/**
 * A Button that scrolls the page to the top and moves focus there (ds-components R5). It appears
 * once the page is scrolled past `threshold` (in the corner, only on viewports from 48em wide), and
 * stays while it has focus, so focus never drops to the body when the page scrolls up under it.
 */
export function BackToTop({
  label = "Back to top",
  showLabel = false,
  threshold,
  visible,
  placement = "corner",
  focusTarget,
  variant = "secondary",
  onClick,
  onFocus,
  onBlur,
  className,
  ...rest
}: BackToTopProps) {
  const scrolledPast = useScrolledPast(threshold);
  const wide = useMediaQuery(wideViewport);
  const [hasFocus, setHasFocus] = useState(false);
  const shown = visible ?? ((placement === "inline" || wide) && (scrolledPast || hasFocus));

  return (
    <Button
      {...rest}
      variant={variant}
      iconStart="arrow-up"
      data-visible={shown || undefined}
      className={cx(styles.backToTop, styles[placement], className)}
      onFocus={(event) => {
        onFocus?.(event);
        setHasFocus(true);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        setHasFocus(false);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        const smooth = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
        window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "instant" });
        focusWithoutScroll(focusTarget?.() ?? pageFocusTarget());
      }}
    >
      {showLabel ? label : <VisuallyHidden>{label}</VisuallyHidden>}
    </Button>
  );
}
