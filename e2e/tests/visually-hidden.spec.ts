import { expect, test, type Locator } from "@playwright/test";
import { section, tabKey, tokenColor } from "./support.ts";

/** The element's box in page coordinates, so scrolling to a focused element doesn't move it. */
async function pageBox(locator: Locator) {
  return locator.evaluate((element) => {
    const { left, top, width, height } = element.getBoundingClientRect();
    return { left, top: top + window.scrollY, width, height };
  });
}

test.describe("VisuallyHidden (refinement R2)", () => {
  test("clips hidden content to a 1×1px box (R2.1)", async ({ page }) => {
    await page.goto("/lab/components#visually-hidden");

    const hidden = section(page, "VisuallyHidden").getByText("Mark as done", {
      exact: true,
    });
    const box = await pageBox(hidden);
    expect([box.width, box.height]).toEqual([1, 1]);
    expect(await hidden.evaluate((element) => getComputedStyle(element).clipPath)).toBe(
      "inset(50%)",
    );
  });

  test("resets an element's own margin, so a hidden heading adds no height (R2.1)", async ({
    page,
  }) => {
    await page.goto("/lab/components#visually-hidden");

    // A heading has user-agent block margins, which the hidden rule replaces with -1px.
    const heading = section(page, "VisuallyHidden").getByRole("heading", {
      name: "Projects",
      level: 4,
    });
    const margins = await heading.evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.marginBlockStart, style.marginBlockEnd];
    });
    expect(margins).toEqual(["-1px", "-1px"]);
  });

  test("reveals a focused skip link as an overlay that moves no other content (R2.2)", async ({
    page,
    browserName,
  }) => {
    await page.goto("/lab/components#visually-hidden");
    const lab = section(page, "VisuallyHidden");
    const skipLink = lab.getByRole("link", { name: "Skip to the VisuallyHidden section" });
    const next = lab.getByText("Focusable wrapper", { exact: true });
    const before = await pageBox(next);

    // The search example's button comes right before the skip link.
    await lab.getByRole("button", { name: "Search", exact: true }).focus();
    await page.keyboard.press(tabKey(browserName));

    await expect(skipLink).toBeFocused();
    const revealed = await pageBox(skipLink);
    expect(revealed.width).toBeGreaterThan(1);
    expect(revealed.height).toBeGreaterThan(1);
    expect(await pageBox(next)).toEqual(before);
  });

  test("shows the shell's skip link above the sticky header on the first Tab (R2.7)", async ({
    page,
    browserName,
  }) => {
    await page.goto("/");

    await page.keyboard.press(tabKey(browserName));

    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeFocused();
    const box = await skipLink.boundingBox();
    if (box === null) throw new Error("the skip link has no box");
    expect(box.width).toBeGreaterThan(1);
    expect(box.height).toBeGreaterThan(1);
    const onTop = await skipLink.evaluate(
      (link, { x, y }) => {
        const hit = document.elementFromPoint(x, y);
        return hit !== null && link.contains(hit);
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );
    expect(onTop).toBe(true);
  });

  test("shows every example's hidden content while the toggle is pressed (R2.10)", async ({
    page,
  }) => {
    await page.goto("/lab/components#visually-hidden");
    const lab = section(page, "VisuallyHidden");
    const hidden = [
      lab.getByText("Mark as done", { exact: true }),
      lab.getByText("about tokens", { exact: true }),
      lab.getByRole("heading", { name: "Projects", level: 4 }),
      lab.getByText("Search the lab", { exact: true }),
      lab.getByRole("link", { name: "Skip to the VisuallyHidden section" }),
      lab.getByRole("link", { name: "Back to the section top" }).locator(".."),
    ];
    for (const element of hidden) {
      const { width, height } = await pageBox(element);
      expect([width, height]).toEqual([1, 1]);
    }
    const panel = lab.getByRole("group", { name: "VisuallyHidden examples" });
    // The toggle's own pressed state is the one expected difference.
    const tree = async () => (await panel.ariaSnapshot()).replace(/ \[pressed\]/g, "");
    const before = await tree();

    const toggle = lab.getByRole("button", { name: "Show hidden content" });
    await toggle.click();

    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(await tree()).toBe(before);
    for (const element of hidden) {
      const { width, height } = await pageBox(element);
      expect(width).toBeGreaterThan(1);
      expect(height).toBeGreaterThan(1);
    }
  });

  test("keeps the focus ring on a revealed skip link while the toggle is pressed (R2.10, WCAG 2.4.7)", async ({
    page,
    browserName,
  }) => {
    await page.goto("/lab/components#visually-hidden");
    const lab = section(page, "VisuallyHidden");
    await lab.getByRole("button", { name: "Show hidden content" }).click();

    await lab.getByRole("button", { name: "Search", exact: true }).focus();
    await page.keyboard.press(tabKey(browserName));

    const skipLink = lab.getByRole("link", { name: "Skip to the VisuallyHidden section" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveCSS("outline-style", "solid");
    await expect(skipLink).toHaveCSS("outline-color", tokenColor("color.focus.ring", "light"));
  });
});
