import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { componentPath, themeCreatorPath } from "../../src/design-system/components/pages.ts";
import { siteUrl } from "../../src/site.config.ts";
import { themeScript } from "../../src/theme/theme-script.ts";
import { scriptsOf } from "./page-scripts.ts";

const buildDir = fileURLToPath(new URL("../../build/", import.meta.url));
const clientDir = `${buildDir}client/`;
const tokensDir = fileURLToPath(new URL("../../tokens/", import.meta.url));

const fileOf = (path: string) => `${clientDir}${path === "/" ? "" : `${path.slice(1)}/`}index.html`;
const documentAt = (path: string) => new JSDOM(readFileSync(fileOf(path), "utf8")).window.document;

/** A string only semantic token metadata carries: color.surface.glass's description. */
function metadataMarker(): string {
  const source = JSON.parse(readFileSync(`${tokensDir}themes/light.json`, "utf8")) as {
    color: { surface: { glass: { $description: string } } };
  };
  return source.color.surface.glass.$description;
}

beforeAll(() => {
  if (!existsSync(clientDir)) {
    throw new Error("No build output found. Run `pnpm run build` first.");
  }
});

describe("/design-system/theme-creator, prerendered (theme-creator R16.2)", () => {
  it("has its h1, the no-JavaScript note and no controls, title and canonical URL (R1.1, R1.4)", () => {
    const document = documentAt(themeCreatorPath);
    const main = document.querySelector("main");

    expect(main?.querySelector("h1")?.textContent).toBe("Theme Creator");
    expect(main?.textContent).toContain("The theme creator needs JavaScript.");
    expect(main?.querySelectorAll("input, select, textarea, button")).toHaveLength(0);
    expect(document.title).toBe("Theme Creator · Design System · Ben Morrison");
    expect(document.querySelector("link[rel='canonical']")?.getAttribute("href")).toBe(
      `${siteUrl}${themeCreatorPath}`,
    );
  });

  it("has no <style> element (R1.5)", () => {
    expect(readFileSync(fileOf(themeCreatorPath), "utf8")).not.toMatch(/<style[\s>]/i);
  });

  it("is in the sitemap", () => {
    expect(readFileSync(`${clientDir}sitemap.xml`, "utf8")).toContain(
      `<loc>${siteUrl}${themeCreatorPath}</loc>`,
    );
  });

  it("is linked from /design-system (R1.3)", () => {
    expect(
      documentAt("/design-system").querySelector(`main a[href='${themeCreatorPath}']`)?.textContent,
    ).toBe("Theme Creator");
  });
});

describe("the new component pages (theme-creator R12–R14)", () => {
  it.each(["dialog", "slider", "color-field"] as const)("prerenders %s", (id) => {
    expect(existsSync(fileOf(componentPath(id)))).toBe(true);
  });
});

describe("the pre-paint script (R9.3, R16.2)", () => {
  it("is the one built, and its hash is in the site manifest", () => {
    const manifest = JSON.parse(readFileSync(`${buildDir}site-manifest.json`, "utf8")) as {
      scriptHashes: string[];
    };
    const inline = [...documentAt(themeCreatorPath).querySelectorAll("script:not([src])")].map(
      (script) => script.textContent,
    );
    const hash = `sha256-${createHash("sha256").update(themeScript, "utf8").digest("base64")}`;

    expect(inline).toContain(themeScript);
    expect(manifest.scriptHashes).toContain(hash);
  });
});

describe("the bundle boundary (design §4.5)", () => {
  it("keeps token metadata out of what every page loads, and in the theme creator", () => {
    const marker = metadataMarker();

    expect(scriptsOf("/")).not.toContain(marker);
    expect(scriptsOf(themeCreatorPath)).toContain(marker);
  });
});
