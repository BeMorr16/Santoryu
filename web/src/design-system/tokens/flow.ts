import { allTokens } from "../../tokens/metadata.ts";
import { primitiveTokens } from "../../tokens/primitives.ts";
import type {
  ComponentTokenMeta,
  PrimitiveTokenMeta,
  SemanticTokenMeta,
  TokenMeta,
} from "../../tokens/types.ts";
import { componentPages, type ComponentPage } from "../components/pages.ts";

/** The diagram's worked example (R2.3). */
export const workedExample = "component.button.primary.background";

export interface FlowChain {
  component: ComponentTokenMeta;
  semantic: SemanticTokenMeta;
  /** One entry when unthemed; Light then Dark when themed (R2.4). */
  primitives: readonly { label?: "Light" | "Dark"; token: PrimitiveTokenMeta }[];
  /** The library page of the component using it. */
  page: ComponentPage;
}

/** A component token's chain down to its primitives and up to its page. Throws if any link is missing (R2.7). */
export function flowChain(
  name: string,
  data: { tokens: readonly TokenMeta[]; primitives: readonly PrimitiveTokenMeta[] } = {
    tokens: allTokens,
    primitives: primitiveTokens,
  },
): FlowChain {
  const component = data.tokens.find((token) => token.name === name);
  if (component?.tier !== "component") throw new Error(`${name} is not a component token`);
  const semantic = data.tokens.find((token) => token.name === component.aliases);
  if (semantic?.tier !== "semantic") {
    throw new Error(`${name} aliases ${component.aliases}, which is not a semantic token`);
  }
  const primitive = (ref: string) => {
    const token = data.primitives.find((candidate) => candidate.name === ref);
    if (!token) throw new Error(`${semantic.name} refers to ${ref}, which is not a primitive`);
    return token;
  };
  const page = componentPages.find(({ id }) => id === component.component);
  if (!page) throw new Error(`${name} belongs to ${component.component}, which has no page`);
  return {
    component,
    semantic,
    primitives: semantic.themed
      ? [
          { label: "Light", token: primitive(semantic.values.light.ref) },
          { label: "Dark", token: primitive(semantic.values.dark.ref) },
        ]
      : [{ token: primitive(semantic.values.all.ref) }],
    page,
  };
}
