import { existsSync, readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import {
  componentPages,
  componentPath,
  componentsPath,
  themeCreatorPath,
} from "../../src/design-system/components/pages.ts";

const clientDir = fileURLToPath(new URL("../../build/client/", import.meta.url));

/** Home and the 404 ask for the sphere (site-backdrop R1.3). */
const strikingFiles = ["index.html", "404.html"];

/** Every Design System page gets the frame glow (R1.3). */
const quietFiles = [
  "/design-system",
  "/design-system/tokens",
  themeCreatorPath,
  componentsPath,
  ...componentPages.map(({ id }) => componentPath(id)),
].map((path) => `${path.slice(1)}/index.html`);

const documentOf = (file: string) =>
  new JSDOM(readFileSync(`${clientDir}${file}`, "utf8")).window.document;

/** CSS-module class names keep their local name (`_quiet_<hash>_<line>`). */
const quietLayers = (document: Document) =>
  [...document.querySelectorAll('div[aria-hidden="true"]')].filter((element) =>
    [...element.classList].some((name) => name.startsWith("_quiet_")),
  );

/** The sphere engine's chunk, named after its module (R5.7). */
const sphereChunks = () =>
  readdirSync(`${clientDir}assets`).filter((file) => /^start-sphere-[\w-]+\.js$/.test(file));

beforeAll(() => {
  if (!existsSync(clientDir)) {
    throw new Error("No build output found. Run `pnpm run build` first.");
  }
});

describe("backdrop in the build (site-backdrop R1.3, R4.2, R5.7)", () => {
  it.each(strikingFiles)("%s prerenders one hidden canvas and no frame glow", (file) => {
    const document = documentOf(file);

    expect(document.querySelectorAll("canvas")).toHaveLength(1);
    expect(document.querySelectorAll('canvas[aria-hidden="true"]')).toHaveLength(1);
    expect(quietLayers(document)).toHaveLength(0);
  });

  it.each(quietFiles)("%s prerenders the frame glow and no canvas", (file) => {
    const document = documentOf(file);

    expect(quietLayers(document)).toHaveLength(1);
    expect(document.querySelector("canvas")).toBeNull();
  });

  it("builds the sphere engine as one chunk of at most 3 KB gzipped", () => {
    const chunks = sphereChunks();
    expect(chunks).toHaveLength(1);

    const size = gzipSync(readFileSync(`${clientDir}assets/${chunks[0] ?? ""}`)).byteLength;
    expect(size).toBeLessThanOrEqual(3 * 1024);
  });

  it.each(quietFiles)("%s doesn't load the sphere engine up front", (file) => {
    const html = readFileSync(`${clientDir}${file}`, "utf8");

    for (const chunk of sphereChunks()) expect(html).not.toContain(chunk);
  });
});
