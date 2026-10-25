import { parseHex } from "../../../components/ColorField/ColorField.tsx";
import { builtInThemes } from "../../../theme/apply-theme.ts";
import { componentByName } from "./builtin.ts";
import { componentOptions, inRange, inputProblem, keyRanges } from "./controls.ts";
import { defaultKeys } from "./derive.ts";
import {
  fontIds,
  keyIds,
  type KeyId,
  type KeyValues,
  type ThemeSource,
  type TokenValueInput,
} from "./types.ts";

/** The theme being edited, its reducer, and its storage (theme-creator R11; design §8.2, §10). */

export interface DraftStart {
  /** What it started from: "Light", a preset's name, or a saved theme's name. */
  label: string;
  name: string;
  /** The saved theme being edited, if any. */
  editing: string | null;
  source: ThemeSource;
}

export interface Draft {
  name: string;
  editing: string | null;
  /** For Reset and Discard. */
  start: DraftStart;
  source: ThemeSource;
}

type SetKey = { [K in KeyId]: { type: "setKey"; key: K; value: KeyValues[K] } }[KeyId];

export type DraftAction =
  | { type: "start"; start: DraftStart }
  | SetKey
  | { type: "resetKey"; key: KeyId }
  | { type: "setSemantic"; token: string; value: TokenValueInput }
  | { type: "resetSemantic"; token: string }
  | { type: "setComponent"; token: string; target: string }
  | { type: "resetComponent"; token: string }
  | { type: "rename"; name: string }
  /** A valid imported file: unsaved, on top of the current starting point. */
  | { type: "import"; name: string; source: ThemeSource }
  | { type: "discard" }
  /** Stored: this is now the saved theme being edited. */
  | { type: "saved"; id: string; name: string };

export const emptySource = (base: ThemeSource["base"]): ThemeSource => ({
  base,
  keys: {},
  overrides: { semantic: {}, component: {} },
});

/** A draft at its starting point. */
export const draftFrom = (start: DraftStart): Draft => ({
  name: start.name,
  editing: start.editing,
  start,
  source: start.source,
});

/** Keys as a source stores them: only those that differ from the base's (design §3.1). */
function withKeys(source: ThemeSource, keys: Partial<KeyValues>): ThemeSource {
  const defaults = defaultKeys(source.base);
  const stored: Partial<KeyValues> = {};
  for (const key of keyIds) {
    const value = keys[key];
    if (value !== undefined && value !== defaults[key]) Object.assign(stored, { [key]: value });
  }
  return { ...source, keys: stored };
}

function without<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));
}

/**
 * The key values Reset returns to (R5.8): the starting point's, while the draft keeps its base.
 * An import onto another base starts from that base's own values instead.
 */
export function startKeys(draft: Draft): KeyValues {
  const { base } = draft.source;
  const start = draft.start.source;
  return start.base === base ? { ...defaultKeys(base), ...start.keys } : defaultKeys(base);
}

/** What base values are labelled as coming from: the starting point, or the base itself. */
export function startLabel(draft: Draft): string {
  if (draft.start.source.base === draft.source.base) return draft.start.label;
  return draft.source.base === "dark" ? "Dark" : "Light";
}

export function draftReducer(draft: Draft, action: DraftAction): Draft {
  const { source } = draft;
  const overrides = (next: Partial<ThemeSource["overrides"]>): Draft => ({
    ...draft,
    source: { ...source, overrides: { ...source.overrides, ...next } },
  });
  switch (action.type) {
    case "start":
      return draftFrom(action.start);
    case "setKey":
      return { ...draft, source: withKeys(source, { ...source.keys, [action.key]: action.value }) };
    case "resetKey":
      return {
        ...draft,
        source: withKeys(source, {
          ...source.keys,
          [action.key]: startKeys(draft)[action.key],
        }),
      };
    case "setSemantic":
      return overrides({
        semantic: { ...source.overrides.semantic, [action.token]: action.value },
      });
    case "resetSemantic":
      return overrides({ semantic: without(source.overrides.semantic, action.token) });
    case "setComponent":
      // Back to its own alias is no override at all.
      return overrides({
        component:
          componentByName.get(action.token)?.aliases === action.target
            ? without(source.overrides.component, action.token)
            : { ...source.overrides.component, [action.token]: action.target },
      });
    case "resetComponent":
      return overrides({ component: without(source.overrides.component, action.token) });
    case "rename":
      return { ...draft, name: action.name };
    case "import":
      return { ...draft, name: action.name, editing: null, source: action.source };
    case "discard":
      return draftFrom(draft.start);
    case "saved": {
      const start = { label: action.name, name: action.name, editing: action.id, source };
      return { name: action.name, editing: action.id, start, source };
    }
  }
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Whether the draft differs from where it started: what "Unsaved changes" says (R11.1). */
export function isDirty(draft: Draft): boolean {
  return (
    draft.name !== draft.start.name ||
    draft.editing !== draft.start.editing ||
    !sameJson(draft.source, draft.start.source)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A key's value, or undefined when it isn't one (design §3.4: anything invalid counts as absent). */
function readKey(key: KeyId, value: unknown): KeyValues[KeyId] | undefined {
  switch (key) {
    case "action":
    case "accent":
    case "accent2":
    case "background":
      return typeof value === "string" && parseHex(value) === value ? value : undefined;
    case "headingFont":
    case "bodyFont":
      return fontIds.find((font) => font === value);
    default:
      return typeof value === "number" && inRange(value, keyRanges[key]) ? value : undefined;
  }
}

/** A stored override as a typed input, or null when it isn't one or its control refuses it. */
function readInput(token: string, value: unknown): TokenValueInput | null {
  if (!isRecord(value)) return null;
  const hex = typeof value.hex === "string" ? parseHex(value.hex) : null;
  const font = fontIds.find((id) => id === value.font);
  const unit = (["rem", "px", "ch"] as const).find((candidate) => candidate === value.unit);
  const number = typeof value.value === "number" ? value.value : undefined;
  const input: TokenValueInput | null =
    value.kind === "color" && hex !== null && hex === value.hex
      ? { kind: "color", hex, ...(typeof value.ref === "string" && { ref: value.ref }) }
      : value.kind === "dimension" && number !== undefined && unit
        ? { kind: "dimension", value: number, unit }
        : value.kind === "font" && font
          ? { kind: "font", font }
          : value.kind === "number" && number !== undefined
            ? { kind: "number", value: number }
            : null;
  return input && inputProblem(token, input) === undefined ? input : null;
}

/**
 * A stored source, checked against the editor's own rules (keys, controls, re-point options), or
 * null. Used for drafts and for reopening saved themes: storage is untrusted (R9.5).
 */
export function readSource(value: unknown): ThemeSource | null {
  if (!isRecord(value) || !isRecord(value.keys) || !isRecord(value.overrides)) return null;
  const base = builtInThemes.find((theme) => theme === value.base);
  const { semantic, component } = value.overrides;
  if (!base || !isRecord(semantic) || !isRecord(component)) return null;
  const keys: Partial<KeyValues> = {};
  for (const [key, stored] of Object.entries(value.keys)) {
    const id = keyIds.find((candidate) => candidate === key);
    const read = id && readKey(id, stored);
    if (id === undefined || read === undefined) return null;
    Object.assign(keys, { [id]: read });
  }
  const inputs: Record<string, TokenValueInput> = {};
  for (const [token, stored] of Object.entries(semantic)) {
    const input = readInput(token, stored);
    if (!input) return null;
    inputs[token] = input;
  }
  const targets: Record<string, string> = {};
  for (const [token, target] of Object.entries(component)) {
    if (typeof target !== "string" || !componentOptions(token).includes(target)) return null;
    targets[token] = target;
  }
  return { base, keys, overrides: { semantic: inputs, component: targets } };
}

export const DRAFT_KEY = "theme-creator-draft";

const isName = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 100;
const isEditing = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

function readStart(value: unknown): DraftStart | null {
  if (!isRecord(value) || typeof value.label !== "string" || !isName(value.name)) return null;
  const source = readSource(value.source);
  return source && isEditing(value.editing)
    ? { label: value.label, name: value.name, editing: value.editing, source }
    : null;
}

/** The stored draft, or null when there's none, it's malformed, or it's of a newer version. */
export function readDraft(): Draft | null {
  let data: unknown;
  try {
    data = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
  } catch {
    return null;
  }
  if (!isRecord(data) || data.v !== 1 || !isRecord(data.draft)) return null;
  const { name, editing } = data.draft;
  const start = readStart(data.draft.start);
  const source = readSource(data.draft.source);
  return start && source && isName(name) && isEditing(editing)
    ? { name, editing, start, source }
    : null;
}

/**
 * Stores the draft, or removes it when it's unchanged (design §10). False when storage refused,
 * so edits won't survive a reload (R11.3).
 */
export function storeDraft(draft: Draft): boolean {
  try {
    if (isDirty(draft)) localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 1, draft }));
    else localStorage.removeItem(DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}
