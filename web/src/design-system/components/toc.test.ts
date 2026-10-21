import { describe, expect, it } from "vitest";
import { showcases } from "./registry.ts";
import { slug } from "./slug.ts";
import { sourceUrl } from "./source-url.ts";
import { tocItems } from "./toc.ts";

describe("tocItems (ds-components R4.2)", () => {
  it("lists the four h2s, with the examples' titles under Examples", () => {
    const showcase = showcases.button;

    expect(tocItems(showcase)).toEqual([
      {
        id: "examples",
        label: "Examples",
        children: showcase.examples.map(({ title }) => ({ id: slug(title), label: title })),
      },
      { id: "props", label: "Props" },
      { id: "component-tokens", label: "Component tokens" },
      { id: "accessibility", label: "Accessibility" },
    ]);
  });
});

describe("sourceUrl (ds-components R4.1)", () => {
  it("links the component's folder on GitHub", () => {
    expect(sourceUrl("BackToTop")).toBe(
      "https://github.com/BeMorr16/Santoryu/tree/main/web/src/components/BackToTop",
    );
  });
});
