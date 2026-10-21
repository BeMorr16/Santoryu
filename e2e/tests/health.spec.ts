import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { buildCsp } from "infra/src/security-headers.ts";
import { missingImageSrc } from "../../web/src/lab/components/showcases/figure-photos.ts";
import { readManifest } from "../build.ts";

const manifest = readManifest();
const pages = ["/", "/lab", "/lab/tokens", "/lab/components", "/nope"];

declare global {
  interface Window {
    cspViolations: string[];
  }
}

/** Collects console errors, page errors and CSP violations from before any page script runs. */
async function watch(page: Page) {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    // Browsers log the not-found page's own 404 status, and the Figure section's deliberately
    // missing image (refinement R18.10); those are the intended responses.
    const notFound = /status of 404/.test(message.text());
    const { url } = message.location();
    const intended =
      notFound && (url === page.url() || (url !== "" && new URL(url).pathname === missingImageSrc));
    if (!intended) problems.push(`console.error: ${message.text()} (${url})`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.cspViolations.push(`${event.violatedDirective} blocked ${event.blockedURI}`);
    });
  });
  return problems;
}

for (const path of pages) {
  test.describe(path, () => {
    test("loads with no console errors, page errors or CSP violations (R16.6, R17.2)", async ({
      page,
    }) => {
      const problems = await watch(page);
      await page.goto(path, { waitUntil: "networkidle" });

      expect(problems).toEqual([]);
      expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
    });

    test("serves the production CSP for its inline scripts (R17.2)", async ({ request }) => {
      const response = await request.get(path);

      expect(response.headers()["content-security-policy"]).toBe(buildCsp(manifest.scriptHashes));
    });

    test("loads all three webfonts from this origin (R1.2)", async ({ page }) => {
      await page.goto(path);

      const statuses = await page.evaluate(async () => {
        const families = ["Inter Variable", "Space Grotesk Variable", "Fira Code Variable"];
        return Promise.all(
          families.map(async (family) => {
            const faces = await document.fonts.load(`1em "${family}"`);
            return `${family}: ${faces.map((face) => face.status).join(",") || "none"}`;
          }),
        );
      });
      expect(statuses).toEqual([
        "Inter Variable: loaded",
        "Space Grotesk Variable: loaded",
        "Fira Code Variable: loaded",
      ]);
    });
  });
}

test.describe("routing matches production", () => {
  test("redirects /lab/ to the canonical path with a 301", async ({ request }) => {
    const response = await request.get("/lab/", { maxRedirects: 0 });

    expect(response.status()).toBe(301);
    expect(response.headers().location).toBe("https://127.0.0.1:4173/lab");
  });

  test("serves an unknown path as a 404 with the not-found page", async ({ request }) => {
    const response = await request.get("/nope");

    expect(response.status()).toBe(404);
    expect(await response.text()).toContain("Page not found");
  });

  test("serves the built 404.html body for unknown paths", async ({ request }) => {
    const built = readFileSync(new URL("../../web/build/client/404.html", import.meta.url), "utf8");

    expect(await (await request.get("/nope")).text()).toBe(built);
  });
});
