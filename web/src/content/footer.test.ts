import { version as reactVersion } from "react";
import { describe, expect, it } from "vitest";
import { contactContent } from "./contact.ts";
import { footerContent } from "./footer.ts";
import { homeContent } from "./home.ts";

describe("footer content (site-footer)", () => {
  it("names React's installed major version in the built-with note (R4.3)", () => {
    const major = reactVersion.split(".")[0];
    expect(major).toMatch(/^\d+$/);
    expect(footerContent.builtWith).toBe(`Built with React ${String(major)} and Vite`);
  });

  it("takes the role from Home and the location from Contact (R2.3)", () => {
    expect(footerContent.role).toBe(homeContent.role);
    expect(footerContent.location).toBe(contactContent.location);
  });

  it("starts the home link's name with its visible text (R6.2)", () => {
    expect(footerContent.homeLabel.startsWith(footerContent.name)).toBe(true);
  });
});
