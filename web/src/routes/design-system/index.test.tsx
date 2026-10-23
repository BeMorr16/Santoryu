import { describe, expect, it } from "vitest";
import { siteUrl } from "../../site.config.ts";
import { links, meta } from "./index.tsx";

describe("design system route (ds-hub R1.4)", () => {
  it("is titled Design System · Ben, with a description of its three parts", () => {
    expect(meta()).toEqual([
      { title: "Design System · Ben" },
      {
        name: "description",
        content: expect.stringMatching(/tokens.+component library.+theme creator/) as string,
      },
    ]);
  });

  it("links the canonical URL to /design-system", () => {
    expect(links()).toEqual([{ rel: "canonical", href: `${siteUrl}/design-system` }]);
  });
});
