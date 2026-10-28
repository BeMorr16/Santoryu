import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  experienceContent,
  positions,
  type Highlight,
  type SkillId,
} from "../../web/src/content/experience.ts";
import { categorySkills, countHighlights, usedSkillIds } from "../../web/src/experience/model.ts";
import { resumePdfPath } from "../../web/src/site.config.ts";
import { gotoSettled, main, storeTheme, tabKey, themes, walk, weakRings } from "./support.ts";

const path = "/experience";
const highlights = positions.flatMap<Highlight>((position) => position.highlights);
const frontendUsed = categorySkills("frontend", usedSkillIds(positions)).used;

const panel = (page: Page) =>
  main(page).getByRole("region", { name: experienceContent.skillsHeading });
const work = (page: Page) =>
  main(page).getByRole("region", { name: experienceContent.workHeading });
const skill = (page: Page, name: string) => panel(page).getByRole("button", { name, exact: true });
const category = (page: Page, name: string) =>
  panel(page).getByRole("heading", { level: 3, name }).getByRole("button");
const search = (page: Page) =>
  panel(page).getByRole("searchbox", { name: experienceContent.searchLabel });
const clear = (page: Page) =>
  panel(page).getByRole("button", { name: experienceContent.clearLabel });
const count = (page: Page) => panel(page).locator('[aria-live="polite"]');
const disclosure = (page: Page) =>
  panel(page).getByRole("button", { name: experienceContent.disclosureLabel });
const heading = (page: Page) =>
  main(page).getByRole("heading", { level: 1, name: experienceContent.heading });

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function violations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  return violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.target.join(" ")}`),
  );
}

const headerBottom = (page: Page) =>
  page.getByRole("banner").evaluate((element) => element.getBoundingClientRect().bottom);

test.describe("filtering (resume R7.2, R7.3, R12.1)", () => {
  test("pressing React shows only its highlights, keeps every position and updates the count", async ({
    page,
  }) => {
    await gotoSettled(page, path);
    const { shown, total } = countHighlights(positions, new Set<SkillId>(["react"]));
    expect(shown).toBeLessThan(total);
    await expect(count(page)).toHaveText(experienceContent.count(total, total));

    await skill(page, "React").click();

    await expect(skill(page, "React")).toHaveAttribute("aria-pressed", "true");
    await expect(count(page)).toHaveText(experienceContent.count(shown, total));
    const shownHighlights = work(page).getByRole("heading", { level: 4 });
    await expect(shownHighlights).toHaveCount(shown);
    for (const highlightHeading of await shownHighlights.all()) {
      const tags = highlightHeading.locator("xpath=..").getByRole("list", { name: "Skills" });
      await expect(tags.getByRole("listitem").filter({ hasText: /^React, selected$/ })).toHaveCount(
        1,
      );
    }
    await expect(work(page).getByRole("heading", { level: 3 })).toHaveCount(positions.length);
    for (const positionHeading of await work(page).getByRole("heading", { level: 3 }).all()) {
      await expect(positionHeading).toBeVisible();
    }
  });

  for (const theme of themes) {
    test(`has no axe violations with a skill selected, in ${theme}`, async ({ page }) => {
      await storeTheme(page, theme);
      await gotoSettled(page, path);
      await skill(page, "React").click();
      await expect(skill(page, "React")).toHaveAttribute("aria-pressed", "true");

      expect(await violations(page)).toEqual([]);
    });
  }
});

test("a category toggle fills its group, shows the partial count, then clears (resume R7.4, R7.5)", async ({
  page,
}) => {
  await gotoSettled(page, path);
  const frontend = category(page, experienceContent.categories.frontend);
  const partial = experienceContent.categoryCount(1, frontendUsed.length);

  await skill(page, "React").click();
  await expect(frontend).toHaveAttribute("aria-pressed", "false");
  await expect(panel(page).getByText(partial)).toBeVisible();

  await frontend.click();
  await expect(frontend).toHaveAttribute("aria-pressed", "true");
  await expect(panel(page).getByText(partial)).toBeHidden();
  for (const { label } of frontendUsed) {
    await expect(skill(page, label)).toHaveAttribute("aria-pressed", "true");
  }

  await frontend.click();
  await expect(frontend).toHaveAttribute("aria-pressed", "false");
  await expect(count(page)).toHaveText(
    experienceContent.count(highlights.length, highlights.length),
  );
});

test("Clear empties the selection and focuses the search field (resume R7.8)", async ({ page }) => {
  await gotoSettled(page, path);
  await expect(clear(page)).toHaveAttribute("aria-disabled", "true");

  await skill(page, "React").click();
  await clear(page).click();

  await expect(search(page)).toBeFocused();
  await expect(skill(page, "React")).toHaveAttribute("aria-pressed", "false");
  await expect(clear(page)).toHaveAttribute("aria-disabled", "true");
});

test("searching “a11y” shows Accessibility and hides the rest (resume R8.1)", async ({ page }) => {
  await gotoSettled(page, path);

  await search(page).fill("a11y");

  await expect(skill(page, "Accessibility")).toBeVisible();
  await expect(skill(page, "React")).toHaveCount(0);
  await expect(panel(page).getByRole("heading", { level: 3 })).toHaveCount(1);
});

test.describe("below 48em, at 375×740 (resume R3.3)", () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test("starts closed with the count and Clear showing, and opens and closes", async ({ page }) => {
    await gotoSettled(page, path);

    await expect(disclosure(page)).toHaveAttribute("aria-expanded", "false");
    await expect(count(page)).toBeVisible();
    await expect(clear(page)).toBeVisible();
    await expect(search(page)).toBeHidden();
    await expect(category(page, experienceContent.categories.languages)).toBeHidden();

    await disclosure(page).click();
    await expect(disclosure(page)).toHaveAttribute("aria-expanded", "true");
    await expect(search(page)).toBeVisible();
    await expect(category(page, experienceContent.categories.languages)).toBeVisible();

    await disclosure(page).click();
    await expect(disclosure(page)).toHaveAttribute("aria-expanded", "false");
    await expect(search(page)).toBeHidden();
  });
});

test.describe("at 1280×720 (resume R3.3, R12.6)", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  // The panel is sticky within its grid area, which ends with Education, so at the page's very end
  // it slides up with that edge, as any sticky column does (owner, 2026-10-28).
  test("puts the panel beside the work, and keeps it in view while the positions scroll", async ({
    page,
  }) => {
    await gotoSettled(page, path);
    await expect(disclosure(page)).toBeHidden();
    const panelBox = await panel(page).boundingBox();
    const workBox = await work(page).boundingBox();
    if (!panelBox || !workBox) throw new Error("no panel or work box");
    expect(panelBox.x).toBeGreaterThanOrEqual(workBox.x + workBox.width);

    await work(page).getByRole("heading", { level: 3 }).last().scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1000);

    const scrolled = await panel(page).boundingBox();
    expect(scrolled?.y).toBeGreaterThanOrEqual((await headerBottom(page)) - 1);
    expect(scrolled?.y).toBeLessThan(720);
  });

  test("at 200% text, the panel scrolls within itself to its last skill", async ({ page }) => {
    await gotoSettled(page, path);
    const before = await heading(page).evaluate((element) => element.clientHeight);
    // Through the CSSOM, which the CSP allows.
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expect
      .poll(() => heading(page).evaluate((element) => element.clientHeight))
      .toBeGreaterThan(before);
    await main(page)
      .getByRole("heading", { level: 2, name: experienceContent.educationHeading })
      .scrollIntoViewIfNeeded();

    const last = panel(page)
      .getByRole("group", { name: experienceContent.categories.devops })
      .getByText(new RegExp(`^${experienceContent.alsoLabel}`));
    expect(
      await panel(page).evaluate((element) => element.scrollHeight > element.clientHeight),
    ).toBe(true);
    await panel(page).evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await expect(last).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => document.documentElement.clientWidth),
    );
  });
});

test.describe("focus after navigation (resume R12.2)", () => {
  test("lands on the h1 after the header's Experience link", async ({ page }) => {
    await gotoSettled(page, "/contact");

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Experience" })
      .focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/experience$/);
    await expect(heading(page)).toBeFocused();
  });

  test("lands on the h1 after Home's Experience card", async ({ page }) => {
    await gotoSettled(page, "/");

    await main(page).getByRole("link", { name: "Experience" }).focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/experience$/);
    await expect(heading(page)).toBeFocused();
  });
});

test.describe("routing (resume R1.2, R10.1)", () => {
  test("serves /experience with a 200", async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(experienceContent.skillsHint);
  });

  for (const from of ["/experience/", "/experience/index.html"]) {
    test(`redirects ${from} to /experience with a 301`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });

      expect(response.status()).toBe(301);
      expect(response.headers().location).toBe("https://127.0.0.1:4173/experience");
    });
  }

  test("serves the résumé PDF as application/pdf", async ({ request }) => {
    const response = await request.get(resumePdfPath, { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("application/pdf");
    expect((await response.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});

test("tabs from the h1 to the PDF link, Clear, then the panel's controls, each with a 2px, 3:1 ring (resume R12.3)", async ({
  page,
  browserName,
}) => {
  await gotoSettled(page, path);

  await main(page).focus();
  await page.keyboard.press(tabKey(browserName));
  await expect(main(page).getByRole("link", { name: experienceContent.pdfLabel })).toBeFocused();
  await page.keyboard.press(tabKey(browserName));
  await expect(clear(page)).toBeFocused();
  await page.keyboard.press(tabKey(browserName));
  await expect(search(page)).toBeFocused();
  await page.keyboard.press(tabKey(browserName));
  await expect(category(page, experienceContent.categories.languages)).toBeFocused();

  await main(page).focus();
  const rings = await walk(page, browserName);
  expect(rings.slice(0, 3).map((ring) => ring.label)).toEqual([
    `a "${experienceContent.pdfLabel}"`,
    `button "${experienceContent.clearLabel}"`,
    'input ""',
  ]);
  expect(weakRings(rings)).toEqual([]);
});
