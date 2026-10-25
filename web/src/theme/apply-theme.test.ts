// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applyToRoot, themeAttributes, themeStyle, type ThemeVars } from "./apply-theme.ts";

const ocean: ThemeVars = {
  id: "ocean123",
  scheme: "dark",
  vars: { "--color-action-background": "#7a5618", "--color-text-default": "#ffffff" },
};
const forest: ThemeVars = {
  id: "forest12",
  scheme: "light",
  vars: { "--color-action-background": "#1e6b45" },
};

const property = (element: HTMLElement, name: string) => element.style.getPropertyValue(name);

describe("applyToRoot (theme-creator design §4.1)", () => {
  it("applies a custom theme's scheme, id and properties", () => {
    const root = document.createElement("div");

    applyToRoot(ocean, root);

    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(root.getAttribute("data-custom-theme")).toBe("ocean123");
    expect(property(root, "--color-action-background")).toBe("#7a5618");
    expect(property(root, "--color-text-default")).toBe("#ffffff");
  });

  it("removes the old theme's properties when switching custom → custom", () => {
    const root = document.createElement("div");
    applyToRoot(ocean, root);

    applyToRoot(forest, root);

    expect(root.getAttribute("data-theme")).toBe("light");
    expect(root.getAttribute("data-custom-theme")).toBe("forest12");
    expect(property(root, "--color-action-background")).toBe("#1e6b45");
    expect(property(root, "--color-text-default")).toBe("");
  });

  it("removes every custom property and the id when switching custom → light", () => {
    const root = document.createElement("div");
    applyToRoot(ocean, root);

    applyToRoot("light", root);

    expect(root.getAttribute("data-theme")).toBe("light");
    expect(root.hasAttribute("data-custom-theme")).toBe(false);
    expect(root.getAttribute("style") ?? "").toBe("");
  });

  it("removes everything for no choice, and leaves styles it didn't set", () => {
    const root = document.createElement("div");
    root.style.setProperty("--shell-header-block-size", "4rem");
    applyToRoot(ocean, root);

    applyToRoot(null, root);

    expect(root.hasAttribute("data-theme")).toBe(false);
    expect(root.hasAttribute("data-custom-theme")).toBe(false);
    expect(property(root, "--color-action-background")).toBe("");
    expect(property(root, "--shell-header-block-size")).toBe("4rem");
  });

  it("defaults to <html>", () => {
    applyToRoot(ocean);
    expect(document.documentElement.getAttribute("data-custom-theme")).toBe("ocean123");

    applyToRoot(null);
    expect(document.documentElement.hasAttribute("data-custom-theme")).toBe(false);
  });
});

describe("themeAttributes and themeStyle", () => {
  it("gives the scheme, plus the id for a custom theme", () => {
    expect(themeAttributes("dark")).toEqual({ "data-theme": "dark" });
    expect(themeAttributes(ocean)).toEqual({
      "data-theme": "dark",
      "data-custom-theme": "ocean123",
    });
  });

  it("turns a theme's properties into a React style", () => {
    expect(themeStyle(ocean.vars)).toEqual({
      "--color-action-background": "#7a5618",
      "--color-text-default": "#ffffff",
    });
  });
});
