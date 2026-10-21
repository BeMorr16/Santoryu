import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";

const clientDir = fileURLToPath(new URL("../../build/client/", import.meta.url));

beforeAll(() => {
  if (!existsSync(clientDir)) {
    throw new Error("No build output found. Run `pnpm run build` first.");
  }
});

const builtFiles = () => readdirSync(clientDir, { recursive: true, encoding: "utf8" });
const pages = () => builtFiles().filter((path) => path.endsWith(".html"));

describe("webfonts in the build output", () => {
  it("R1.2: references no font URL on another origin from any built CSS or HTML", () => {
    const files = builtFiles().filter((path) => /\.(css|html)$/.test(path));
    expect(files.some((path) => path.endsWith(".css"))).toBe(true);
    for (const path of files) {
      const text = readFileSync(`${clientDir}${path}`, "utf8");
      expect(text, path).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
      const external = [...text.matchAll(/url\(\s*["']?(https?:)?\/\/[^)]*\)/g)].map((m) => m[0]);
      expect(external, path).toEqual([]);
      const externalFontLinks = [
        ...text.matchAll(/<link[^>]+href="(https?:)?\/\/[^"]*"[^>]*as="font"[^>]*>/g),
      ];
      expect(externalFontLinks, path).toEqual([]);
    }
  });

  it("R1.3: ships exactly the three latin variable font files", () => {
    const fonts = readdirSync(`${clientDir}assets`)
      .filter((file) => /\.(woff2?|ttf|otf|eot)$/.test(file))
      .map((file) => file.replace(/-[\w-]{8}\.woff2$/, ".woff2"))
      .sort();
    expect(fonts).toEqual([
      "fira-code-latin-wght-normal.woff2",
      "inter-latin-wght-normal.woff2",
      "space-grotesk-latin-wght-normal.woff2",
    ]);
  });

  it.each([
    "index.html",
    "design-system/index.html",
    "design-system/tokens/index.html",
    "design-system/components/index.html",
    "404.html",
  ])("R1.6: %s preloads Inter and Space Grotesk from files in the build", (page) => {
    expect(pages()).toContain(page);
    const { document } = new JSDOM(readFileSync(`${clientDir}${page}`, "utf8")).window;
    const preloads = [...document.head.querySelectorAll('link[rel="preload"][as="font"]')];
    expect(preloads.map((link) => link.getAttribute("href")?.replace(/-[\w-]{8}\./, "."))).toEqual([
      "/assets/inter-latin-wght-normal.woff2",
      "/assets/space-grotesk-latin-wght-normal.woff2",
    ]);
    for (const link of preloads) {
      expect(link.getAttribute("type")).toBe("font/woff2");
      expect(link.hasAttribute("crossorigin")).toBe(true);
      const href = link.getAttribute("href") ?? "";
      expect(existsSync(`${clientDir}${href.slice(1)}`), href).toBe(true);
    }
  });

  it("R1.6: preloads the same hashed files the CSS @font-face rules load", () => {
    const { document } = new JSDOM(readFileSync(`${clientDir}index.html`, "utf8")).window;
    const preloaded = [...document.head.querySelectorAll('link[rel="preload"][as="font"]')].map(
      (link) => link.getAttribute("href"),
    );
    const css = builtFiles()
      .filter((path) => path.endsWith(".css"))
      .map((path) => readFileSync(`${clientDir}${path}`, "utf8"))
      .join("\n");
    for (const href of preloaded) expect(css, href ?? "").toContain(`url(${href ?? ""})`);
  });
});
