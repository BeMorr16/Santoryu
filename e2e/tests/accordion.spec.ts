import { expect, test, type Locator, type Page } from "@playwright/test";
import { example, probe, section, tabKey } from "./support.ts";

const accordion = (page: Page) => section(page, "Accordion");

/** An item's heading button, by its text, in an example of the Accordion section. */
const trigger = (page: Page, title: string, name: string) =>
  example(accordion(page), title).getByRole("button", { name, exact: true });

/** The panel a heading button controls. */
async function panelOf(page: Page, button: Locator) {
  return page.locator(`[id="${(await button.getAttribute("aria-controls")) ?? ""}"]`);
}

/** The item root: the heading's parent, which draws the lines. */
const itemOf = (button: Locator) => button.locator("xpath=../..");

/** Waits until no transition runs anywhere on the page. */
const settled = (page: Page) =>
  page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running"),
  );

/**
 * Presses the button, then pauses the panel's height transition halfway and reads the panel's
 * height, whether it's hidden, and the clip's overflow, before letting it finish.
 */
async function pressAndSampleMidway(button: Locator, panel: Locator) {
  const handle = await button.elementHandle();
  return panel.evaluate(async (element, pressed) => {
    (pressed as HTMLElement | null)?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const [animation] = element.getAnimations();
    if (!animation) return null;
    animation.pause();
    animation.currentTime = Number(animation.effect?.getComputedTiming().duration) / 2;
    const clip = element.firstElementChild;
    const sample = {
      height: element.getBoundingClientRect().height,
      hidden: element.hasAttribute("hidden"),
      overflow: clip ? getComputedStyle(clip).overflowY : "",
    };
    animation.play();
    return sample;
  }, handle);
}

test.describe("Accordion (refinement R13)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/lab/components#accordion");
  });

  test("Tab reaches the buttons, Enter and Space toggle, and arrow keys scroll the page (R13.6)", async ({
    page,
    browserName,
  }) => {
    const first = trigger(page, "Exclusive", "What is this site?");
    const second = trigger(page, "Exclusive", "How is it built?");
    await first.focus();
    await page.evaluate(() => {
      addEventListener("keydown", (event) => {
        document.documentElement.dataset.lastKeyPrevented = String(event.defaultPrevented);
      });
    });

    // Nothing handles the arrow: it reaches the page unprevented, and the browser scrolls.
    const before = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("html")).toHaveAttribute("data-last-key-prevented", "false");
    // Under Playwright, WebKit drops some keyboard scrolls (about a third, with no handler on the
    // page and the event unprevented), so only Chromium checks the scroll itself.
    if (browserName === "chromium") {
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
    }
    await expect(first).toBeFocused();
    await expect(first).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Space");
    await expect(first).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press(tabKey(browserName));
    await expect(second).toBeFocused();
    await page.keyboard.press(tabKey(browserName, true));
    await expect(first).toBeFocused();
  });

  test("skips a closed panel's content on Tab and enters an open one (R13.6, R13.7)", async ({
    page,
    browserName,
  }) => {
    const reference = accordion(page);
    const props = reference.getByRole("button", { name: "Props", exact: true });
    const tokens = reference.getByRole("button", { name: "Component tokens", exact: true });
    const panel = await panelOf(page, props);

    await props.focus();
    await page.keyboard.press(tabKey(browserName));
    await expect(tokens).toBeFocused();

    await props.click();
    await settled(page);
    await props.focus();
    await page.keyboard.press(tabKey(browserName));
    await expect(panel.locator(":focus")).toHaveCount(1);
  });

  test("a link to a closed panel's content opens its item and shows the target (R13.7)", async ({
    page,
  }) => {
    const button = trigger(page, "Find in page", "A hidden answer");
    const panel = await panelOf(page, button);
    await expect(panel).toHaveAttribute("hidden", "until-found");

    // Fragment navigation runs the same beforematch reveal as find-in-page, which Playwright can't drive.
    await page.evaluate(() => {
      location.hash = "accordion-find-word";
    });

    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(panel).not.toHaveAttribute("hidden");
    await expect(page.locator("#accordion-find-word")).toBeInViewport();
  });

  test("opens at once on a reveal, then animates the next outside change (R13.7, R13.8)", async ({
    page,
  }) => {
    const scope = example(accordion(page), "Controlled");
    const button = scope.getByRole("button", { name: "Shipping details", exact: true });
    const outside = scope.getByRole("button", { name: "Open", exact: true });
    const panel = await panelOf(page, button);
    await expect(panel).toHaveAttribute("hidden", "until-found");
    await button.scrollIntoViewIfNeeded();

    // The reveal path a find-in-page match takes, with the transition off.
    const reveal = await panel.evaluate((element) => {
      element.dispatchEvent(new Event("beforematch"));
      return {
        animations: element.getAnimations().length,
        height: element.getBoundingClientRect().height,
        content: element.firstElementChild?.scrollHeight ?? 0,
      };
    });
    await expect(button).toHaveAttribute("aria-expanded", "true");
    expect(reveal.animations).toBe(0);
    expect(reveal.height).toBeCloseTo(reveal.content, 0);

    const close = scope.getByRole("button", { name: "Close", exact: true });
    await expect(outside).toHaveCount(0);
    const closing = await pressAndSampleMidway(close, panel);
    expect(closing).not.toBeNull();
    expect(closing?.height).toBeGreaterThan(0);
    expect(closing?.height).toBeLessThan(reveal.height);
    await settled(page);
    await expect(panel).toHaveAttribute("hidden", "until-found");
  });

  test("animates the panel's height, hides it only once closed, and clips only while moving (R13.8)", async ({
    page,
  }) => {
    const button = trigger(page, "Independent items", "How is it built?");
    const panel = await panelOf(page, button);
    const clip = panel.locator(":scope > div");
    const body = clip.locator(":scope > div");
    await button.scrollIntoViewIfNeeded();

    const opening = await pressAndSampleMidway(button, panel);
    await settled(page);
    const open = (await panel.boundingBox())?.height ?? 0;
    expect(open).toBeGreaterThan(0);
    expect(open).toBeCloseTo((await body.boundingBox())?.height ?? -1, 0);
    expect(opening).not.toBeNull();
    expect(opening?.height).toBeGreaterThan(0);
    expect(opening?.height).toBeLessThan(open);
    expect(opening?.overflow).toBe("hidden");
    await expect(clip).toHaveCSS("overflow-y", "visible");
    await expect(button).toHaveCSS("cursor", "pointer");

    const closing = await pressAndSampleMidway(button, panel);
    expect(closing?.height).toBeGreaterThan(0);
    expect(closing?.height).toBeLessThan(open);
    expect(closing?.hidden).toBe(false);
    expect(closing?.overflow).toBe("hidden");
    await settled(page);
    await expect(panel).toHaveAttribute("hidden", "until-found");
    expect((await panel.boundingBox())?.height ?? 0).toBe(0);
  });

  test("turns the chevron while open (R13.8)", async ({ page }) => {
    const button = trigger(page, "Independent items", "What is this site?");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(button.locator("svg")).toHaveCSS("rotate", "180deg");

    await button.click();
    await expect(button.locator("svg")).toHaveCSS("rotate", "none");
  });

  test("draws the lines from its tokens, above each item and below the last (R13.10)", async ({
    page,
  }) => {
    const scope = example(accordion(page), "Independent items");
    const buttons = scope.getByRole("button");
    const color = await probe(scope, "color", "var(--component-accordion-border)");
    const width = await probe(
      scope,
      "padding-inline-start",
      "var(--component-accordion-border-width)",
    );

    for (const index of [0, 1, 2]) {
      const item = itemOf(buttons.nth(index));
      await expect(item).toHaveCSS("border-top-color", color);
      await expect(item).toHaveCSS("border-top-width", width);
      await expect(item).toHaveCSS("border-top-style", "solid");
      await expect(item).toHaveCSS("border-bottom-style", index === 2 ? "solid" : "none");
    }
    await expect(itemOf(buttons.nth(2))).toHaveCSS("border-bottom-color", color);
  });

  test("spans the full width, text at the start and chevron at the end, content aligned with the text (R13.10)", async ({
    page,
  }) => {
    const scope = example(accordion(page), "Independent items");
    const button = trigger(page, "Independent items", "What is this site?");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const panel = await panelOf(page, button);
    const padding = async (token: string) =>
      Number.parseFloat(await probe(scope, "padding-inline-start", `var(${token})`));
    const triggerPadding = await padding("--component-accordion-trigger-padding-inline");
    const panelPadding = await padding("--component-accordion-panel-padding-inline");
    const panelEnd = await padding("--component-accordion-panel-padding-block-end");

    const box = await button.evaluate(
      (element, body) => {
        const rect = (node: Element | null | undefined) => node?.getBoundingClientRect();
        const range = document.createRange();
        const label = element.firstElementChild;
        if (label) range.selectNodeContents(label);
        const paragraph = body.querySelector("p");
        const text = document.createRange();
        if (paragraph) text.selectNodeContents(paragraph);
        return {
          item: rect(element.parentElement?.parentElement),
          button: rect(element),
          label: range.getBoundingClientRect(),
          chevron: rect(element.querySelector("svg")),
          text: text.getBoundingClientRect(),
          body: rect(body),
          paragraph: rect(paragraph),
        };
      },
      await panel.locator(":scope > div > div").elementHandle(),
    );

    expect(box.button?.width).toBeCloseTo(box.item?.width ?? -1, 0);
    expect(box.label.left - (box.button?.left ?? 0)).toBeCloseTo(triggerPadding, 0);
    expect((box.button?.right ?? 0) - (box.chevron?.right ?? 0)).toBeCloseTo(triggerPadding, 0);
    expect(box.text.left - (box.body?.left ?? 0)).toBeCloseTo(panelPadding, 0);
    expect(box.text.left).toBeCloseTo(box.label.left, 0);
    expect((box.body?.bottom ?? 0) - (box.paragraph?.bottom ?? 0)).toBeCloseTo(panelEnd, 0);
  });

  test("shows the hover background and an inset focus ring (R13.10, R13.11)", async ({
    page,
    browserName,
  }) => {
    const scope = example(accordion(page), "Exclusive");
    const first = trigger(page, "Exclusive", "What is this site?");
    const second = trigger(page, "Exclusive", "How is it built?");

    await first.hover();
    await expect(first).toHaveCSS(
      "background-color",
      await probe(scope, "background-color", "var(--component-accordion-trigger-background-hover)"),
    );
    await page.mouse.move(0, 0);
    await expect(first).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

    await first.focus();
    await page.keyboard.press(tabKey(browserName));
    await expect(second).toBeFocused();
    await expect(second).toHaveCSS(
      "outline-color",
      await probe(scope, "color", "var(--component-accordion-focus-ring-color)"),
    );
    const ring = await second.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        style: style.outlineStyle,
        width: Number.parseFloat(style.outlineWidth),
        offset: Number.parseFloat(style.outlineOffset),
      };
    });
    expect(ring.style).toBe("solid");
    expect(ring.width).toBeGreaterThan(0);
    expect(ring.offset).toBe(-ring.width);
  });

  test("keeps the lines and focus ring and drops the hover background under forced colors (R13.12)", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "WebKit doesn't emulate forced colors.");
    await page.emulateMedia({ forcedColors: "active" });
    const first = trigger(page, "Exclusive", "What is this site?");
    const second = trigger(page, "Exclusive", "How is it built?");

    await expect(itemOf(first)).toHaveCSS("border-top-style", "solid");
    await expect(first.locator("svg")).toHaveCSS(
      "fill",
      await first.evaluate((element) => getComputedStyle(element).color),
    );
    await first.hover();
    // Forced colors keeps it transparent but may rewrite its RGB.
    await expect(first).toHaveCSS("background-color", /^rgba\(\d+, \d+, \d+, 0\)$/);

    await first.focus();
    await page.keyboard.press(tabKey(browserName));
    await expect(second).toBeFocused();
    await expect(second).toHaveCSS("outline-style", "solid");
    await expect(second).not.toHaveCSS("outline-width", "0px");
  });

  test("folds every section's Props, Component tokens and Accessibility, closed on load (R13.14)", async ({
    page,
  }) => {
    const sections = page.locator("main section[id]");
    const count = await sections.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index++) {
      const buttons = sections.nth(index).locator("h3 > button");
      await expect(buttons).toHaveText(["Props", "Component tokens", "Accessibility"]);
      for (const button of await buttons.all()) {
        await expect(button).toHaveAttribute("aria-expanded", "false");
        await expect(await panelOf(page, button)).toHaveAttribute("hidden", "until-found");
      }
    }
  });
});

test.describe("Accordion on a touch screen (refinement R13.10)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Touch emulation is Chromium-only.");
  test.use({ hasTouch: true, isMobile: true });

  test("shows no hover background after a tap", async ({ page }) => {
    await page.goto("/lab/components#accordion");
    expect(await page.evaluate(() => matchMedia("(hover: hover)").matches)).toBe(false);
    const button = trigger(page, "Exclusive", "What is this site?");

    await button.tap();

    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(button).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  });
});

test.describe("Accordion at 320px wide (refinement R13.8)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("lets a wide table in an open panel scroll inside its region, not the page", async ({
    page,
  }) => {
    await page.goto("/lab/components#button");
    const button = section(page, "Button").getByRole("button", {
      name: "Component tokens",
      exact: true,
    });
    await button.click();
    await settled(page);

    const region = section(page, "Button").getByRole("region", {
      name: "Button component tokens",
    });
    const sizes = await region.evaluate((element) => ({
      right: element.getBoundingClientRect().right,
      scrolls: element.scrollWidth > element.clientWidth,
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(sizes.right).toBeLessThanOrEqual(320);
    expect(sizes.scrolls).toBe(true);
    expect(sizes.page).toBeLessThanOrEqual(0);
  });
});

test("doesn't animate an item open on the first render (R13.8)", async ({ page }) => {
  await page.addInitScript(() => {
    const runs: string[] = [];
    Object.assign(window, { accordionRuns: runs });
    document.addEventListener("transitionrun", (event) => {
      if (["grid-template-rows", "rotate"].includes(event.propertyName)) {
        runs.push(event.propertyName);
      }
    });
  });
  await page.goto("/lab/components#accordion");
  const button = trigger(page, "Independent items", "What is this site?");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(
    await panelOf(page, trigger(page, "Independent items", "How is it built?")),
  ).toHaveAttribute("hidden", "until-found");
  await settled(page);

  expect(
    await page.evaluate(() => (window as unknown as { accordionRuns: string[] }).accordionRuns),
  ).toEqual([]);
  // The check can see a run: one press starts both transitions.
  await button.click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { accordionRuns: string[] }).accordionRuns),
    )
    .toEqual(expect.arrayContaining(["grid-template-rows", "rotate"]));
});
