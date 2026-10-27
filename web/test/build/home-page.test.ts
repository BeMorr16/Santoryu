import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { within } from "@testing-library/dom";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { homeContent, principles, workCards } from "../../src/content/home.ts";

const indexHtml = fileURLToPath(new URL("../../build/client/index.html", import.meta.url));

let document: Document;

beforeAll(() => {
  if (!existsSync(indexHtml)) throw new Error("No build output found. Run `pnpm run build` first.");
  // JSDOM runs no scripts by default, so this is Home as served, before hydration.
  document = new JSDOM(readFileSync(indexHtml, "utf8")).window.document;
});

describe("Home, prerendered (home R8.2)", () => {
  const main = () => within(document.querySelector("main") ?? document.body);

  it("has the hero's copy without JavaScript", () => {
    expect(main().getByRole("heading", { level: 1, name: homeContent.name })).toBeDefined();
    expect(main().getByText(homeContent.role)).toBeDefined();
    expect(main().getByText(homeContent.intro)).toBeDefined();
    for (const area of homeContent.focusAreas) expect(main().getByText(area)).toBeDefined();
    expect(main().getByRole("link", { name: homeContent.contactLabel })).toBeDefined();
  });

  it("has both sections, each named by its h2", () => {
    for (const heading of [homeContent.workHeading, homeContent.principlesHeading]) {
      expect(main().getByRole("region", { name: heading })).toBeDefined();
    }
  });

  it("has every work card, the Coming soon badge and every principle with its example", () => {
    for (const card of workCards) {
      expect(main().getByRole("heading", { level: 3, name: card.title })).toBeDefined();
      expect(main().getByText(card.description)).toBeDefined();
    }
    expect(main().getByText(homeContent.placeholderBadge)).toBeDefined();
    for (const principle of principles) {
      expect(main().getByRole("heading", { level: 3, name: principle.name })).toBeDefined();
      expect(main().getByText(principle.description)).toBeDefined();
      expect(main().getByText(principle.example)).toBeDefined();
    }
    expect(main().getAllByText(homeContent.exampleLabel)).toHaveLength(principles.length);
  });

  it("carries one JSON-LD block that parses, with WebSite and Person (R6.4)", () => {
    const blocks = document.querySelectorAll('script[type="application/ld+json"]');
    expect(blocks).toHaveLength(1);
    const data = JSON.parse(blocks[0]?.textContent ?? "") as { "@graph": { "@type": string }[] };
    expect(data["@graph"].map((node) => node["@type"])).toEqual(["WebSite", "Person"]);
  });
});
