/**
 * Renders the link-preview image, web/public/og-image.png (home R7.5, design §7): the built Home
 * page's still sphere in Dark (without the frame glow), with the name, the role and the domain over
 * it, at 1200×630.
 *
 * When: after changing the name, the role, the dark palette or the sphere.
 * How:  pnpm run build && pnpm run og-image && pnpm run build, then commit the PNG. To refresh
 *       LinkedIn's cached preview, run the page through its Post Inspector after deploying.
 *
 * Not a test: nothing in check, build, test:build, test:e2e or CI runs it.
 */
import { spawn } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { homeContent } from "../web/src/content/home.ts";
import { siteUrl } from "../web/src/site.config.ts";
import { readManifest } from "./build.ts";

const publicDir = fileURLToPath(new URL("../web/public/", import.meta.url));
const outFile = `${publicDir}og-image.png`;
const MAX_BYTES = 300 * 1024;
/** The edge emulator's origin, as playwright.config.ts has it (importing server.ts would start it here). */
const origin = "https://127.0.0.1:4173";

/** The card over the sphere. Every value is a token custom property; the text is set below. */
const cardStyles = `
  header, footer, [data-og-hidden] { display: none !important; }
  /* The frame glow (decision 0018): Chrome dithers its gradients, and the noise takes the PNG past 300 KB. */
  div[aria-hidden="true"][class*="_frameGlow_"] { display: none !important; }
  .og-card {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-stack-md);
    max-inline-size: calc(2 * var(--size-column-lg));
    padding-inline: var(--space-layout-lg);
  }
  .og-name {
    margin: 0;
    color: var(--color-text-default);
    font-family: var(--type-family-heading);
    font-size: var(--type-size-display);
    font-weight: var(--type-weight-heading);
    line-height: var(--type-leading-heading);
    letter-spacing: var(--type-tracking-display);
  }
  .og-role {
    margin: 0;
    color: var(--color-text-muted);
    font-family: var(--type-family-heading);
    font-size: var(--type-size-h3);
    line-height: var(--type-leading-heading);
  }
  .og-host {
    margin: 0;
    color: var(--color-accent-text);
    font-family: var(--type-family-label);
    font-size: var(--type-size-label);
    letter-spacing: var(--type-tracking-label);
    text-transform: uppercase;
  }
`;

readManifest();

const server = spawn(process.execPath, ["server.ts"], {
  cwd: fileURLToPath(new URL(".", import.meta.url)),
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise<void>((resolve, reject) => {
  server.once("exit", (code) => {
    reject(new Error(`The edge emulator exited (${String(code)}). Is ${origin} already in use?`));
  });
  server.stdout.on("data", (chunk: Buffer) => {
    if (chunk.toString().includes("serving")) resolve();
  });
});

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    reducedMotion: "reduce",
    ignoreHTTPSErrors: true,
    // Only for the injected style tag below; the site's CSP is never changed.
    bypassCSP: true,
  });
  const page = await context.newPage();
  await page.goto(`${origin}/`);
  await page.evaluate(() => document.fonts.ready);
  // The still frame (reduced motion draws one), faded in, with dots painted.
  await page.waitForFunction(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[aria-hidden="true"]');
    const context = canvas?.getContext("2d");
    if (!canvas || !context || getComputedStyle(canvas).opacity !== "1") return false;
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    return data.some((value, index) => index % 4 === 3 && value > 0);
  });

  await page.addStyleTag({ content: cardStyles });
  await page.getByRole("link", { name: "Back to top" }).evaluateAll((links) => {
    for (const link of links) link.setAttribute("data-og-hidden", "");
  });
  await page.locator("main").evaluate(
    (main, text) => {
      const card = document.createElement("div");
      card.className = "og-card";
      for (const [className, content] of [
        ["og-name", text.name],
        ["og-role", text.role],
        ["og-host", text.host],
      ] as const) {
        const line = document.createElement("p");
        line.className = className;
        line.textContent = content;
        card.append(line);
      }
      main.replaceChildren(card);
    },
    { name: homeContent.name, role: homeContent.role, host: new URL(siteUrl).host },
  );

  mkdirSync(publicDir, { recursive: true });
  await page.screenshot({ path: outFile, type: "png" });
} finally {
  await browser.close();
  server.kill();
}

const { size } = statSync(outFile);
console.log(`Wrote ${outFile} (${(size / 1024).toFixed(1)} KB).`);
if (size > MAX_BYTES) {
  console.error(
    `It's over ${String(MAX_BYTES / 1024)} KB (R7.4): crop the sphere, or switch to JPEG.`,
  );
  process.exitCode = 1;
} else {
  console.log("Now run `pnpm run build` and commit web/public/og-image.png.");
}
