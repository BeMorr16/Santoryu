import { describe, expect, it } from "vitest";
import { repoUrl, siteUrl } from "./site.config.ts";

describe("siteUrl", () => {
  it("is an https origin with no trailing slash", () => {
    expect(siteUrl).toMatch(/^https:\/\//);
    expect(siteUrl.endsWith("/")).toBe(false);
    expect(new URL(siteUrl).origin).toBe(siteUrl);
  });

  it("is the production domain", () => {
    expect(siteUrl).toBe("https://ben-morrison.com");
  });
});

describe("repoUrl", () => {
  it("is the site's GitHub repository, with no trailing slash (ds-components R3.5)", () => {
    expect(repoUrl).toBe("https://github.com/BeMorr16/Santoryu");
  });
});
