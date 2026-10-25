import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { openAllAccordions, storeTheme, themes } from "./support.ts";

const tokensPath = "/design-system/tokens";
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** The diagram's four tier items. */
const tiers = (page: Page) => page.getByRole("figure").locator(":scope > ol > li");

/** Each tier item's box. */
const tierBoxes = async (page: Page) =>
  tiers(page).evaluateAll((items) =>
    items.map((item) => {
      const { left, top } = item.getBoundingClientRect();
      return { left: Math.round(left), top: Math.round(top) };
    }),
  );

for (const theme of themes) {
  test(`${tokensPath} in ${theme} with every group open has no axe violations (ds-tokens R12.3)`, async ({
    page,
  }) => {
    test.slow();
    await storeTheme(page, theme);
    await page.goto(tokensPath);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    expect(await openAllAccordions(page)).toBeGreaterThan(10);

    const { violations } = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
    expect(violations.flatMap((violation) => violation.nodes.map((node) => node.target))).toEqual(
      [],
    );
  });
}

test.describe("the flow diagram (ds-tokens R2.9, R1.5)", () => {
  test("fits 320px with no sideways page scroll", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(tokensPath);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("stacks its tiers at 375px and puts them in a row at 1280px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(tokensPath);
    const stacked = await tierBoxes(page);
    expect(stacked).toHaveLength(4);
    expect(new Set(stacked.map(({ left }) => left)).size).toBe(1);
    expect(stacked.map(({ top }) => top)).toEqual(
      stacked.map(({ top }) => top).toSorted((a, b) => a - b),
    );

    await page.setViewportSize({ width: 1280, height: 800 });
    const row = await tierBoxes(page);
    // The nodes share one row: the single nodes' middles line up (owner, visual review).
    const middles = await tiers(page).evaluateAll((items) =>
      items.slice(1).map((item) => {
        const { top, bottom } = (item.lastElementChild ?? item).getBoundingClientRect();
        return Math.round((top + bottom) / 2);
      }),
    );
    expect(new Set(middles).size).toBe(1);
    expect(new Set(row.map(({ top }) => top)).size).toBe(1);
    expect(row.map(({ left }) => left)).toEqual(
      row.map(({ left }) => left).toSorted((a, b) => a - b),
    );
  });
});

test("loading with a token's fragment opens its group and shows the row below the header (ds-tokens R7.2, R7.3)", async ({
  page,
}) => {
  await page.goto(`${tokensPath}#color-text-muted`);

  const row = page.locator("#color-text-muted");
  await expect(row).toBeVisible();
  // The group's button is the one controlling the panel around the row.
  const panelId = await row.evaluate((element) => element.closest("[id$='panel']")?.id ?? "");
  await expect(page.locator(`button[aria-controls="${panelId}"]`)).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  const headerBottom = await page
    .getByRole("banner")
    .evaluate((element) => element.getBoundingClientRect().bottom);
  const { top, bottom } = await row.evaluate((element) => element.getBoundingClientRect());
  expect(top).toBeGreaterThanOrEqual(headerBottom - 1);
  expect(bottom).toBeLessThanOrEqual(page.viewportSize()?.height ?? 0);
  expect(await row.evaluate((element) => element.matches(":target"))).toBe(true);
  await expect(page.locator("body")).toBeFocused();
});

test("a row's copy button copies its CSS variable (ds-tokens R8.2)", async ({
  page,
  context,
  browserName,
}) => {
  // WebKit has no clipboard permission in Playwright: it checks the announcement only.
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  }
  await page.goto(`${tokensPath}#color-text-muted`);
  const row = page.locator("#color-text-muted");

  await row.getByRole("button", { name: "Copy --color-text-muted" }).click();

  await expect(row.getByRole("status")).toHaveText("Copied");
  if (browserName === "chromium") {
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("--color-text-muted");
  }
});

test("search hides its icon while focused, filters, opens groups, announces, and clears (ds-tokens R10.7, R11)", async ({
  page,
}) => {
  await page.goto(tokensPath);
  const landmark = page.getByRole("search", { name: "Find a token" });
  const field = landmark.getByRole("searchbox", { name: "Search tokens" });
  const icon = landmark.locator("svg").first();
  await expect(icon).toBeVisible();
  const textStart = await field.evaluate((element) => getComputedStyle(element).paddingInlineStart);

  await field.fill("muted");

  await expect(icon).toBeHidden();
  // The icon's space goes with it, so the text starts at the field's own padding.
  expect(
    parseFloat(await field.evaluate((element) => getComputedStyle(element).paddingInlineStart)),
  ).toBeLessThan(parseFloat(textStart));
  await expect(landmark.getByRole("status")).toHaveText(/^\d+ tokens? match$/);
  await expect(page.locator("#color-text-muted")).toBeVisible();
  await expect(page.locator("#color-blue-600")).toBeHidden();
  expect(await page.getByRole("button", { expanded: true }).count()).toBeGreaterThan(0);

  await landmark.getByRole("button", { name: "Clear Search tokens" }).click();

  await expect(field).toHaveValue("");
  await expect(field).toBeFocused();
  await expect(page.locator(":is(h2, h3) > button[aria-expanded='true']")).toHaveCount(0);
  await expect(landmark.getByRole("status")).toBeEmpty();
});
