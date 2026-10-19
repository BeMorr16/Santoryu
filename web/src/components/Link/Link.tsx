import type { ComponentPropsWithRef } from "react";
import { Link as RouterLink } from "react-router";
import { Icon } from "../Icon/Icon.tsx";
import { ButtonContent, buttonClassName, type ButtonLookProps } from "../shared/button.tsx";
import { cx } from "../shared/cx.ts";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx";
import styles from "./Link.module.css";

/** Button props only make sense with appearance="button" (R5.5). */
interface LinkInline {
  appearance?: "inline" | undefined;
  variant?: never;
  size?: never;
  iconStart?: never;
  iconEnd?: never;
}

type LinkAsButton = { appearance: "button" } & ButtonLookProps;

export type LinkOwnProps = (LinkInline | LinkAsButton) & {
  /** `/path` routes client-side; anything else is a plain link (R5.2, R5.3). */
  href: string;
  /** Opens in a new tab, and says so (R5.4). */
  newTab?: boolean | undefined;
};

/**
 * An anchor's props, minus what Link owns. There's no `disabled` (R5.6), and no `aria-pressed`,
 * which links don't support (refinement R3.13); hyphenated JSX props are only checked when declared.
 */
export type LinkProps = LinkOwnProps &
  Omit<ComponentPropsWithRef<"a">, keyof LinkOwnProps | "target" | "rel" | "aria-pressed"> & {
    "aria-pressed"?: never;
  };

/** A same-origin path, not a protocol-relative URL. */
export const isRoutable = (href: string) => href.startsWith("/") && !href.startsWith("//");

/** Always an <a> with an href (R5.1), routed client-side for same-origin paths (R5.2). */
export function Link({
  href,
  newTab = false,
  appearance = "inline",
  variant,
  size,
  iconStart,
  iconEnd,
  className,
  children,
  ...rest
}: LinkProps) {
  const classes = cx(
    appearance === "button"
      ? buttonClassName({ variant, size, iconStart, iconEnd, children, extraIcon: newTab })
      : styles.link,
    className,
  );
  const content = (
    <>
      <ButtonContent iconStart={iconStart} iconEnd={iconEnd}>
        {children}
      </ButtonContent>
      {newTab && (
        <>
          <Icon name="external-link" className={styles.newTabIcon} />
          {/* The space sits outside the hidden span so every name computation keeps it. */}{" "}
          <VisuallyHidden>(opens in new tab)</VisuallyHidden>
        </>
      )}
    </>
  );
  const tab = newTab ? ({ target: "_blank", rel: "noopener noreferrer" } as const) : {};
  if (isRoutable(href)) {
    return (
      <RouterLink {...rest} {...tab} to={href} className={classes}>
        {content}
      </RouterLink>
    );
  }
  return (
    <a {...rest} {...tab} href={href} className={classes}>
      {content}
    </a>
  );
}
