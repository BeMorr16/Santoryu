import { describe, expect, it } from "vitest";
import { siteUrl } from "./site.config.ts";

describe("siteUrl", () => {
  it("is an https origin with no trailing slash", () => {
    expect(siteUrl).toMatch(/^https:\/\//);
    expect(siteUrl.endsWith("/")).toBe(false);
    expect(new URL(siteUrl).origin).toBe(siteUrl);
  });
});
