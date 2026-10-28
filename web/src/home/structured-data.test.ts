import { describe, expect, it } from "vitest";
import { homeContent } from "../content/home.ts";
import { githubUrl, linkedinUrl, siteUrl } from "../site.config.ts";
import { homeStructuredData } from "./structured-data.ts";

describe("homeStructuredData (home R6.4; contact R4.2)", () => {
  it("describes the site and its owner in one schema.org @graph", () => {
    expect(homeStructuredData["@context"]).toBe("https://schema.org");
    expect(homeStructuredData["@graph"]).toEqual([
      expect.objectContaining({ "@type": "WebSite", name: "Ben Morrison", url: `${siteUrl}/` }),
      expect.objectContaining({
        "@type": "Person",
        name: "Ben Morrison",
        jobTitle: homeContent.role,
        url: `${siteUrl}/`,
        sameAs: [linkedinUrl, githubUrl],
      }),
    ]);
  });
});
