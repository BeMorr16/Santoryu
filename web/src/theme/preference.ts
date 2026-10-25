import { applyToRoot, builtInThemes, type BuiltInTheme } from "./apply-theme.ts";
import {
  CUSTOM_THEMES_KEY,
  deleteCustomTheme,
  findCustomTheme,
  subscribeCustomThemeWrites,
  type StoredTheme,
} from "./custom-themes.ts";

/**
 * The visitor's theme (R13.3–R13.7, R13.11; theme-creator R9): the one module the switcher and the
 * pre-paint script agree on. Until the visitor chooses a theme, the page follows the OS color
 * scheme (decision 0007 F, amended 2026-10-18 and by decision 0012).
 */
export { builtInThemes, type BuiltInTheme };

/** Light, Dark, or a saved custom theme by id (theme-creator design §4.1). */
export type ThemeChoice = BuiltInTheme | `custom:${string}`;

export const STORAGE_KEY = "theme";

const customPrefix = "custom:";
const darkQuery = "(prefers-color-scheme: dark)";

/** The choice that selects a saved custom theme. */
export const customChoice = (id: string): ThemeChoice => `${customPrefix}${id}`;

/** The saved custom theme a choice selects, if it is one and it still exists. */
export function customThemeOf(choice: ThemeChoice | null): StoredTheme | undefined {
  return choice?.startsWith(customPrefix) === true
    ? findCustomTheme(choice.slice(customPrefix.length))
    : undefined;
}

/**
 * A stored choice, or null for none. Legacy "system" values, anything invalid, and custom themes
 * that no longer exist are none (theme-creator R9.5).
 */
function parse(value: string | null): ThemeChoice | null {
  const builtIn = builtInThemes.find((theme) => theme === value);
  if (builtIn) return builtIn;
  if (value === null || !value.startsWith(customPrefix)) return null;
  const choice = value as ThemeChoice;
  return customThemeOf(choice) ? choice : null;
}

/** A choice storage refused to hold, so it still applies for this page (R13.5). */
let pagePreference: ThemeChoice | undefined;

const listeners = new Set<() => void>();

/** The visitor's choice, or null to follow the OS. Never throws (R13.5). */
export function readPreference(): ThemeChoice | null {
  if (pagePreference !== undefined) return parse(pagePreference);
  try {
    return parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** The OS color scheme. */
export function readSystemTheme(): BuiltInTheme {
  return window.matchMedia(darkQuery).matches ? "dark" : "light";
}

/** What the page shows: the choice, or the OS scheme when there's none. */
export function readEffectiveTheme(): ThemeChoice {
  return readPreference() ?? readSystemTheme();
}

/**
 * A built-in choice sets `data-theme`; a custom one also sets `data-custom-theme` and its custom
 * properties; no choice (or an unknown custom theme) removes them, so the OS scheme applies.
 */
export function applyPreference(
  preference: ThemeChoice | null,
  root: HTMLElement = document.documentElement,
): void {
  const builtIn = builtInThemes.find((theme) => theme === preference);
  applyToRoot(builtIn ?? customThemeOf(preference) ?? null, root);
}

/** Applies first, then stores (if storage allows), then notifies subscribers. */
export function writePreference(preference: ThemeChoice): void {
  applyPreference(preference);
  try {
    localStorage.setItem(STORAGE_KEY, preference);
    pagePreference = undefined;
  } catch {
    // Storage is unavailable or full: the choice lasts for this page only.
    pagePreference = preference;
  }
  for (const listener of listeners) listener();
}

/**
 * Deletes a saved custom theme. If the site is using it, the site switches to the built-in theme
 * with the same scheme first, stored as the visitor's choice (theme-creator R2.9).
 */
export function deleteTheme(id: string): void {
  const theme = findCustomTheme(id);
  if (theme && readPreference() === customChoice(id)) writePreference(theme.scheme);
  deleteCustomTheme(id);
}

/**
 * Calls `listener` when the effective theme may have changed: a choice on this page or in another
 * tab of the site (R13.7), a saved theme changing (theme-creator R3.5, R9.4), or an OS scheme
 * change (R13.6). The page's theme is re-applied first.
 */
export function subscribe(listener: () => void): () => void {
  // `key` is null when another tab clears storage.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY && event.key !== CUSTOM_THEMES_KEY) return;
    pagePreference = undefined;
    applyPreference(readPreference());
    listener();
  };
  const onWrite = () => {
    applyPreference(readPreference());
    listener();
  };
  const scheme = window.matchMedia(darkQuery);
  listeners.add(listener);
  const unsubscribeWrites = subscribeCustomThemeWrites(onWrite);
  window.addEventListener("storage", onStorage);
  scheme.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    unsubscribeWrites();
    window.removeEventListener("storage", onStorage);
    scheme.removeEventListener("change", listener);
  };
}
