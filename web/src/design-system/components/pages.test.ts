import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  componentGroups,
  componentPage,
  componentPages,
  componentPath,
  docsSequence,
} from "./pages.ts";

describe("componentPages (ds-components R6.1)", () => {
  it("gives every page a unique id and name", () => {
    expect(new Set(componentPages.map(({ id }) => id)).size).toBe(componentPages.length);
    expect(new Set(componentPages.map(({ name }) => name)).size).toBe(componentPages.length);
  });

  it("uses kebab-case ids, so each is a clean URL segment", () => {
    for (const { id } of componentPages) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it("lists the groups contiguously, in componentGroups order, with none empty (R2.2)", () => {
    const runs = componentPages
      .map(({ group }) => group)
      .filter((group, index, groups) => group !== groups[index - 1]);
    expect(runs).toEqual([...componentGroups]);
  });

  it("puts Forms right after Actions, holding TextField, Slider and ColorField (ds-tokens §11.6, theme-creator §12, §13)", () => {
    expect(componentGroups.slice(0, 2)).toEqual(["Actions", "Forms"]);
    expect(componentPages.filter(({ group }) => group === "Forms")).toEqual([
      { id: "text-field", name: "TextField", group: "Forms" },
      { id: "slider", name: "Slider", group: "Forms" },
      { id: "color-field", name: "ColorField", group: "Forms" },
    ]);
  });

  it("names each page after a folder in web/src/components/", () => {
    for (const { name } of componentPages) {
      expect(existsSync(new URL(`../../components/${name}/`, import.meta.url)), name).toBe(true);
    }
  });

  it("finds a page by id", () => {
    expect(componentPage("back-to-top").name).toBe("BackToTop");
  });
});

describe("docsSequence (R4.9)", () => {
  it("starts at the overview, then follows the side menu", () => {
    expect(docsSequence[0]).toEqual({ href: "/design-system/components", name: "Overview" });
    expect(docsSequence.slice(1)).toEqual(
      componentPages.map(({ id, name }) => ({ href: componentPath(id), name })),
    );
  });

  it("puts each page under /design-system/components/", () => {
    expect(componentPath("code-block")).toBe("/design-system/components/code-block");
  });
});
