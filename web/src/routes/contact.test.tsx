import { describe, expect, it } from "vitest";
import { contactContent } from "../content/contact.ts";
import { isRouteHandle } from "../shell/route-handle.ts";
import { siteUrl } from "../site.config.ts";
import { handle, links, meta } from "./contact.tsx";

const title = "Contact · Ben Morrison";
const canonical = `${siteUrl}/contact`;

describe("contact route (contact R1)", () => {
  it("is titled Contact · Ben Morrison, with the contact description (R1.3)", () => {
    expect(meta()).toEqual(
      expect.arrayContaining([
        { title },
        { name: "description", content: contactContent.description },
      ]),
    );
  });

  it("links the canonical URL to /contact (R1.3)", () => {
    expect(links()).toEqual([{ rel: "canonical", href: canonical }]);
  });

  it("gives link previews the same title, description and URL (R1.3)", () => {
    expect(meta()).toEqual(
      expect.arrayContaining([
        { property: "og:title", content: title },
        { property: "og:description", content: contactContent.description },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary_large_image" },
      ]),
    );
  });

  it("asks for the striking backdrop (R1.4)", () => {
    expect(isRouteHandle(handle)).toBe(true);
    expect(handle.backdrop).toBe("striking");
  });
});
