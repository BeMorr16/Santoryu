import { useSyncExternalStore } from "react";
import {
  readCustomThemes,
  storageAvailable,
  subscribeCustomThemes,
  type StoredTheme,
} from "./custom-themes.ts";

const noThemes: readonly StoredTheme[] = [];
const serverThemes = () => noThemes;
const serverAvailable = () => true;

/**
 * The saved custom themes (theme-creator design §4.1). Prerendered HTML and hydration render none;
 * they appear right after, with no mismatch.
 */
export function useCustomThemes(): readonly StoredTheme[] {
  return useSyncExternalStore(subscribeCustomThemes, readCustomThemes, serverThemes);
}

/** Whether storage keeps the themes past this page (R9.6). Assumed true before hydration. */
export function useStorageAvailable(): boolean {
  return useSyncExternalStore(subscribeCustomThemes, storageAvailable, serverAvailable);
}
