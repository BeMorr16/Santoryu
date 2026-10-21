/**
 * The visitor's theme (R13.3–R13.7, R13.11): the one module the switcher and the pre-paint script
 * agree on. Until the visitor chooses Light or Dark, the page follows the OS color scheme
 * (decision 0007 F, amended 2026-10-18). theme-creator extends `ThemePreference` and this store.
 */
export const themePreferences = ["light", "dark"] as const;

export type ThemePreference = (typeof themePreferences)[number];

export const STORAGE_KEY = "theme";

const darkQuery = "(prefers-color-scheme: dark)";

/** A stored choice, or null for none. Legacy "system" values and anything invalid are none. */
function parse(value: string | null): ThemePreference | null {
  return themePreferences.find((preference) => preference === value) ?? null;
}

/** A choice storage refused to hold, so it still applies for this page (R13.5). */
let pagePreference: ThemePreference | undefined;

const listeners = new Set<() => void>();

/** The visitor's choice, or null to follow the OS. Never throws (R13.5). */
export function readPreference(): ThemePreference | null {
  if (pagePreference !== undefined) return pagePreference;
  try {
    return parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** The OS color scheme. */
export function readSystemTheme(): ThemePreference {
  return window.matchMedia(darkQuery).matches ? "dark" : "light";
}

/** What the page shows: the choice, or the OS scheme when there's none. */
export function readEffectiveTheme(): ThemePreference {
  return readPreference() ?? readSystemTheme();
}

/** A choice sets `data-theme`; no choice removes it, so the OS scheme applies through CSS. */
export function applyPreference(
  preference: ThemePreference | null,
  root: Element = document.documentElement,
): void {
  if (preference === null) root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", preference);
}

/** Applies first, then stores (if storage allows), then notifies subscribers. */
export function writePreference(preference: ThemePreference): void {
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
 * Calls `listener` when the effective theme may have changed: a choice on this page or in another
 * tab of the site (R13.7), or an OS scheme change (R13.6).
 */
export function subscribe(listener: () => void): () => void {
  // `key` is null when another tab clears storage.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    pagePreference = undefined;
    applyPreference(parse(event.key === null ? null : event.newValue));
    listener();
  };
  const scheme = window.matchMedia(darkQuery);
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  scheme.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    scheme.removeEventListener("change", listener);
  };
}
