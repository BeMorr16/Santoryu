import { componentPath } from "../../web/src/design-system/components/pages.ts";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { example, main, probe, storeTheme, tabKey, themes, tokenColor } from "./support.ts";

const codeBlocks = (page: Page) => main(page);

/** The registry's check icon, as the Tooltip page's "Mark as done" button shows it; back on CodeBlock's page after. */
async function checkIconSvg(page: Page) {
  await page.goto(componentPath("tooltip"));
  const svg = await main(page)
    .getByRole("button", { name: "Mark as done" })
    .locator("svg")
    .innerHTML();
  await page.goto(componentPath("code-block"));
  return svg;
}

/** The blocks of an example in the CodeBlock section, by the example's title. */
const blocksIn = (page: Page, title: string) =>
  example(codeBlocks(page), title).locator("pre").locator("xpath=..");

const preOf = (block: Locator) => block.locator("pre");

/** Whether the element's content is wider than its box. */
const overflows = (element: Locator) =>
  element.evaluate((node) => node.scrollWidth > node.clientWidth);

test.describe("CodeBlock (refinement R15)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(componentPath("code-block"));
  });

  test("long lines scroll inside the block, never the page, at 320px (R15.4)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });

    for (const block of await blocksIn(page, "Long lines").all()) {
      expect(await overflows(preOf(block))).toBe(true);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });

  test("an overflowing block is a focusable group named by its label, and one that fits isn't (R15.5)", async ({
    page,
    browserName,
  }) => {
    // First the block that fits: once it has lost its prerendered Tab stop, blocks are measured.
    const basic = preOf(blocksIn(page, "Basic"));
    expect(await overflows(basic)).toBe(false);
    await expect(basic).not.toHaveAttribute("tabindex");
    await expect(basic).not.toHaveAttribute("role");
    const long = example(codeBlocks(page), "Long lines");
    for (const name of ["Terminal", "TypeScript"]) {
      const group = long.getByRole("group", { name, exact: true });
      await expect(group).toHaveAttribute("tabindex", "0");
      expect(await overflows(group)).toBe(true);
      expect(await group.evaluate((node) => node.tagName)).toBe("PRE");
    }

    // Tab reaches the copy button, then the code; Shift+Tab goes back.
    const terminal = blocksIn(page, "Long lines").first();
    const copy = terminal.getByRole("button", { name: "Copy code" });
    await copy.focus();
    await page.keyboard.press(tabKey(browserName));
    await expect(preOf(terminal)).toBeFocused();
    await page.keyboard.press(tabKey(browserName, true));
    await expect(copy).toBeFocused();
  });

  test("a block gains its Tab stop when the window narrows and drops it when it widens (R15.5)", async ({
    page,
  }) => {
    const basic = preOf(blocksIn(page, "Basic"));
    await expect(basic).not.toHaveAttribute("tabindex");

    await page.setViewportSize({ width: 320, height: 640 });
    await expect(basic).toHaveAttribute("tabindex", "0");
    expect(await overflows(basic)).toBe(true);

    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(basic).not.toHaveAttribute("tabindex");
  });

  test("arrow keys scroll the focused code (R15.5)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Playwright's WebKit drops keyboard scrolls.");
    const pre = preOf(blocksIn(page, "Long lines").first());
    await pre.focus();

    await page.keyboard.press("ArrowRight");

    await expect.poll(() => pre.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  });

  test("wrapped blocks wrap their lines and are never a Tab stop (R15.4)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });

    for (const block of await blocksIn(page, "Wrapped").all()) {
      const pre = preOf(block);
      expect(await overflows(pre)).toBe(false);
      await expect(pre).not.toHaveAttribute("tabindex");
      expect(await pre.evaluate((node) => node.getClientRects()[0]?.height ?? 0)).toBeGreaterThan(
        await pre.evaluate((node) => Number.parseFloat(getComputedStyle(node).lineHeight) * 2),
      );
    }
  });

  test("copy writes the code, shows a check and says Copied, then resets (R15.6)", async ({
    page,
    context,
    browserName,
  }) => {
    const checkIcon = await checkIconSvg(page);
    if (browserName === "chromium") {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    }
    const block = blocksIn(page, "Basic");
    const button = block.getByRole("button", { name: "Copy code" });
    const status = block.getByRole("status");
    const icon = () => button.locator("svg").innerHTML();
    const copyIcon = await icon();
    await expect(status).toBeEmpty();

    await button.click();

    await expect(status).toHaveText("Copied");
    expect(await icon()).toBe(checkIcon);
    await expect(button).toHaveAccessibleName("Copy code");
    if (browserName === "chromium") {
      const code = await block.locator("code").textContent();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
    }
    await expect(status).toBeEmpty({ timeout: 4000 });
    expect(await icon()).toBe(copyIcon);
  });

  test("a refused copy shows and says Couldn't copy with a warning icon, then resets (R15.6)", async ({
    page,
  }) => {
    const checkIcon = await checkIconSvg(page);
    // The clipboard is the system boundary: make it refuse.
    await page.evaluate(() => {
      navigator.clipboard.writeText = () =>
        Promise.reject(new DOMException("Refused for the test", "NotAllowedError"));
    });
    const block = blocksIn(page, "Basic");
    const button = block.getByRole("button", { name: "Copy code" });
    const icon = () => button.locator("svg").innerHTML();
    const copyIcon = await icon();

    await button.click();

    await expect(block.getByRole("status")).toHaveText("Couldn't copy");
    const shown = block.locator('[aria-hidden="true"]', { hasText: "Couldn't copy" });
    await expect(shown).toBeVisible();
    await expect(shown).toHaveCSS("color", tokenColor("color.error.text", "light"));
    expect(await icon()).not.toBe(copyIcon);
    expect(await icon()).not.toBe(checkIcon);
    await expect(shown).toBeHidden({ timeout: 4000 });
    expect(await icon()).toBe(copyIcon);
  });

  test("numbers each line in a gutter that stays put while the code scrolls (R15.12)", async ({
    page,
  }) => {
    const typescript = blocksIn(page, "Long lines").nth(1);
    const pre = preOf(typescript);
    // The clips are viewport coordinates, so the block must be on screen.
    await pre.scrollIntoViewIfNeeded();
    const numbers = await pre.evaluate((node) =>
      [...node.querySelectorAll("code > span")].map(
        (line) => getComputedStyle(line, "::before").content,
      ),
    );
    // Chromium and WebKit report the counter as specified, with its empty alternative text.
    expect(numbers).toHaveLength(3);
    for (const content of numbers) expect(content).toMatch(/counter\(line\)/);
    // Scripts can't read a counter's value, so compare what each gutter draws: 1, 2 and 3 differ.
    const gutters = await pre.evaluate((node) =>
      [...node.querySelectorAll("code > span > span")].map((text) => {
        const row = text.getBoundingClientRect();
        const left = node.getBoundingClientRect().left;
        return { x: left, y: row.top, width: row.left - left, height: row.height };
      }),
    );
    const shots = await Promise.all(
      gutters.map(async (clip) => (await page.screenshot({ clip })).toString("base64")),
    );
    expect(new Set(shots).size).toBe(3);
    await expect(
      preOf(example(codeBlocks(page), "Without line numbers").locator("pre").locator("xpath=..")),
    ).not.toHaveClass(/numbered/);

    // At the gutter, a hit test finds the number's line, never code text scrolled under it.
    const atGutter = () =>
      pre.evaluate((node) => {
        const box = node.getBoundingClientRect();
        const row = node.querySelector("code > span > span")?.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + 4, (row?.top ?? box.top) + 4);
        return { inPre: node.contains(hit), onText: Boolean(hit?.closest("code > span > span")) };
      });
    expect(await atGutter()).toEqual({ inPre: true, onText: false });
    await pre.evaluate((node) => {
      node.scrollLeft = 200;
    });
    expect(await pre.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
    expect(await atGutter()).toEqual({ inPre: true, onText: false });
  });

  test("leaves the numbers out of the selection and the accessible text (R15.12)", async ({
    page,
  }) => {
    const pre = preOf(blocksIn(page, "Basic"));
    const code = (await pre.locator("code").textContent()) ?? "";

    const selected = await pre.evaluate((node) => {
      const selection = window.getSelection();
      selection?.selectAllChildren(node);
      return selection?.toString() ?? "";
    });
    expect(selected.trim()).toBe(code.trim());
    expect(selected).not.toMatch(/^\s*1/);

    const snapshot = await pre.ariaSnapshot();
    expect(snapshot).toContain(".card {");
    expect(snapshot).not.toMatch(/\b1\s*\.card/);
  });

  test("a wrapped line keeps one number, on its first row (R15.12)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const pre = preOf(blocksIn(page, "Wrapped").nth(1));

    const rows = await pre.evaluate((node) =>
      [...node.querySelectorAll("code > span")].map((line) => {
        const text = line.firstElementChild?.getBoundingClientRect();
        const lineHeight = Number.parseFloat(
          getComputedStyle(line.parentElement ?? line).lineHeight,
        );
        return { top: text?.top ?? 0, rows: Math.round((text?.height ?? 0) / lineHeight) };
      }),
    );
    expect(rows).toHaveLength(3);
    // The long third line wraps onto several rows, yet the grid gives it one row (and one number).
    expect(rows[2]?.rows).toBeGreaterThan(1);
    expect(rows[2]?.top).toBeGreaterThan(rows[0]?.top ?? 0);
  });

  for (const theme of themes) {
    test(`draws a raised panel with a border, a header line and the label color in ${theme} (R15.7)`, async ({
      page,
    }) => {
      await storeTheme(page, theme);
      // Already on this URL, so only a reload runs the stored theme's init script.
      await page.reload();
      const block = blocksIn(page, "Basic");
      const header = block.locator("> div").first();
      const label = header.locator("> span").first();

      const pre = preOf(block);
      await expect(block).toHaveCSS("background-color", tokenColor("color.surface.code", theme));
      await expect(block).toHaveCSS("color", tokenColor("color.text.default", theme));
      const border = tokenColor("color.border.subtle", theme);
      await expect(block).toHaveCSS("border-top-color", border);
      await expect(header).toHaveCSS("border-bottom-color", border);
      await expect(header).toHaveCSS("border-bottom-style", "solid");
      await expect(label).toHaveCSS("color", tokenColor("color.text.muted", theme));
      for (const [property, value] of [
        ["border-top-left-radius", "var(--radius-control)"],
      ] as const) {
        await expect(block).toHaveCSS(property, await probe(block, property, value));
      }
      // A probe without a border style computes its border width as 0, so read the length as padding.
      await expect(block).toHaveCSS(
        "border-top-width",
        await probe(block, "padding-top", "var(--effect-border-width)"),
      );
      for (const [property, value] of [
        ["padding-top", "var(--space-stack-xs)"],
        ["padding-left", "var(--space-inset-sm)"],
        ["column-gap", "var(--space-inline-md)"],
      ] as const) {
        await expect(header).toHaveCSS(property, await probe(block, property, value));
      }
      for (const [property, value] of [
        ["padding-top", "var(--space-inset-sm)"],
        ["font-family", "var(--type-family-code)"],
        ["font-size", "var(--type-size-small)"],
      ] as const) {
        await expect(pre).toHaveCSS(property, await probe(block, property, value));
      }
      await expect(label).toHaveCSS(
        "font-size",
        await probe(block, "font-size", "var(--type-size-small)"),
      );
      // A unitless line height scales with the code's own font size.
      const [lineHeight, fontSize, leading] = await pre.evaluate((node) => {
        const style = getComputedStyle(node);
        return [
          Number.parseFloat(style.lineHeight),
          Number.parseFloat(style.fontSize),
          Number.parseFloat(style.getPropertyValue("--type-leading-body")),
        ];
      });
      expect(lineHeight / fontSize).toBeCloseTo(leading, 2);
      await expect(pre).toHaveCSS("white-space", "pre");
      // Numbered, so the start padding sits in the gutter, before each number.
      await expect(pre).toHaveCSS("padding-left", "0px");
      const gutter = await pre.evaluate((node) => {
        const style = getComputedStyle(node.querySelector("code > span") ?? node, "::before");
        return [style.paddingLeft, style.paddingRight, style.color, style.backgroundColor];
      });
      expect(gutter).toEqual([
        await probe(block, "padding-left", "var(--space-inset-sm)"),
        await probe(block, "padding-left", "var(--space-inline-md)"),
        tokenColor("color.text.subtle", theme),
        tokenColor("color.surface.code", theme),
      ]);
    });
  }

  test("draws the focus ring inside the code (R15.7)", async ({ page, browserName }) => {
    const terminal = blocksIn(page, "Long lines").first();
    await terminal.getByRole("button", { name: "Copy code" }).focus();
    await page.keyboard.press(tabKey(browserName));
    const pre = preOf(terminal);
    await expect(pre).toBeFocused();

    await expect(pre).toHaveCSS("outline-style", "solid");
    await expect(pre).toHaveCSS(
      "outline-color",
      await probe(terminal, "color", "var(--component-code-block-focus-ring-color)"),
    );
    await expect(pre).toHaveCSS(
      "outline-offset",
      await probe(terminal, "outline-offset", "calc(-1 * var(--effect-focus-ring-width))"),
    );
  });

  test("keeps the border, header line and focus ring under forced colors (R15.9)", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "WebKit doesn't emulate forced colors.");
    await page.emulateMedia({ forcedColors: "active" });
    const terminal = blocksIn(page, "Long lines").first();
    const header = terminal.locator("> div").first();
    const fill = await terminal.evaluate((node) => getComputedStyle(node).backgroundColor);

    for (const [element, side] of [
      [terminal, "top"],
      [header, "bottom"],
    ] as const) {
      const color = await element.evaluate(
        (node, edge) => getComputedStyle(node).getPropertyValue(`border-${edge}-color`),
        side,
      );
      expect(color).not.toBe(fill);
      expect(color).not.toBe("rgba(0, 0, 0, 0)");
    }

    await terminal.getByRole("button", { name: "Copy code" }).focus();
    await page.keyboard.press(tabKey(browserName));
    const pre = preOf(terminal);
    await expect(pre).toBeFocused();
    await expect(pre).toHaveCSS("outline-style", "solid");
    expect(await pre.evaluate((node) => getComputedStyle(node).outlineColor)).not.toBe(fill);
  });
});
