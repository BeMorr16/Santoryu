import { describe, expect, it } from "vitest";
import { experienceContent } from "../content/experience.ts";
import { isRouteHandle } from "../shell/route-handle.ts";
import { siteUrl } from "../site.config.ts";
import { handle, links, meta } from "./experience.tsx";

const title = "Experience · Ben Morrison";
const canonical = `${siteUrl}/experience`;

describe("experience route (resume R1)", () => {
  it("is titled Experience · Ben Morrison, with the experience description (R1.3)", () => {
    expect(meta()).toEqual(
      expect.arrayContaining([
        { title },
        { name: "description", content: experienceContent.description },
      ]),
    );
  });

  it("links the canonical URL to /experience (R1.3)", () => {
    expect(links()).toEqual([{ rel: "canonical", href: canonical }]);
  });

  it("gives link previews the same title, description and URL (R1.3)", () => {
    expect(meta()).toEqual(
      expect.arrayContaining([
        { property: "og:title", content: title },
        { property: "og:description", content: experienceContent.description },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary_large_image" },
      ]),
    );
  });

  it("asks for the quiet backdrop, and keeps Back to top (R1.4)", () => {
    expect(isRouteHandle(handle)).toBe(true);
    expect(handle.backdrop).toBe("quiet");
    expect("backToTop" in handle).toBe(false);
  });
});
