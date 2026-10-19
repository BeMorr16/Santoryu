import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import {
  Link as RouterLink,
  type LinkProps as RouterLinkProps,
  useLocation,
  useResolvedPath,
} from "react-router";
import { Icon } from "../Icon/Icon.tsx";
import {
  ButtonContent,
  buttonClassName,
  type ButtonLabel,
  type ButtonLookProps,
} from "../shared/button.tsx";
import { cx } from "../shared/cx.ts";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx";
import styles from "./Link.module.css";

const routerOptionNames = [
  "prefetch",
  "replace",
  "state",
  "preventScrollReset",
  "viewTransition",
  "reloadDocument",
  "discover",
] as const;

/** React Router's options, for routed (/path) hrefs only (refinement R4.7). */
export type RouterOptions = Pick<RouterLinkProps, (typeof routerOptionNames)[number]>;

type CurrentMatch = "exact" | "section";

/** Button props only make sense with appearance="button" (R5.5). */
interface LinkInline {
  appearance?: "inline" | undefined;
  /** Shows the visited color (refinement R4.9). */
  showVisited?: boolean | undefined;
  /** "section" also marks pages below href, as aria-current="true" (refinement R4.8). */
  currentMatch?: CurrentMatch | undefined;
  variant?: never;
  size?: never;
  iconStart?: never;
  iconEnd?: never;
}

/** Inline-only props would do nothing here (refinement R4.8, R4.9). */
type LinkAsButton = {
  appearance: "button";
  showVisited?: never;
  currentMatch?: never;
} & ButtonLookProps;

export type LinkOwnProps = (LinkInline | LinkAsButton) &
  RouterOptions & {
    /** `/path` routes client-side; anything else is a plain link (R5.2, R5.3). */
    href: string;
    /** Opens in a new tab, and says so (R5.4). */
    newTab?: boolean | undefined;
    /** Merged with noopener noreferrer when newTab is set (refinement R4.6). */
    rel?: string | undefined;
  };

/** Inline links need text; button-styled ones are named like a Button (refinement R4.1, R3.6). */
type LinkLabel =
  | { appearance?: "inline" | undefined; children: ReactNode }
  | ({ appearance: "button" } & ButtonLabel);

/**
 * An anchor's props, minus what Link owns. There's no `disabled` (R5.6), and no `aria-pressed`,
 * which links don't support (refinement R3.13); hyphenated JSX props are only checked when declared.
 */
export type LinkProps = LinkOwnProps &
  LinkLabel &
  Omit<ComponentPropsWithRef<"a">, keyof LinkOwnProps | "children" | "target" | "aria-pressed"> & {
    "aria-pressed"?: never;
  };

/** A same-origin path, not a protocol-relative URL. */
export const isRoutable = (href: string) => href.startsWith("/") && !href.startsWith("//");

/** The caller's rel, then noopener noreferrer for a new tab, without duplicates (refinement R4.6). */
export function mergeRel(rel: string | undefined, newTab: boolean): string | undefined {
  const values = new Set(rel?.split(/\s+/).filter(Boolean));
  if (newTab) values.add("noopener").add("noreferrer");
  return values.size > 0 ? [...values].join(" ") : undefined;
}

/** Plain links drop React Router's options, so they never reach the DOM (refinement R4.7). */
function withoutRouterOptions<P extends object>(props: P): Omit<P, keyof RouterOptions> {
  const isRouterOption = (name: string) => (routerOptionNames as readonly string[]).includes(name);
  return Object.fromEntries(
    Object.entries(props).filter(([name]) => !isRouterOption(name)),
  ) as Omit<P, keyof RouterOptions>;
}

const normalize = (path: string) =>
  (path.length > 1 ? path.replace(/\/+$/, "") : path).toLowerCase();

/** Compared the way NavLink compares: case-insensitive, no trailing slash, path only (refinement R4.8). */
function useCurrent(href: string, match: CurrentMatch): "page" | "true" | undefined {
  const to = normalize(useResolvedPath(href).pathname);
  const at = normalize(useLocation().pathname);
  if (at === to) return "page";
  if (match === "section" && to !== "/" && at.startsWith(`${to}/`)) return "true";
  return undefined;
}

type RoutedLinkProps = Omit<ComponentPropsWithRef<"a">, "href"> &
  RouterOptions & { href: string; currentMatch: CurrentMatch | undefined };

/**
 * Its own component, so the routing hooks only run under a router. Without `currentMatch`
 * (button-styled links) nothing is marked automatically. A caller's aria-current wins.
 */
function RoutedLink({ href, currentMatch, "aria-current": ariaCurrent, ...rest }: RoutedLinkProps) {
  const current = useCurrent(href, currentMatch ?? "exact");
  return (
    <RouterLink
      {...rest}
      to={href}
      aria-current={ariaCurrent ?? (currentMatch === undefined ? undefined : current)}
    />
  );
}

const newTabText = ", opens in new tab";

/** Always an <a> with an href (R5.1), routed client-side for same-origin paths (R5.2). */
export function Link({
  href,
  newTab = false,
  rel,
  appearance = "inline",
  showVisited = false,
  currentMatch,
  variant,
  size,
  iconStart,
  iconEnd,
  className,
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...rest
}: LinkProps) {
  const inline = appearance === "inline";
  const newTabTextId = useId();
  const classes = cx(
    inline
      ? cx(styles.link, showVisited && styles.showVisited)
      : buttonClassName({ variant, size, iconStart, iconEnd, children, extraIcon: newTab }),
    className,
  );
  const content = (
    <>
      <ButtonContent iconStart={iconStart} iconEnd={iconEnd}>
        {children}
      </ButtonContent>
      {newTab && (
        <>
          {/*
            The word joiner stops a break after the text, and nowrap one between it and the icon,
            which CSS otherwise always allows next to an atomic inline (refinement R4.2). Inline
            only: in a flex button the joiner would be a gapped item.
          */}
          {inline ? (
            <span aria-hidden="true" className={styles.newTab}>
              {"\u2060"}
              <Icon name="external-link" className={styles.newTabIcon} />
            </span>
          ) : (
            <Icon name="external-link" />
          )}
          {/* Starts with a comma, so the words never merge in any name computation (refinement R4.2). */}
          <VisuallyHidden id={newTabTextId}>{newTabText}</VisuallyHidden>
        </>
      )}
    </>
  );
  // An explicit name replaces the content, so a new tab is announced through it too (refinement R4.2).
  const anchor = {
    ...rest,
    "aria-label": newTab && ariaLabel ? `${ariaLabel}${newTabText}` : ariaLabel,
    "aria-labelledby":
      newTab && ariaLabelledby ? `${ariaLabelledby} ${newTabTextId}` : ariaLabelledby,
    ...(newTab && { target: "_blank" }),
    rel: mergeRel(rel, newTab),
    className: classes,
  };
  if (isRoutable(href)) {
    return (
      <RoutedLink
        {...anchor}
        href={href}
        currentMatch={inline ? (currentMatch ?? "exact") : undefined}
      >
        {content}
      </RoutedLink>
    );
  }
  return (
    <a {...withoutRouterOptions(anchor)} href={href}>
      {content}
    </a>
  );
}
