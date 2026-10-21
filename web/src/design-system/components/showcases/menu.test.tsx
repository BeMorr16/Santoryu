import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import showcaseStyles from "../Showcase.module.css";
import { compactMenuCss } from "./menu.tsx";
import {
  describeComponentPage,
  exampleTitle,
  expectCustomCss,
  renderComponentPage,
} from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/menu.tsx";

const renderPage = () => renderComponentPage(route, "menu");

describeComponentPage(route, "menu");

describe("Menu page examples", () => {
  it("renders the Menu showcase's View items with no icon of their own (refinement R1.10)", async () => {
    await renderPage();
    const section = screen.getByRole("main");

    for (const name of ["Grid", "List"]) {
      const item = within(section).getByRole("menuitemradio", { name, hidden: true });
      // Only the checked-state indicator, which every radio item draws.
      expect(item.querySelectorAll("svg")).toHaveLength(1);
    }
  });

  it("shows the Menu examples, link items and the customized CSS it applies (refinement R5.13)", async () => {
    await renderPage();
    const section = screen.getByRole("main");
    const titles = [
      "Actions",
      "Icons and links",
      "Radio group (controlled)",
      "Checkboxes and a separator",
      "Trigger looks",
      "Placement",
      "Controlled open",
      "Customized with component tokens",
    ];
    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual(titles);

    const github = within(section).getByRole("menuitem", {
      name: "GitHub, opens in new tab",
      hidden: true,
    });
    expect(github).toHaveAttribute("href", "https://github.com/");
    expect(
      within(section).getByRole("menuitem", { name: "LinkedIn, opens in new tab", hidden: true }),
    ).toHaveAttribute("target", "_blank");
    expect(within(section).getAllByRole("separator", { hidden: true })).toHaveLength(1);
    expect(within(section).getByRole("button", { name: "More options" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );

    const compact = within(section).getByRole("button", { name: "Compact" }).parentElement;
    expect(compact).toHaveClass(showcaseStyles.compactMenu ?? "");
    const shown = [...section.querySelectorAll("pre code")].map((code) => code.textContent);
    expect(shown).toContain(compactMenuCss);
    expect(readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8")).toContain(
      compactMenuCss,
    );
  });

  it("shows Menu's customized CSS in a CodeBlock labelled CSS, as Showcase.module.css applies it (refinement R15.11)", async () => {
    const { page } = await renderPage();

    expectCustomCss(
      page,
      compactMenuCss,
      readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8"),
    );
  });
});
