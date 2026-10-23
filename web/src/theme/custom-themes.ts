import { tokenNames } from "../generated/token-names.ts";
import {
  builtInThemes,
  type BuiltInTheme,
  type CustomProperty,
  type ThemeVars,
} from "./apply-theme.ts";

/**
 * The visitor's saved custom themes (theme-creator R2.2, R9.5, R9.6; design §3.4): a validated
 * `localStorage` store, readable as a stable snapshot for `useSyncExternalStore`. It never loads
 * token metadata: a theme carries its ready-made custom properties.
 */
export const CUSTOM_THEMES_KEY = "custom-themes";

/** Light and Dark always exist, plus up to this many custom themes (R2.2). */
export const MAX_CUSTOM_THEMES = 3;

/** Names are 1–30 characters after trimming (R2.6). */
export const MAX_NAME_LENGTH = 30;

const MAX_VARS = 600;
const MAX_VALUE_LENGTH = 200;

export interface StoredTheme extends ThemeVars {
  /** 8 base-36 characters. */
  id: string;
  name: string;
  /** What the editor reopens. Opaque here; the theme creator validates it (design §3.1). */
  source: unknown;
}

const knownProperties = new Set(tokenNames);
const idPattern = /^[a-z0-9]{8}$/;
const propertyPattern = /^--[a-z0-9-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A theme name as stored: trimmed, 1–30 characters. */
export function isThemeName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value === value.trim() &&
    value.length >= 1 &&
    value.length <= MAX_NAME_LENGTH
  );
}

function isScheme(value: unknown): value is BuiltInTheme {
  return builtInThemes.some((theme) => theme === value);
}

/**
 * Custom properties a theme may set: known token names only, and values that can't end a
 * declaration or open a block. `setProperty` sets one property's value, so that's all it can do.
 */
function isVars(value: unknown): value is Record<CustomProperty, string> {
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length <= MAX_VARS &&
    entries.every(
      ([name, css]) =>
        propertyPattern.test(name) &&
        knownProperties.has(name) &&
        typeof css === "string" &&
        css.length <= MAX_VALUE_LENGTH &&
        !/[;{}]/.test(css),
    )
  );
}

function isStoredTheme(value: unknown): value is StoredTheme {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    idPattern.test(value.id) &&
    isThemeName(value.name) &&
    isScheme(value.scheme) &&
    isVars(value.vars) &&
    isRecord(value.source)
  );
}

/** The stored list, or null when it's malformed in any way: then it counts as none (R9.5). */
function parse(raw: string | null): readonly StoredTheme[] | null {
  if (raw === null) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || data.v !== 1 || !Array.isArray(data.themes)) return null;
  const themes: unknown[] = data.themes;
  if (themes.length > MAX_CUSTOM_THEMES || !themes.every(isStoredTheme)) return null;
  const ids = new Set(themes.map((theme) => theme.id));
  const names = new Set(themes.map((theme) => theme.name.toLowerCase()));
  return ids.size === themes.length && names.size === themes.length ? themes : null;
}

const none: readonly StoredTheme[] = [];

/** Themes storage refused to hold, kept for this page (R9.6). */
let pageThemes: readonly StoredTheme[] | undefined;
let cached: { raw: string | null; themes: readonly StoredTheme[] } | undefined;
/** Whether storage takes writes: probed once, then updated by each write. */
let available: boolean | undefined;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/**
 * The saved themes, in creation order. The same array while storage holds the same text, so
 * React re-renders only on a real change. Never throws.
 */
export function readCustomThemes(): readonly StoredTheme[] {
  if (pageThemes !== undefined) return pageThemes;
  let raw: string | null;
  try {
    raw = localStorage.getItem(CUSTOM_THEMES_KEY);
  } catch {
    return none;
  }
  if (cached?.raw !== raw) cached = { raw, themes: parse(raw) ?? none };
  return cached.themes;
}

/** The saved theme with this id, if any. */
export function findCustomTheme(id: string): StoredTheme | undefined {
  return readCustomThemes().find((theme) => theme.id === id);
}

/** Whether storage keeps themes past this page (R9.6, R11.3). Probed once, then follows each write. */
export function storageAvailable(): boolean {
  if (available === undefined) {
    try {
      localStorage.setItem(`${CUSTOM_THEMES_KEY}-probe`, "");
      localStorage.removeItem(`${CUSTOM_THEMES_KEY}-probe`);
      available = true;
    } catch {
      available = false;
    }
  }
  return available;
}

function write(themes: readonly StoredTheme[]): void {
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify({ v: 1, themes }));
    pageThemes = undefined;
    available = true;
  } catch {
    pageThemes = themes;
    available = false;
  }
  notify();
}

/** A new random id: 8 base-36 characters. */
function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((byte) => (byte % 36).toString(36)).join("");
}

/**
 * Saves a theme: a new one when `id` is absent (at most 3, R2.2), otherwise an update of that
 * theme in place. The caller has validated it (the theme creator's `validateSave`); this guards
 * the stored shape. Returns what was stored.
 */
export function saveCustomTheme(theme: Omit<StoredTheme, "id"> & { id?: string }): StoredTheme {
  const themes = readCustomThemes();
  const existing = theme.id === undefined ? -1 : themes.findIndex(({ id }) => id === theme.id);
  if (existing === -1 && themes.length >= MAX_CUSTOM_THEMES) {
    throw new RangeError(`At most ${String(MAX_CUSTOM_THEMES)} custom themes can be saved.`);
  }
  const stored: StoredTheme = { ...theme, id: themes[existing]?.id ?? newId() };
  if (!isStoredTheme(stored)) throw new TypeError("Not a valid custom theme.");
  write(existing === -1 ? [...themes, stored] : themes.with(existing, stored));
  return stored;
}

/** Renames a saved theme. */
export function renameCustomTheme(id: string, name: string): void {
  const themes = readCustomThemes();
  const index = themes.findIndex((theme) => theme.id === id);
  const theme = themes[index];
  if (!theme) return;
  const renamed = { ...theme, name: name.trim() };
  if (!isStoredTheme(renamed)) throw new TypeError("Not a valid theme name.");
  write(themes.with(index, renamed));
}

/**
 * Deletes a saved theme. Use `deleteTheme` from preference.ts, which also moves the site off it
 * when it's selected (R2.9).
 */
export function deleteCustomTheme(id: string): void {
  const themes = readCustomThemes();
  if (themes.some((theme) => theme.id === id)) write(themes.filter((theme) => theme.id !== id));
}

/** Calls `listener` when this page writes the saved themes; other tabs' writes aren't included. */
export function subscribeCustomThemeWrites(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Calls `listener` when the saved themes change, on this page or in another tab (R9.4). */
export function subscribeCustomThemes(listener: () => void): () => void {
  // `key` is null when another tab clears storage.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== CUSTOM_THEMES_KEY) return;
    pageThemes = undefined;
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
