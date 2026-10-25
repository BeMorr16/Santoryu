/**
 * A controllable `prefers-color-scheme` for jsdom, which has no matchMedia. Only the dark query
 * matters to the theme code; every other query never matches.
 */
let dark = false;
const listeners = new Set<(event: MediaQueryListEvent) => void>();
const darkQuery = "(prefers-color-scheme: dark)";

export function installSystemTheme(): void {
  window.matchMedia = (query: string) =>
    ({
      media: query,
      get matches() {
        return query === darkQuery && dark;
      },
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        if (query === darkQuery) listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

/** Sets the emulated OS scheme and notifies listeners, as a real OS change would. */
export function setSystemTheme(theme: "light" | "dark"): void {
  if ((theme === "dark") === dark) return;
  dark = theme === "dark";
  for (const listener of listeners)
    listener({ matches: dark, media: darkQuery } as MediaQueryListEvent);
}
