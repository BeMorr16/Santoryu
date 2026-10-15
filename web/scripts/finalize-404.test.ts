import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { finalize404 } from "./finalize-404.ts";

let clientDir: string;

beforeEach(async () => {
  clientDir = await mkdtemp(join(tmpdir(), "finalize-404-"));
});

afterEach(async () => {
  await rm(clientDir, { recursive: true, force: true });
});

describe("finalize404", () => {
  it("moves 404/index.html to 404.html and removes 404/ and 404.data", async () => {
    await mkdir(join(clientDir, "404"));
    await writeFile(join(clientDir, "404", "index.html"), "<h1>Page not found</h1>");
    await writeFile(join(clientDir, "404.data"), "data");
    await writeFile(join(clientDir, "index.html"), "<h1>Home</h1>");

    await finalize404(clientDir);

    expect(await readFile(join(clientDir, "404.html"), "utf8")).toBe("<h1>Page not found</h1>");
    expect(existsSync(join(clientDir, "404"))).toBe(false);
    expect(existsSync(join(clientDir, "404.data"))).toBe(false);
    expect(await readFile(join(clientDir, "index.html"), "utf8")).toBe("<h1>Home</h1>");
  });

  it("works when there is no 404.data", async () => {
    await mkdir(join(clientDir, "404"));
    await writeFile(join(clientDir, "404", "index.html"), "<h1>Page not found</h1>");

    await finalize404(clientDir);

    expect(existsSync(join(clientDir, "404.html"))).toBe(true);
  });

  it("throws, naming the path, if the prerendered 404 page is missing", async () => {
    await expect(finalize404(clientDir)).rejects.toThrow(join(clientDir, "404", "index.html"));
  });
});
