import { describe, expect, it } from "vitest";
import { hubData } from "../../generated/hub-data.ts";
import routes from "../../routes.ts";
import { MAX_CUSTOM_THEMES } from "../../theme/custom-themes.ts";
import { componentPages } from "../components/pages.ts";
import { presets } from "../theme-creator/model/presets.ts";
import { hubCards } from "./cards.ts";
import { cardCounts } from "./counts.ts";

describe("hub cards (ds-hub R2.4)", () => {
  it("are Tokens, Components and Theme Creator, in that order, linking their routes", () => {
    expect(hubCards.map(({ title, href }) => [title, href])).toEqual([
      ["Tokens", "/design-system/tokens"],
      ["Components", "/design-system/components"],
      ["Theme Creator", "/design-system/theme-creator"],
    ]);
    const paths = routes.map((route) => `/${route.path ?? ""}`);
    for (const { href } of hubCards) expect(paths).toContain(href);
  });
});

describe("card counts (ds-hub R3.4)", () => {
  it("counts every token and the tiers", () => {
    expect(cardCounts.tokens).toContain(`${String(hubData.tokens.total)} tokens`);
    expect(cardCounts.tokens).toContain(`${String(hubData.tokens.tiers)} tiers`);
  });

  it("counts the component pages and their groups", () => {
    const groups = new Set(componentPages.map((page) => page.group)).size;

    expect(cardCounts.components).toContain(`${String(componentPages.length)} components`);
    expect(cardCounts.components).toContain(`${String(groups)} groups`);
  });

  it("counts the theme creator's categories, presets and custom-theme limit", () => {
    expect(cardCounts["theme-creator"]).toContain(
      `${String(hubData.themeCreator.categories)} categories`,
    );
    expect(cardCounts["theme-creator"]).toContain(`${String(presets.length)} presets`);
    expect(cardCounts["theme-creator"]).toContain(`up to ${String(MAX_CUSTOM_THEMES)} themes`);
  });
});
