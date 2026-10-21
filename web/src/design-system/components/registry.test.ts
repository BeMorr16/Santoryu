import { describe, expect, it } from "vitest";
import * as library from "../../components/index.ts";
import { componentTokens } from "../../tokens/metadata.ts";
import { componentPages } from "./pages.ts";
import { showcases as showcaseById } from "./registry.ts";
import { slug } from "./slug.ts";

/** Every showcase in side-menu order, with its page's name. */
const showcases = componentPages.map(({ id, name }) => ({ ...showcaseById[id], name }));

/** The fixed h2 ids on every component page (ds-components R4.1, R4.3). */
const sectionIds = ["examples", "props", "component-tokens", "accessibility"];

describe("/design-system/components registry (R15.2, ds-components R6.1)", () => {
  const documented = showcases.flatMap((showcase) => showcase.exports);

  it("documents every component the library exports", () => {
    const exported = Object.keys(library).sort();
    expect(exported.length).toBeGreaterThan(0);
    expect([...documented].sort()).toEqual(exported);
  });

  it("documents each export once", () => {
    expect(new Set(documented).size).toBe(documented.length);
  });

  it("has exactly one showcase per component page, under that page's id", () => {
    expect(Object.keys(showcaseById).sort()).toEqual(componentPages.map(({ id }) => id).sort());
    for (const { id } of componentPages) expect(showcaseById[id].id).toBe(id);
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

  it.each(showcases.map((s) => [s.name, s] as const))(
    "%s has examples with unique titles, whose ids are unique and clear of the section ids (R4.3)",
    (_name, showcase) => {
      const titles = showcase.examples.map(({ title }) => title);
      expect(titles.length).toBeGreaterThan(0);
      expect(new Set(titles).size).toBe(titles.length);
      const ids = titles.map(slug);
      for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.filter((id) => sectionIds.includes(id))).toEqual([]);
    },
  );

  it.each(showcases.map((s) => [s.name, s] as const))(
    "%s's example contents are named components (design §1.1)",
    (_name, showcase) => {
      for (const { Content } of showcase.examples) expect(Content.name).toMatch(/^[A-Z]\w+$/);
    },
  );

  it.each(showcases.map((s) => [s.name, s] as const))(
    "%s's main example imports only React, the library by its alias, and images (R4.5)",
    (_name, showcase) => {
      const { source } = showcase.main;
      const statements = source.match(/^import\b[\s\S]*?;$/gm) ?? [];
      const specifiers = statements.map((statement) => /\sfrom\s+"([^"]+)";$/.exec(statement)?.[1]);
      expect(statements.length).toBeGreaterThan(0);
      // A side-effect import (import "x";) has no from, so it fails here too.
      for (const specifier of specifiers) {
        expect(specifier).toMatch(
          /^(react|@\/components\/[A-Za-z]+|\.{1,2}\/[\w./-]+\.(jpe?g|png|webp|avif|svg))$/,
        );
      }
    },
  );

  it.each(showcases.map((s) => [s.name, s] as const))(
    "%s's main example is a named export function named after its file (R4.4)",
    (_name, showcase) => {
      const { Example, source, file } = showcase.main;
      const name = file.replace(/\.tsx$/, "");
      expect(file).toBe(`${name}.tsx`);
      expect(source).toContain(`export function ${name}() {`);
      expect(Example.name).toBe(name);
      expect(source.endsWith("\n")).toBe(true);
    },
  );
});
