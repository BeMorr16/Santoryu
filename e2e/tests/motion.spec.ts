import { expect, test, type Page } from "@playwright/test";
import { section } from "./support.ts";

const accordionTrigger = (page: Page) =>
  section(page, "Accordion").getByRole("button", { name: "What is this site?" }).first();

async function durations(page: Page) {
  await page.goto("/lab/components");
  const duration = (locator: ReturnType<Page["locator"]>) =>
    locator.evaluate((element) => getComputedStyle(element).transitionDuration);
  return {
    button: await duration(
      section(page, "Button").getByRole("button", { name: "Primary", exact: true }),
    ),
    card: await duration(
      section(page, "Card").getByRole("article").filter({ hasText: "Design tokens" }),
    ),
    menu: await duration(
      page.locator(
        `[id="${(await section(page, "Menu").getByRole("button", { name: "Project actions" }).getAttribute("aria-controls")) ?? ""}"]`,
      ),
    ),
    accordionPanel: await duration(
      page.locator(`[id="${(await accordionTrigger(page).getAttribute("aria-controls")) ?? ""}"]`),
    ),
    accordionChevron: await duration(accordionTrigger(page).locator("svg")),
    menuChevron: await duration(
      section(page, "Menu").getByRole("button", { name: "Project actions" }).locator("svg").last(),
    ),
  };
}

test("component transitions run at their token durations by default", async ({ page }) => {
  const result = await durations(page);

  for (const [component, value] of Object.entries(result)) {
    expect(value, component).not.toMatch(/^0s(, 0s)*$/);
  }
});

test("component transitions resolve to 0s under reduced motion (R3.7, R16.7)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const result = await durations(page);

  for (const [component, value] of Object.entries(result)) {
    expect(value, component).toMatch(/^0s(, 0s)*$/);
  }
});
