import { expect, type Locator, type Page } from "@playwright/test";
import {
  componentPages,
  componentPath,
  componentsPath,
  themeCreatorPath,
  type ComponentPageId,
} from "../../web/src/design-system/components/pages.ts";
import { tokens } from "../../web/src/generated/tokens.ts";

/** Every page, docs pages from the side menu's list (ds-components R7.3), and a missing one. */
export const pages = [
  "/",
  "/experience",
  "/contact",
  "/design-system",
  "/design-system/tokens",
  themeCreatorPath,
  componentsPath,
  ...componentPages.map(({ id }) => componentPath(id)),
  "/nope",
];
export const themes = ["light", "dark"] as const;
export type Theme = (typeof themes)[number];

/** Stores a theme preference before any page script runs, as a returning visitor would have. */
export async function storeTheme(page: Page, theme: Theme) {
  await page.addInitScript((value) => {
    localStorage.setItem("theme", value);
  }, theme);
}

/** Sets every preview panel's theme on the page through its own menu. */
export async function setAllPanels(page: Page, theme: "Light" | "Dark" | "Site") {
  const triggers = page.getByRole("button", { name: /\(.+ preview\)$/ });
  const count = await triggers.count();
  for (let index = 0; index < count; index++) {
    await chooseInMenu(page, triggers.nth(index), theme);
  }
  return count;
}

/** Opens the menu `trigger` controls and picks `item` in that menu. */
export async function chooseInMenu(page: Page, trigger: Locator, item: string) {
  await trigger.click();
  const menu = page.locator(`[id="${(await trigger.getAttribute("aria-controls")) ?? ""}"]`);
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitemradio", { name: item, exact: true }).click();
  await expect(menu).toBeHidden();
}

/** A token's resolved color in a theme, as getComputedStyle reports it. */
export function tokenColor(name: string, theme: Theme): string {
  const token = tokens.find((t) => t.name === name);
  if (!token) throw new Error(`unknown token ${name}`);
  const value = "light" in token.values ? token.values[theme] : token.values.all;
  if (!("srgb" in value)) throw new Error(`${name} is not a color`);
  const [r, g, b] = value.srgb.map((channel) => Math.round(channel * 255));
  return `rgb(${String(r)}, ${String(g)}, ${String(b)})`;
}

/** Goes to a component's page (at an optional #fragment) and returns its main. */
export async function componentPage(page: Page, id: ComponentPageId, hash = "") {
  await page.goto(`${componentPath(id)}${hash}`);
  return page.getByRole("main");
}

/** The page's main, where a component page's examples are. */
export const main = (page: Page) => page.getByRole("main");

/** The preview-theme trigger of a component's panel. */
export const panelTrigger = (page: Page, name: string) =>
  page.getByRole("button", { name: new RegExp(`\\(${name} preview\\)$`) });

/**
 * The key that moves focus to the next control. WebKit, like Safari by default, skips links and
 * buttons on Tab; Option+Tab reaches every control.
 */
export const tabKey = (browserName: string, shift = false) =>
  `${browserName === "webkit" ? "Alt+" : ""}${shift ? "Shift+" : ""}Tab`;

/** An example on a component page (or in any scope): the group its h3 title names (R4.6). */
export const example = (scope: Locator, title: string) =>
  scope.getByRole("group", { name: title, exact: true });

/** What `property: value` computes to inside `scope`, read from a probe element set through CSSOM. */
export async function probe(scope: Locator, property: string, value: string) {
  return scope.evaluate(
    (element, { property, value }) => {
      const probe = document.createElement("div");
      probe.style.setProperty(property, value);
      element.append(probe);
      const computed = getComputedStyle(probe).getPropertyValue(property);
      probe.remove();
      return computed;
    },
    { property, value },
  );
}

/**
 * Opens `path` and waits until the page has settled before a test presses keys or clicks
 * (site-backdrop task 14): the network is quiet, and on Home and the 404 the sphere has drawn its
 * first frame. That frame only comes after hydration and after the engine's chunk has loaded, so
 * input never lands mid-hydration (when the header's mount effect would close a panel it opened)
 * or while the import is in flight (where WebKit under load can stall). The network alone isn't
 * enough on a slow runner: the chunk is only requested once hydration ends.
 */
export async function gotoSettled(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  const sphere = page.locator('canvas[aria-hidden="true"]');
  // Forced colors hide the sphere and never draw it, so there's no first frame to wait for.
  const drawn = await page.evaluate(() => !matchMedia("(forced-colors: active)").matches);
  if (drawn && (await sphere.count()) > 0) await expect(sphere).toHaveCSS("opacity", "1");
}

/**
 * Waits until no CSS transition or animation is running, so layout is measured as it settles: a
 * resize across size.breakpoint.md, for one, runs the header panel's display transition.
 */
export async function animationsSettled(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running"),
  );
}

/**
 * Opens every closed Accordion item on the page (refinement R13.15), so axe and layout checks
 * cover the folded content, then waits for the panels to settle. An exclusive group keeps only
 * its last item open.
 */
export async function openAllAccordions(page: Page) {
  const buttons = page.locator(":is(h2, h3, h4, h5, h6) > button[aria-expanded]");
  const count = await buttons.count();
  for (let index = 0; index < count; index++) {
    const button = buttons.nth(index);
    if ((await button.getAttribute("aria-expanded")) === "false") await button.click();
  }
  await animationsSettled(page);
  return count;
}

export interface Ring {
  label: string;
  width: number;
  contrast: number;
}

/**
 * Tabs on from the focused element until focus leaves the page or comes round again, measuring each
 * focus ring's width and its contrast against the backgrounds behind it.
 */
export async function walk(page: Page, browserName: string) {
  const rings: Ring[] = [];
  const seen = new Set<string>();

  for (let step = 0; step < 600; step++) {
    await page.keyboard.press(tabKey(browserName));
    const ring = await page.evaluate(() => {
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement) || focused === document.body) return null;
      if (!focused.dataset.focusStep) focused.dataset.focusStep = String(Math.random());
      // A link card draws its ring on the card (R10.4), not on the link itself.
      let ringElement: Element = focused;
      while (getComputedStyle(ringElement).outlineStyle === "none" && ringElement.parentElement) {
        ringElement = ringElement.parentElement;
      }
      let style: { outlineWidth: string; outlineColor: string } = getComputedStyle(ringElement);
      // A slider draws its ring on the thumb (theme-creator R13.5), a pseudo-element that
      // getComputedStyle can't read, so the ring is its stylesheet rule's, resolved on a probe.
      if (focused.matches("input[type='range']")) {
        const thumb = [...document.styleSheets]
          .flatMap((sheet) => [...sheet.cssRules])
          .find(
            (rule): rule is CSSStyleRule =>
              rule instanceof CSSStyleRule &&
              rule.selectorText.endsWith("::-webkit-slider-thumb") &&
              rule.style.getPropertyValue("outline") !== "" &&
              focused.matches(rule.selectorText.replace(/::-webkit-slider-thumb$/, "")),
          );
        const probe = document.createElement("span");
        probe.style.setProperty("outline", thumb?.style.getPropertyValue("outline") ?? "none");
        focused.after(probe);
        const { outlineWidth, outlineColor } = getComputedStyle(probe);
        probe.remove();
        ringElement = focused;
        style = { outlineWidth, outlineColor };
      }
      const parse = (color: string) => {
        const [r = 0, g = 0, b = 0, a = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
        return { rgb: [r / 255, g / 255, b / 255], a };
      };
      // The ring sits outside the element, so it's seen against the backgrounds behind it.
      let behind = { rgb: [0, 0, 0], a: 0 };
      for (let el = ringElement.parentElement; el && behind.a < 1; el = el.parentElement) {
        const layer = parse(getComputedStyle(el).backgroundColor);
        if (layer.a === 0) continue;
        const a = behind.a + layer.a * (1 - behind.a);
        behind = {
          rgb: behind.rgb.map(
            (c, i) => (c * behind.a + (layer.rgb[i] ?? 0) * layer.a * (1 - behind.a)) / a,
          ),
          a,
        };
      }
      const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const lum = ([r = 0, g = 0, b = 0]: number[]) =>
        0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const [l1, l2] = [lum(parse(style.outlineColor).rgb), lum(behind.rgb)];
      const label = `${focused.tagName.toLowerCase()} "${(focused.getAttribute("aria-label") ?? focused.textContent).trim().slice(0, 40)}"`;
      return {
        id: focused.dataset.focusStep,
        label,
        width: parseFloat(style.outlineWidth),
        contrast: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05),
      };
    });
    if (ring === null || seen.has(ring.id)) break;
    seen.add(ring.id);
    rings.push(ring);
  }

  return rings;
}

/** The rings under 2px or 3:1, labelled for a failure message. */
export const weakRings = (rings: Ring[]) =>
  rings
    .filter((ring) => ring.width < 2 || ring.contrast < 3)
    .map((ring) => `${ring.label}: ${String(ring.width)}px, ${ring.contrast.toFixed(2)}:1`);
