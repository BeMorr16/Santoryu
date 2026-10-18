import { describe, expect, it } from "vitest";
import * as library from "../../components/index.ts";
import { componentTokens } from "../../tokens/metadata.ts";
import { showcases } from "./registry.ts";

describe("/lab/components registry (R15.2)", () => {
  const documented = showcases.flatMap((showcase) => showcase.exports);

  it("documents every component the library exports", () => {
    const exported = Object.keys(library).sort();
    expect(exported.length).toBeGreaterThan(0);
    expect([...documented].sort()).toEqual(exported);
  });

  it("documents each export once", () => {
    expect(new Set(documented).size).toBe(documented.length);
  });

  it("gives every section a unique id and name", () => {
    expect(new Set(showcases.map((s) => s.id)).size).toBe(showcases.length);
    expect(new Set(showcases.map((s) => s.name)).size).toBe(showcases.length);
  });

  it("shows the component tokens of every component that has them, and only real ones", () => {
    const withTokens = [...new Set(componentTokens.map((token) => token.component))].sort();
    const shown = showcases.flatMap((s) => (s.tokens === null ? [] : [s.tokens])).sort();
    expect(shown).toEqual(withTokens);
  });

  it.each(showcases.map((s) => [s.name, s] as const))(
    "%s has a purpose, props, accessibility notes, and a token table or a note why not (R15.3)",
    (_name, showcase) => {
      expect(showcase.purpose).toMatch(/\S/);
      expect(showcase.props.length).toBeGreaterThan(0);
      for (const { docs } of showcase.props) expect(Object.keys(docs).length).toBeGreaterThan(0);
      expect(showcase.a11y.length).toBeGreaterThan(0);
      if (showcase.tokens === null) expect(showcase.tokensNote).toMatch(/\S/);
    },
  );
});
