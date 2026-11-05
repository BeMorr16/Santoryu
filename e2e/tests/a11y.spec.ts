import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  componentPages,
  componentPath,
  componentsPath,
} from "../../web/src/design-system/components/pages.ts";
import { contactFormContent as formContent } from "../../web/src/content/contact.ts";
import {
  componentPage,
  contactSubmit,
  example,
  fillContactForm,
  openAllAccordions,
  pages,
  setAllPanels,
  storeTheme,
  stubChallengeScript,
  stubInteractiveChallenge,
  themes,
} from "./support.ts";

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function violations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  return violations.flatMap((violation) =>
    violation.nodes.map(
      (node) => `${violation.id}: ${node.target.join(" ")} — ${node.failureSummary ?? ""}`,
    ),
  );
}

for (const theme of themes) {
  for (const path of pages) {
    test(`${path} in ${theme} has no axe violations, contrast included (R16.2)`, async ({
      page,
    }) => {
      await storeTheme(page, theme);
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      // Folded content stays covered (refinement R13.15).
      if (path.startsWith(componentsPath)) await openAllAccordions(page);

      expect(await violations(page)).toEqual([]);
    });
  }
}

test.describe("the contact form's states (contact-form R1.6)", () => {
  // Contrast is judged on settled colors: with no transitions, axe can't sample a color midway.
  test.use({ reducedMotion: "reduce" });

  const reach: Record<string, (page: Page) => Promise<unknown>> = {
    "field errors": async (page) => {
      await contactSubmit(page).click();
      await expect(page.getByText(formContent.errors.name.missing)).toBeVisible();
    },
    sending: async (page) => {
      // Never answered, so the form stays in this state.
      await page.route("**/api/contact", () => undefined);
      await fillContactForm(page);
      await contactSubmit(page).click();
      await expect(page.getByRole("button", { name: formContent.sending })).toBeVisible();
    },
    "waiting for the visitor": async (page) => {
      await page.unroute("https://challenges.cloudflare.com/**");
      await stubInteractiveChallenge(page);
      await page.route("**/api/contact", (route) => route.fulfill({ status: 204 }));
      await fillContactForm(page);
      await contactSubmit(page).click();
      await expect(page.getByRole("checkbox", { name: "Verify you are human" })).toBeVisible();
    },
    "send failed": async (page) => {
      await page.route("**/api/contact", (route) =>
        route.fulfill({ status: 503, json: { error: "unavailable" } }),
      );
      await fillContactForm(page);
      await contactSubmit(page).click();
      await expect(page.getByRole("alert")).toBeVisible();
    },
    sent: async (page) => {
      await page.route("**/api/contact", (route) => route.fulfill({ status: 204 }));
      await fillContactForm(page);
      await contactSubmit(page).click();
      await expect(page.getByRole("heading", { name: formContent.successHeading })).toBeVisible();
    },
  };

  for (const theme of themes) {
    for (const [state, arrive] of Object.entries(reach)) {
      test(`in ${theme}, ${state}, has no axe violations`, async ({ page }) => {
        await storeTheme(page, theme);
        await stubChallengeScript(page);
        await page.goto("/contact");
        await expect(contactSubmit(page)).toBeEnabled();

        await arrive(page);

        expect(await violations(page)).toEqual([]);
      });
    }
  }
});

test.describe("preview panels", () => {
  // Contrast is judged on settled colors: with no transitions, axe can't sample a color midway.
  test.use({ reducedMotion: "reduce" });

  for (const { id } of componentPages) {
    for (const [pageTheme, panelTheme] of [
      ["dark", "Light"],
      ["light", "Dark"],
    ] as const) {
      test(`${componentPath(id)} with both panels set to ${panelTheme} in a ${pageTheme} page has no axe violations (R16.3)`, async ({
        page,
      }) => {
        await storeTheme(page, pageTheme);
        await page.goto(componentPath(id));

        // The main example's panel and the other examples' panel (ds-components R4.4, R4.6).
        expect(await setAllPanels(page, panelTheme)).toBe(2);
        await expect(
          page.locator(`[data-theme="${panelTheme.toLowerCase()}"][role="group"]`),
        ).toHaveCount(2);
        await openAllAccordions(page);

        expect(await violations(page)).toEqual([]);
      });
    }
  }
});

for (const theme of themes) {
  test(`${componentPath("tooltip")} in ${theme} with a tooltip open has no axe violations (refinement R14.15)`, async ({
    page,
  }) => {
    await storeTheme(page, theme);
    const controlled = example(await componentPage(page, "tooltip"), "Controlled");
    await controlled.getByRole("button", { name: "Show", exact: true }).click();
    const popup = controlled.locator("[popover]");
    // Judged once faded in: axe can't sample a color midway.
    await expect(popup).toHaveCSS("opacity", "1");

    expect(await violations(page)).toEqual([]);
  });
}
