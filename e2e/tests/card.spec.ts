import { expect, test, type Locator, type Page } from "@playwright/test";
import { example, probe, section, tabKey } from "./support.ts";

/** A card's parts: its heading and the divs that follow it (body, then footer). */
const parts = (card: Locator) =>
  card.evaluate((element) =>
    [...element.children].map((child) => {
      const { top, bottom } = child.getBoundingClientRect();
      return { top, bottom };
    }),
  );

/** Moves the mouse to the middle of `target`, whatever element is on top there. */
async function pointAt(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (box === null) throw new Error("target is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

const gapProbe = async (scope: Locator) =>
  Number.parseFloat(await probe(scope, "padding-block-end", "var(--component-card-gap)"));

test.describe("Card (refinement R8)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/lab/components#card");
  });

  test("spaces its parts by the gap token (R8.1)", async ({ page }) => {
    const card = example(section(page, "Card"), "Parts").getByRole("article");
    const gap = Number.parseFloat(await probe(card, "padding-block-end", "var(--space-stack-sm)"));

    const [heading, body, footer] = await parts(card);
    expect(gap).toBeGreaterThan(0);
    expect(Math.abs((body?.top ?? 0) - (heading?.bottom ?? 0) - gap)).toBeLessThanOrEqual(1);
    expect(Math.abs((footer?.top ?? 0) - (body?.bottom ?? 0) - gap)).toBeLessThanOrEqual(1);
  });

  test("puts footers at the card's bottom edge, so they line up across a row (R8.2)", async ({
    page,
  }) => {
    const cards = example(section(page, "Card"), "Footers line up").getByRole("listitem");
    await expect(cards).toHaveCount(3);

    const bottoms: number[] = [];
    for (const card of await cards.all()) {
      const { footer, inner } = await card.evaluate((element) => {
        const style = getComputedStyle(element);
        const footer = element.lastElementChild?.getBoundingClientRect().bottom ?? 0;
        const inner =
          element.getBoundingClientRect().bottom -
          Number.parseFloat(style.borderBlockEndWidth) -
          Number.parseFloat(style.paddingBlockEnd);
        return { footer, inner };
      });
      expect(Math.abs(footer - inner)).toBeLessThanOrEqual(1);
      bottoms.push(footer);
    }
    expect(Math.max(...bottoms) - Math.min(...bottoms)).toBeLessThanOrEqual(1);
  });

  test("lines up headings, bodies and footers across a row with subgrid (R8.3)", async ({
    page,
  }) => {
    const list = example(section(page, "Card"), "Subgrid").getByRole("list");
    const cards = list.getByRole("listitem");
    await expect(cards).toHaveCount(3);
    const gap = await gapProbe(list);

    const all = await Promise.all(
      (await cards.all()).map((card) =>
        card.evaluate((element) => {
          const [heading, body, footer] = [...element.children].map((child) =>
            child.getBoundingClientRect(),
          );
          const title = element.firstElementChild;
          if (title === null || !heading || !body || !footer) throw new Error("missing parts");
          // Under subgrid every heading stretches to the row, so count its text's lines instead.
          const range = document.createRange();
          range.selectNodeContents(title);
          const lines = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
          return {
            headingTop: heading.top,
            lines: lines.size,
            lineHeight: Number.parseFloat(getComputedStyle(title).lineHeight),
            bodyTop: body.top,
            footerTop: footer.top,
          };
        }),
      ),
    );
    for (const key of ["bodyTop", "footerTop"] as const) {
      const values = all.map((card) => card[key]);
      expect(Math.max(...values) - Math.min(...values), key).toBeLessThanOrEqual(1);
    }
    // The wrapping heading sets the heading row's height, and is gap above its body.
    const lines = all.map((card) => card.lines);
    expect(Math.max(...lines)).toBeGreaterThan(Math.min(...lines));
    const wrapping = all[lines.indexOf(Math.max(...lines))];
    if (wrapping === undefined) throw new Error("no wrapping heading");
    const headingBottom = wrapping.headingTop + wrapping.lines * wrapping.lineHeight;
    expect(Math.abs(wrapping.bodyTop - headingBottom - gap)).toBeLessThanOrEqual(1);
  });

  test("gives the heading the same size at every level (R8.4)", async ({ page }) => {
    const scope = example(section(page, "Card"), "Any heading level");
    const size = await probe(scope, "font-size", "var(--type-size-lead)");

    const headings = scope.getByRole("heading");
    await expect(headings).toHaveCount(2);
    for (const heading of await headings.all()) {
      await expect(heading).toHaveCSS("font-size", size);
    }
  });

  test("takes each variant's surface from its own tokens (R8.5, R8.6)", async ({ page }) => {
    const scope = example(section(page, "Card"), "Variants");

    for (const variant of ["raised", "outlined", "flat", "glass"]) {
      const card = scope.getByRole("article").filter({
        has: page.getByRole("link", { name: variant, exact: false }),
      });
      const token = (name: string) => `var(--component-card-${variant}-${name})`;
      await expect(card).toHaveCSS(
        "background-color",
        await probe(card, "background-color", token("background")),
      );
      await expect(card).toHaveCSS(
        "border-top-color",
        await probe(card, "border-top-color", token("border")),
      );
      await expect(card).toHaveCSS(
        "box-shadow",
        await probe(card, "box-shadow", token("elevation")),
      );
    }

    const glass = scope
      .getByRole("article")
      .filter({ has: page.getByRole("link", { name: "Glass" }) });
    await expect(glass).toHaveCSS(
      "backdrop-filter",
      await probe(glass, "backdrop-filter", "blur(var(--component-card-glass-backdrop-blur))"),
    );
  });

  test("shows the hover look over the link's area only, not over a nested control (R8.9)", async ({
    page,
  }) => {
    // No transition, so the at-rest check can't pass by reading the start of one.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const scope = example(section(page, "Card"), "Linked, with a nested control");
    const linked = scope.getByRole("article").filter({ hasText: "Design tokens" });
    const nested = scope.getByRole("article").filter({ hasText: "Source on GitHub" });
    const hover = await probe(
      linked,
      "border-top-color",
      "var(--component-card-raised-border-hover)",
    );
    const rest = await probe(nested, "border-top-color", "var(--component-card-raised-border)");
    expect(hover).not.toBe(rest);

    // The mouse goes where the text is: the link's overlay, not the text, is what it lands on.
    await pointAt(page, linked.getByText("Every color, size and motion value"));
    await expect(linked).toHaveCSS("border-top-color", hover);

    await nested.getByRole("button", { name: "Star (example)" }).hover();
    await expect(nested).toHaveCSS("border-top-color", rest);
  });

  test("keeps the heading link in the heading's look, even when current and hovered (R8.10)", async ({
    page,
  }) => {
    const card = example(section(page, "Card"), "Linked, with a nested control")
      .getByRole("article")
      .filter({ hasText: "Design tokens" });
    const heading = card.getByRole("heading");
    const link = card.getByRole("link", { name: "Design tokens" });

    await link.evaluate((element) => {
      element.setAttribute("aria-current", "page");
    });
    await link.hover();

    const look = (element: Element) => {
      const style = getComputedStyle(element);
      return {
        color: style.color,
        weight: style.fontWeight,
        decoration: style.textDecorationLine,
      };
    };
    const headingLook = await heading.evaluate(look);
    await expect.poll(() => link.evaluate(look)).toEqual({ ...headingLook, decoration: "none" });
  });

  test("draws the focus ring around the card, not the heading link (R10.4)", async ({
    page,
    browserName,
  }) => {
    const card = example(section(page, "Card"), "Linked, with a nested control")
      .getByRole("article")
      .filter({ hasText: "Design tokens" });
    const link = card.getByRole("link", { name: "Design tokens" });

    // Focus from the keyboard, so :focus-visible matches.
    await link.focus();
    await page.keyboard.press(tabKey(browserName, true));
    await page.keyboard.press(tabKey(browserName));
    await expect(link).toBeFocused();

    await expect(card).toHaveCSS("outline-style", "solid");
    await expect(link).toHaveCSS("outline-style", "none");
  });

  test("stacks nested controls above the overlay with layer.raised (R8.12)", async ({ page }) => {
    const button = example(section(page, "Card"), "Linked, with a nested control").getByRole(
      "button",
      { name: "Star (example)" },
    );
    const layer = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--layer-raised").trim(),
    );

    expect(layer).not.toBe("");
    await expect(button).toHaveCSS("z-index", layer);
  });
});
