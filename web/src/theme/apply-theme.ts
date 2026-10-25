import type { CSSProperties } from "react";

/** The themes that always exist, from web/tokens/themes/ (theme-creator R2.1). */
export const builtInThemes = ["light", "dark"] as const;

export type BuiltInTheme = (typeof builtInThemes)[number];

/** A custom property name, as tokens.css declares it. */
export type CustomProperty = `--${string}`;

/** What applying a custom theme needs: never token metadata (theme-creator design §1). */
export interface ThemeVars {
  id: string;
  scheme: BuiltInTheme;
  vars: Readonly<Record<CustomProperty, string>>;
}

interface ThemeAttributes {
  "data-theme"?: BuiltInTheme;
  "data-custom-theme"?: string;
}

/** The attributes a theme puts on its element: the scheme, and the custom theme's id. */
export function themeAttributes(theme: BuiltInTheme | ThemeVars): ThemeAttributes {
  return typeof theme === "string"
    ? { "data-theme": theme }
    : { "data-theme": theme.scheme, "data-custom-theme": theme.id };
}

/** A custom theme's properties as a React `style`, set through the CSSOM, so CSP allows it (§1.1). */
export function themeStyle(vars: Readonly<Record<CustomProperty, string>>): CSSProperties {
  return { ...vars };
}

/** The properties each element was given here, so the next theme can remove what it doesn't set. */
const applied = new WeakMap<Element, readonly string[]>();

/**
 * Applies a theme to `root` (theme-creator design §4.1). A built-in theme sets `data-theme`; a
 * custom one also sets `data-custom-theme` and its properties; null (follow the OS) sets neither.
 * Properties set by an earlier call and not by this one are removed.
 */
export function applyToRoot(
  theme: BuiltInTheme | ThemeVars | null,
  root: HTMLElement = document.documentElement,
): void {
  const attributes: ThemeAttributes = theme === null ? {} : themeAttributes(theme);
  for (const name of ["data-theme", "data-custom-theme"] as const) {
    const value = attributes[name];
    if (value === undefined) root.removeAttribute(name);
    else root.setAttribute(name, value);
  }
  const vars = theme !== null && typeof theme !== "string" ? theme.vars : {};
  for (const name of applied.get(root) ?? []) {
    if (!(name in vars)) root.style.removeProperty(name);
  }
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  applied.set(root, Object.keys(vars));
}
