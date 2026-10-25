import type { PairingResult } from "../../../tokens/contrast.ts";
import {
  MAX_CUSTOM_THEMES,
  MAX_NAME_LENGTH,
  type StoredTheme,
} from "../../../theme/custom-themes.ts";
import { failingPairings } from "./contrast.ts";
import type { ResolvedTheme } from "./types.ts";
import { themeVars } from "./vars.ts";

/** Save's checks, in order (theme-creator R3.1; design §8.7). */

export type SaveCheck =
  | { kind: "name"; message: string }
  | { kind: "limit" }
  | { kind: "duplicate"; of: string }
  | { kind: "contrast"; failures: PairingResult[] }
  | { kind: "ok" };

/** Why a name can't be used, or undefined when it can (R2.6). */
export function nameProblem(
  name: string,
  saved: readonly Pick<StoredTheme, "id" | "name">[],
  editing: string | null,
): string | undefined {
  const trimmed = name.trim();
  if (trimmed === "") return "Enter a name for the theme.";
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `Use ${String(MAX_NAME_LENGTH)} characters or fewer.`;
  }
  const lower = trimmed.toLowerCase();
  if (lower === "light" || lower === "dark")
    return `${trimmed} is a built-in theme. Choose another name.`;
  const taken = saved.find(
    ({ id, name: other }) => id !== editing && other.toLowerCase() === lower,
  );
  return taken ? `You already have a theme named ${taken.name}.` : undefined;
}

function sameVars(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>) {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

/**
 * The first reason a draft can't be saved as is: its name, the 3-theme limit, a duplicate of
 * Light, Dark or another saved theme (its resolved output, R3.2), then failing contrast (R3.3).
 * Re-saving the theme being edited is never a duplicate of itself.
 */
export function validateSave({
  name,
  editing,
  resolved,
  saved,
}: {
  name: string;
  /** The id of the saved theme being edited, if any. */
  editing: string | null;
  resolved: ResolvedTheme;
  saved: readonly StoredTheme[];
}): SaveCheck {
  const message = nameProblem(name, saved, editing);
  if (message !== undefined) return { kind: "name", message };
  const isUpdate = saved.some(({ id }) => id === editing);
  if (!isUpdate && saved.length >= MAX_CUSTOM_THEMES) return { kind: "limit" };
  const vars = themeVars(resolved, "diff");
  const others = [
    { name: "Light", scheme: "light", vars: {} },
    { name: "Dark", scheme: "dark", vars: {} },
    ...saved.filter(({ id }) => id !== editing),
  ];
  const duplicate = others.find(
    (other) => other.scheme === resolved.scheme && sameVars(other.vars, vars),
  );
  if (duplicate) return { kind: "duplicate", of: duplicate.name };
  const failures = failingPairings(resolved);
  if (failures.length > 0) return { kind: "contrast", failures };
  return { kind: "ok" };
}
