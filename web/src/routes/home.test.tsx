import { describe, expect, it } from "vitest";
import { homeContent, homeTitle } from "../content/home.ts";
import { homeStructuredData } from "../home/structured-data.ts";
import { isRouteHandle } from "../shell/route-handle.ts";
import { siteUrl } from "../site.config.ts";
import { handle, links, meta } from "./home.tsx";

describe("home route", () => {
  it("sets the title, description and every link-preview tag (R6.2, R6.3, R7.1)", () => {
    const tags = meta();
    expect(tags).toContainEqual({ title: homeTitle });
    expect(tags).toContainEqual({ name: "description", content: homeContent.description });
    for (const property of [
      "og:type",
      "og:site_name",
      "og:title",
      "og:description",
      "og:url",
      "og:image",
      "og:image:width",
      "og:image:height",
      "og:image:alt",
    ]) {
      expect(tags, property).toContainEqual(expect.objectContaining({ property }));
    }
    expect(tags).toContainEqual({ property: "og:title", content: homeTitle });
    expect(tags).toContainEqual({ property: "og:url", content: `${siteUrl}/` });
    expect(tags).toContainEqual({ name: "twitter:card", content: "summary_large_image" });
  });

  it("adds the structured data as one JSON-LD entry (R6.4)", () => {
    expect(meta().filter((tag) => "script:ld+json" in tag)).toEqual([
      { "script:ld+json": homeStructuredData },
    ]);
  });

  it("links the canonical URL to the site root (R1.5)", () => {
    expect(links()).toEqual([{ rel: "canonical", href: `${siteUrl}/` }]);
  });

  it("asks for the striking backdrop (site-backdrop R1.3)", () => {
    expect(isRouteHandle(handle)).toBe(true);
    expect(handle.backdrop).toBe("striking");
  });
});
