import { expect, test, type Locator, type Page } from "@playwright/test";
import { componentPage } from "./support.ts";

/** A component page's examples panel (ds-components R4.6), past its main example. */
const examples = (page: Page, name: string) =>
  page.getByRole("group", { name: `${name} examples`, exact: true });

async function durations(page: Page) {
  const duration = (locator: Locator) =>
    locator.evaluate((element) => getComputedStyle(element).transitionDuration);

  await componentPage(page, "button");
  const button = await duration(
    examples(page, "Button").getByRole("button", { name: "Primary", exact: true }),
  );
  await componentPage(page, "card");
  const card = await duration(
    examples(page, "Card").getByRole("article").filter({ hasText: "Design tokens" }),
  );
  await componentPage(page, "menu");
  const trigger = examples(page, "Menu").getByRole("button", { name: "Project actions" });
  const menu = await duration(
    page.locator(`[id="${(await trigger.getAttribute("aria-controls")) ?? ""}"]`),
  );
  const menuChevron = await duration(trigger.locator("svg").last());
  await componentPage(page, "accordion");
  const accordionTrigger = examples(page, "Accordion")
    .getByRole("button", { name: "What is this site?" })
    .first();
  const accordionPanel = await duration(
    page.locator(`[id="${(await accordionTrigger.getAttribute("aria-controls")) ?? ""}"]`),
  );
  const accordionChevron = await duration(accordionTrigger.locator("svg"));
  await componentPage(page, "tooltip");
  const tooltip = await duration(
    examples(page, "Tooltip")
      .getByRole("button", { name: "Save draft" })
      .locator("xpath=following-sibling::span[@popover][1]"),
  );
  return { button, card, menu, accordionPanel, accordionChevron, tooltip, menuChevron };
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
