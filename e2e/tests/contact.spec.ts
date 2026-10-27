import { expect, test, type Page } from "@playwright/test";
import { contactContent } from "../../web/src/content/contact.ts";
import { homeContent } from "../../web/src/content/home.ts";
import { gotoSettled, main, tabKey, walk, weakRings } from "./support.ts";

const linkedin = (page: Page) =>
  main(page).getByRole("link", { name: contactContent.linkedinLabel });
const github = (page: Page) => main(page).getByRole("link", { name: contactContent.githubLabel });
const heading = (page: Page) =>
  main(page).getByRole("heading", { level: 1, name: contactContent.heading });

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

/** Whether GitHub sits on a line below LinkedIn, and whether both would fit on one line. */
async function linkRows(page: Page) {
  return linkedin(page).evaluate((first) => {
    const row = first.parentElement;
    const second = first.nextElementSibling;
    if (!row || !second) throw new Error("no link row");
    const a = first.getBoundingClientRect();
    const b = second.getBoundingClientRect();
    const gap = Number.parseFloat(getComputedStyle(row).columnGap);
    return {
      wrapped: b.top >= a.bottom,
      fitsOnOneLine: a.width + gap + b.width <= row.clientWidth,
    };
  });
}

test("tabs from the page start to LinkedIn, then GitHub, in main, each with a 2px, 3:1 focus ring (contact R5.3)", async ({
  page,
  browserName,
}) => {
  await gotoSettled(page, "/contact");

  const inMain = () =>
    page.evaluate(() => document.querySelector("main")?.contains(document.activeElement) ?? false);
  for (let step = 0; step < 20 && !(await inMain()); step++) {
    await page.keyboard.press(tabKey(browserName));
  }
  await expect(linkedin(page)).toBeFocused();
  await page.keyboard.press(tabKey(browserName));
  await expect(github(page)).toBeFocused();

  await main(page).focus();
  const rings = (await walk(page, browserName)).slice(0, 2);
  expect(rings.map((ring) => ring.label)).toEqual([
    `a "${contactContent.linkedinLabel}"`,
    `a "${contactContent.githubLabel}"`,
  ]);
  expect(weakRings(rings)).toEqual([]);
});

test.describe("focus after navigation (contact R5.2)", () => {
  test("lands on the h1 after the header's Contact, from /design-system", async ({ page }) => {
    await gotoSettled(page, "/design-system");

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Contact" })
      .focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/contact$/);
    await expect(heading(page)).toBeFocused();
  });

  test.describe("at 375×740", () => {
    test.use({ viewport: { width: 375, height: 740 } });

    test("lands on the h1 after Contact in the Menu panel, from the keyboard", async ({
      page,
      browserName,
    }) => {
      // The panel fades in and out; under reduced motion that takes 0ms.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await gotoSettled(page, "/design-system");
      const banner = page.getByRole("banner");
      // From the keyboard: WebKit, like Safari, doesn't focus a button on a click.
      await banner.getByRole("button", { name: "Menu" }).focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press(tabKey(browserName));
      await page.keyboard.press(tabKey(browserName));
      await expect(banner.getByRole("link", { name: "Contact" })).toBeFocused();

      await page.keyboard.press("Enter");

      await expect(page).toHaveURL(/\/contact$/);
      await expect(heading(page)).toBeFocused();
    });
  });

  test("lands on the h1 after Home's Want to connect?", async ({ page }) => {
    await gotoSettled(page, "/");

    await main(page).getByRole("link", { name: homeContent.contactLabel }).focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/contact$/);
    await expect(heading(page)).toBeFocused();
  });
});

test.describe("routing (contact R1.2)", () => {
  test("serves /contact with a 200", async ({ request }) => {
    const response = await request.get("/contact", { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(contactContent.location);
  });

  for (const path of ["/contact/", "/contact/index.html"]) {
    test(`redirects ${path} to /contact with a 301`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });

      expect(response.status()).toBe(301);
      expect(response.headers().location).toBe("https://127.0.0.1:4173/contact");
    });
  }
});

test.describe("at 320×640 (contact R5.5, R2.6)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("never scrolls sideways, and the links wrap only when they don't fit", async ({ page }) => {
    await gotoSettled(page, "/contact");

    expect(await noHorizontalScroll(page)).toBe(true);
    const { wrapped, fitsOnOneLine } = await linkRows(page);
    expect(wrapped).toBe(!fitsOnOneLine);
  });
});

// WCAG 1.4.4 (200% text) apart from 1.4.10 (320px): both at once is about 800% zoom, past either
// (as docs-layout.spec's reflow tests).
for (const width of [800, 1280]) {
  test.describe(`at ${String(width)}px wide with 200% text (contact R5.5, R2.6)`, () => {
    test.use({ viewport: { width, height: 720 } });

    test("never scrolls sideways, and the links wrap only when they don't fit", async ({
      page,
    }) => {
      await gotoSettled(page, "/contact");
      const heightOf = () => heading(page).evaluate((element) => element.clientHeight);
      const before = await heightOf();
      // Through the CSSOM, which the CSP allows.
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });
      await expect.poll(heightOf).toBeGreaterThan(before);

      expect(await noHorizontalScroll(page)).toBe(true);
      const { wrapped, fitsOnOneLine } = await linkRows(page);
      expect(wrapped).toBe(!fitsOnOneLine);
    });
  });
}
