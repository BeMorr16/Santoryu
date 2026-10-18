import { useSyncExternalStore } from "react";
import { readEffectiveTheme, subscribe, type ThemePreference } from "./preference.ts";

const serverSnapshot = () => null;

/**
 * The theme the page shows: the visitor's choice, or the OS scheme (R13.2, R13.6). Prerendered
 * HTML can't know either, so the server and hydration render null, then React re-renders with
 * the real value, with no mismatch (R13.8).
 */
export function useEffectiveTheme(): ThemePreference | null {
  return useSyncExternalStore(subscribe, readEffectiveTheme, serverSnapshot);
}
