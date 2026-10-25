import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { designSystemPath, themeCreatorPath } from "../../src/design-system/components/pages.ts";
import { hubCards } from "../../src/design-system/hub/cards.ts";
import { fingerprint, scriptsOf } from "./page-scripts.ts";

const clientDir = fileURLToPath(new URL("../../build/client/", import.meta.url));
const tokensDir = fileURLToPath(new URL("../../tokens/", import.meta.url));

/** A string only the generated token metadata carries: component.card.media-border's description. */
function metadataMarker(): string {
  const source = JSON.parse(readFileSync(`${tokensDir}components/card.json`, "utf8")) as {
    component: { card: { "media-border": { $description: string } } };
  };
  return fingerprint(source.component.card["media-border"].$description);
}

/** A string only the theme creator's editor carries: its ThemeBar's contrast summary. */
const editorMarker = "All contrast pairings pass";

beforeAll(() => {
  if (!existsSync(clientDir)) {
    throw new Error("No build output found. Run `pnpm run build` first.");
  }
});

describe("prerendered hub (ds-hub R5.2)", () => {
  const document = () =>
    new JSDOM(readFileSync(`${clientDir}design-system/index.html`, "utf8")).window.document;

  it("has the three card links, in order", () => {
    const links = [...document().querySelectorAll("main ul > li h2 a")];

    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual(
      hubCards.map(({ title, href }) => [title, href]),
    );
  });

  it("has three previews, hidden and inert", () => {
    const previews = [...document().querySelectorAll("main ul > li [inert]")];

    expect(previews).toHaveLength(3);
    expect(previews.map((preview) => preview.getAttribute("aria-hidden"))).toEqual([
      "true",
      "true",
      "true",
    ]);
  });
});

describe("what the hub loads (ds-hub R3.9)", () => {
  it("loads no generated token metadata", () => {
    expect(scriptsOf(themeCreatorPath)).toContain(metadataMarker());
    expect(scriptsOf(designSystemPath)).not.toContain(metadataMarker());
  });

  it("loads no theme creator editor code", () => {
    expect(scriptsOf(themeCreatorPath)).toContain(editorMarker);
    expect(scriptsOf(designSystemPath)).not.toContain(editorMarker);
  });
});
