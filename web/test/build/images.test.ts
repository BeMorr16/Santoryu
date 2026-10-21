import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const clientDir = fileURLToPath(new URL("../../build/client/", import.meta.url));

beforeAll(() => {
  if (!existsSync(clientDir)) {
    throw new Error("No build output found. Run `pnpm run build` first.");
  }
});

const builtFiles = () => readdirSync(clientDir, { recursive: true, encoding: "utf8" });
const assets = () => readdirSync(`${clientDir}assets`);

/** True when a JPEG's header segments include an APP1 segment holding EXIF. */
function hasExif(jpeg: Buffer): boolean {
  let at = 2;
  while (at + 4 <= jpeg.length && jpeg[at] === 0xff) {
    const marker = jpeg[at + 1];
    if (marker === 0xda) return false;
    const length = jpeg.readUInt16BE(at + 2);
    if (marker === 0xe1 && jpeg.subarray(at + 4, at + 10).toString("latin1") === "Exif\0\0") {
      return true;
    }
    at += 2 + length;
  }
  return false;
}

describe("images in the build output", () => {
  it("refinement R18.8: inlines no image or font as a data: URI, which the CSP blocks", () => {
    const files = builtFiles().filter((path) => /\.(css|html|js)$/.test(path));
    expect(files.some((path) => path.endsWith(".js"))).toBe(true);
    for (const path of files) {
      const text = readFileSync(`${clientDir}${path}`, "utf8");
      expect(text, path).not.toMatch(/data:(image|font)\//);
    }
  });

  it("refinement R18.10: emits every width of the design system's sample photos as files in assets/", () => {
    const photos = assets()
      .filter((file) => file.endsWith(".jpg"))
      .map((file) => file.replace(/-[\w-]{8}\.jpg$/, ".jpg"))
      .sort();
    expect(photos).toEqual([
      "bull-elk-1280.jpg",
      "bull-elk-1920.jpg",
      "bull-elk-640.jpg",
      "lower-falls-1440.jpg",
      "lower-falls-480.jpg",
      "lower-falls-960.jpg",
    ]);
  });

  it("refinement R18.9: ships no JPEG with EXIF metadata", () => {
    const jpegs = builtFiles().filter((path) => /\.jpe?g$/i.test(path));
    expect(jpegs.length).toBeGreaterThan(0);
    for (const path of jpegs) {
      expect(hasExif(readFileSync(`${clientDir}${path}`)), path).toBe(false);
    }
  });

  it("refinement R18.9: the EXIF check finds an APP1 EXIF segment", () => {
    const exif = Buffer.from("Exif\0\0MM", "latin1");
    const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, 0x00, exif.length + 2]), exif]);
    const scan = Buffer.from([0xff, 0xda, 0x00, 0x02]);
    expect(hasExif(Buffer.concat([Buffer.from([0xff, 0xd8]), app1, scan]))).toBe(true);
    expect(hasExif(Buffer.concat([Buffer.from([0xff, 0xd8]), scan]))).toBe(false);
  });
});
