import { describe, expect, it } from "vitest";
import { allTokens } from "../../tokens/metadata.ts";
import { primitiveTokens } from "../../tokens/primitives.ts";
import type { ComponentTokenMeta, TokenMeta } from "../../tokens/types.ts";
import { flowChain, workedExample } from "./flow.ts";

describe("flowChain", () => {
  it("resolves the worked example from component token to page (R2.3, R2.7)", () => {
    const chain = flowChain(workedExample);

    expect(chain.component.name).toBe(workedExample);
    expect(chain.semantic.name).toBe(chain.component.aliases);
    expect(chain.page.id).toBe(chain.component.component);
  });

  it("branches a themed semantic to its Light then Dark primitives (R2.4)", () => {
    const chain = flowChain(workedExample);
    if (!chain.semantic.themed) throw new Error("the worked example's semantic token is themed");

    expect(chain.primitives.map(({ label, token }) => [label, token.tier, token.name])).toEqual([
      ["Light", "primitive", chain.semantic.values.light.ref],
      ["Dark", "primitive", chain.semantic.values.dark.ref],
    ]);
  });

  it("gives an unthemed semantic one unlabelled primitive", () => {
    const component = allTokens.find(
      (token): token is ComponentTokenMeta =>
        token.tier === "component" &&
        allTokens.some(
          (target) => target.name === token.aliases && target.tier === "semantic" && !target.themed,
        ),
    );
    if (!component) throw new Error("expected a component token aliasing an unthemed semantic");

    const chain = flowChain(component.name);

    expect(chain.primitives).toHaveLength(1);
    expect(chain.primitives[0]?.label).toBeUndefined();
  });

  describe("throws when the chain can't be resolved (R2.7)", () => {
    const data = (tokens: readonly TokenMeta[], primitives = primitiveTokens) => ({
      tokens,
      primitives,
    });
    const example = allTokens.find((token) => token.name === workedExample) as ComponentTokenMeta;

    it("for a name that isn't a component token", () => {
      expect(() => flowChain("component.nope")).toThrow(/component\.nope is not a component token/);
      expect(() => flowChain("color.text.muted")).toThrow(/not a component token/);
    });

    it("for an alias that isn't a semantic token", () => {
      const tokens = allTokens.filter((token) => token.name !== example.aliases);

      expect(() => flowChain(workedExample, data(tokens))).toThrow(/not a semantic token/);
    });

    it("for a ref that isn't a primitive", () => {
      expect(() => flowChain(workedExample, data(allTokens, []))).toThrow(/not a primitive/);
    });

    it("for a component without a page", () => {
      const orphan = { ...example, name: "component.orphan.x", component: "orphan" };

      expect(() => flowChain(orphan.name, data([...allTokens, orphan]))).toThrow(/has no page/);
    });
  });
});
