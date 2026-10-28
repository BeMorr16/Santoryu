import { describe, expect, it } from "vitest";
import { siteUrl } from "../site.config.ts";
import { documentMeta, pageMeta, previewImage } from "./page-meta.ts";

const title = "Sample · Ben Morrison";
const description = "A sample page.";

describe("documentMeta (home R7.1, R7.2)", () => {
  const page = documentMeta("/sample", title, description);

  it("emits the title, description and every link-preview tag", () => {
    expect(page.meta()).toEqual([
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Ben Morrison" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${siteUrl}/sample` },
      { property: "og:image", content: `${siteUrl}/og-image.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: previewImage.alt },
      { name: "twitter:card", content: "summary_large_image" },
    ]);
  });

  it("links the canonical URL", () => {
    expect(page.links()).toEqual([{ rel: "canonical", href: `${siteUrl}/sample` }]);
  });

  it("keeps og:title, og:description and og:url equal to the title, description and canonical", () => {
    const tags = page.meta();
    const content = (property: string) => {
      const tag = tags.find(
        (candidate) => "property" in candidate && candidate.property === property,
      );
      return tag && "content" in tag ? tag.content : undefined;
    };

    expect(content("og:title")).toBe(title);
    expect(content("og:description")).toBe(description);
    expect(page.links()).toEqual([{ rel: "canonical", href: content("og:url") }]);
  });
});

describe("pageMeta", () => {
  it("appends the site name to the title", () => {
    expect(pageMeta("/sample", "Sample", description).meta()).toEqual(
      documentMeta("/sample", "Sample · Ben Morrison", description).meta(),
    );
  });
});

describe("previewImage", () => {
  it("builds its alt text from the name, role and host (home Copy table)", () => {
    expect(previewImage.alt).toBe("Ben Morrison, Full Stack Software Engineer, ben-morrison.com");
  });
});
