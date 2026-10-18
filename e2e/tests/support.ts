import { expect, type Locator, type Page } from "@playwright/test";
import { tokens } from "../../web/src/generated/tokens.ts";

export const pages = ["/", "/lab", "/lab/tokens", "/lab/components", "/nope"];
export const themes = ["light", "dark"] as const;
export type Theme = (typeof themes)[number];

/** Stores a theme preference before any page script runs, as a returning visitor would have. */
export async function storeTheme(page: Page, theme: Theme) {
  await page.addInitScript((value) => {
    localStorage.setItem("theme", value);
  }, theme);
}

/** Sets every /lab/components preview panel's theme through its own menu. */
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

/** A section of /lab/components, by its component name. */
export const section = (page: Page, name: string) =>
  page.getByRole("region", { name, exact: true });

/** The preview-theme trigger of a component's panel. */
export const panelTrigger = (page: Page, name: string) =>
  page.getByRole("button", { name: new RegExp(`\\(${name} preview\\)$`) });

/**
 * The key that moves focus to the next control. WebKit, like Safari by default, skips links and
 * buttons on Tab; Option+Tab reaches every control.
 */
export const tabKey = (browserName: string, shift = false) =>
  `${browserName === "webkit" ? "Alt+" : ""}${shift ? "Shift+" : ""}Tab`;
