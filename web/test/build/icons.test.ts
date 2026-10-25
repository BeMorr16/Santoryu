import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { icons } from "../../src/components/Icon/registry.ts";

const assetsDir = fileURLToPath(new URL("../../build/client/assets/", import.meta.url));

beforeAll(() => {
  if (!existsSync(assetsDir)) {
    throw new Error("No build output found. Run `pnpm run build` first.");
  }
});

describe("icons in the client bundle (R6.6)", () => {
  it("contains exactly the registry's icons, by Phosphor displayName", () => {
    const js = readdirSync(assetsDir)
      .filter((file) => file.endsWith(".js"))
      .map((file) => readFileSync(`${assetsDir}${file}`, "utf8"))
      .join("\n");
    const bundled = new Set(
      [...js.matchAll(/displayName\s*=\s*["'`](\w+Icon)["'`]/g)].map((match) => match[1]),
    );
    const registry = new Set(Object.values(icons).map((icon) => icon.displayName));

    expect(registry.size).toBe(Object.keys(icons).length);
    expect(bundled).toEqual(registry);
  });
});
