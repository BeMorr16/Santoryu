import { componentTokens } from "../../../tokens/metadata.ts";
import { componentPages, type ComponentPage } from "../../components/pages.ts";
import { componentByName, semanticByName } from "./builtin.ts";
import { keyLabels, keyTokens } from "./families.ts";
import { keyIds, type KeyId, type ResolvedTheme, type ResolvedValue } from "./types.ts";

/**
 * What the chain panel shows (theme-creator R8.2; design §8.6): a value's way from its source
 * through a semantic token to the component tokens aliasing it and their components.
 */

/** What the panel traces: a token path, or a key control as `key:<id>`. */
export type TraceId = string;

export interface SemanticChain {
  kind: "semantic";
  /** A primitive's name while the value is still one; otherwise the value is custom. */
  primitive: string | undefined;
  semantic: string;
  value: ResolvedValue;
  /** Component tokens aliasing it, in metadata order: only the traced one for a component token. */
  components: readonly { token: string; page: ComponentPage | undefined }[];
  /** The number of component tokens aliasing it, before any filtering. */
  aliasCount: number;
}

export interface KeyChain {
  kind: "key";
  key: KeyId;
  label: string;
  /** The semantic tokens the key sets (R8.2). */
  tokens: readonly string[];
}

export type Chain = SemanticChain | KeyChain;

const pageOf = (component: string) => componentPages.find(({ id }) => id === component);

/** The chain for a traced id, or undefined for an id that isn't a token or a key. */
export function traceChain(id: TraceId, theme: ResolvedTheme): Chain | undefined {
  const key = keyIds.find((candidate) => `key:${candidate}` === id);
  if (key) return { kind: "key", key, label: keyLabels[key], tokens: keyTokens[key] };

  const traced = componentByName.get(id);
  const semantic = traced ? (theme.component[id] ?? traced.aliases) : id;
  const value = theme.semantic[semantic];
  if (!semanticByName.has(semantic) || value === undefined) return undefined;
  const aliasing = componentTokens.filter(
    ({ name, aliases }) => (theme.component[name] ?? aliases) === semantic,
  );
  return {
    kind: "semantic",
    primitive: value.ref,
    semantic,
    value,
    components: aliasing
      .filter(({ name }) => traced === undefined || name === id)
      .map(({ name, component }) => ({ token: name, page: pageOf(component) })),
    aliasCount: aliasing.length,
  };
}
