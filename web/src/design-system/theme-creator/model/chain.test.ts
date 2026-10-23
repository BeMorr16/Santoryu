import { describe, expect, it } from "vitest";
import { traceChain, type SemanticChain } from "./chain.ts";
import { keyTokens } from "./families.ts";
import { resolveTheme } from "./resolve.ts";
import type { ThemeSource } from "./types.ts";

const source = (overrides: Partial<ThemeSource["overrides"]> = {}): ThemeSource => ({
  base: "light",
  keys: {},
  overrides: { semantic: {}, component: {}, ...overrides },
});

function semanticChain(id: string, from = source()): SemanticChain {
  const chain = traceChain(id, resolveTheme(from));
  if (chain?.kind !== "semantic") throw new Error(`no semantic chain for ${id}`);
  return chain;
}

describe("traceChain (theme-creator R8.2, design §8.6)", () => {
  it("traces a semantic token from its primitive to every component token aliasing it", () => {
    const chain = semanticChain("color.action.background");

    expect(chain).toMatchObject({
      primitive: "color.gold.600",
      semantic: "color.action.background",
      value: { css: "#b37500" },
    });
    expect(chain.components.map(({ token }) => token)).toContain(
      "component.button.primary.background",
    );
    expect(chain.aliasCount).toBe(chain.components.length);
    expect(
      chain.components.find(({ token }) => token.startsWith("component.button."))?.page,
    ).toEqual({
      id: "button",
      name: "Button",
      group: "Actions",
    });
  });

  it("shows a custom value, with no primitive, after an edit", () => {
    const chain = semanticChain(
      "color.action.background",
      source({ semantic: { "color.action.background": { kind: "color", hex: "#123456" } } }),
    );

    expect(chain.primitive).toBeUndefined();
    expect(chain.value.css).toBe("#123456");
  });

  it("keeps a picked swatch's primitive", () => {
    const chain = semanticChain(
      "color.action.background",
      source({
        semantic: {
          "color.action.background": { kind: "color", hex: "#5b3fa6", ref: "color.violet.600" },
        },
      }),
    );

    expect(chain.primitive).toBe("color.violet.600");
  });

  it("traces a component token through its semantic, ending at that one component", () => {
    const chain = semanticChain("component.button.primary.background");

    expect(chain.semantic).toBe("color.action.background");
    expect(chain.components).toHaveLength(1);
    expect(chain.components[0]).toMatchObject({
      token: "component.button.primary.background",
      page: { id: "button" },
    });
    expect(chain.aliasCount).toBeGreaterThan(1);
  });

  it("follows a re-point", () => {
    const from = source({
      component: { "component.button.primary.background": "color.accent.border" },
    });

    expect(semanticChain("component.button.primary.background", from).semantic).toBe(
      "color.accent.border",
    );
    expect(
      semanticChain("color.accent.border", from).components.map(({ token }) => token),
    ).toContain("component.button.primary.background");
    expect(
      semanticChain("color.action.background", from).components.map(({ token }) => token),
    ).not.toContain("component.button.primary.background");
  });

  it("lists the semantic tokens a key sets", () => {
    expect(traceChain("key:action", resolveTheme(source()))).toEqual({
      kind: "key",
      key: "action",
      label: "Action",
      tokens: keyTokens.action,
    });
    expect(keyTokens.action).toContain("color.link.hover");
  });

  it("has no chain for an unknown id", () => {
    expect(traceChain("color.nope", resolveTheme(source()))).toBeUndefined();
    expect(traceChain("key:nope", resolveTheme(source()))).toBeUndefined();
  });
});
