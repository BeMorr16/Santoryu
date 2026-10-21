import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import buttonStyles from "../../../components/shared/button-styles.module.css";
import hiddenStyles from "../../../components/VisuallyHidden/VisuallyHidden.module.css";
import { brandCtaCss } from "./button.tsx";
import {
  describeComponentPage,
  expectCustomCss,
  renderComponentPage,
  showcases,
} from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/button.tsx";

const renderPage = () => renderComponentPage(route, "button");

describeComponentPage(route, "button");

describe("Button page examples", () => {
  it.each([
    ["Show grid", true],
    ["Wrap lines", false],
    ["Mark as done", false],
    ["Notify me", true],
  ] as const)(
    "flips the %s toggle on click and Space, and its caption follows (refinement R3.11, palette-expansion R3.5)",
    async (name, initial) => {
      const user = userEvent.setup();
      await renderPage();
      const section = screen.getByRole("main");
      const toggles = within(section).getByText("Toggles", { selector: "h3" }).parentElement;
      if (toggles === null) throw new Error("no Toggles example");
      const toggle = within(toggles).getByRole("button", { name });
      const caption = (pressed: boolean) =>
        `Announced as: “${name}, toggle button, ${pressed ? "pressed" : "not pressed"}”`;

      expect(toggle).toHaveAttribute("aria-pressed", String(initial));
      expect(within(toggles).getByText(caption(initial))).toBeInTheDocument();

      await user.click(toggle);

      expect(toggle).toHaveAttribute("aria-pressed", String(!initial));
      expect(within(toggles).getByText(caption(!initial))).toBeInTheDocument();

      await user.keyboard(" ");

      expect(toggle).toHaveAttribute("aria-pressed", String(initial));
      expect(within(toggles).getByText(caption(initial))).toBeInTheDocument();
    },
  );

  it("names each icon-only button as its caption says, and drops GitHub from Icons (refinement R3.11)", async () => {
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => {
      const element = within(section).getByText(title, { selector: "h3" }).parentElement;
      if (element === null) throw new Error(`no ${title} example`);
      return element;
    };

    const tiles = within(example("Icon-only")).getAllByRole("listitem");
    const expected = [
      ["sm · aria-label", "Mark as done"],
      ["md · aria-label", "Next"],
      ["sm · VisuallyHidden", "Show more"],
      ["md · VisuallyHidden", "Show more"],
    ] as const;
    expect(tiles.map((tile) => tile.querySelector("code")?.textContent)).toEqual(
      expected.map(([caption]) => caption),
    );
    for (const [index, [caption, name]] of expected.entries()) {
      const button = within(tiles[index] ?? section).getByRole("button", { name });
      const byLabel = caption.endsWith("aria-label");
      expect(button.hasAttribute("aria-label")).toBe(byLabel);
      expect(button.querySelector(`.${hiddenStyles.root ?? ""}`) !== null).toBe(!byLabel);
      expect(button).toHaveClass(buttonStyles.iconOnly ?? "");
    }

    expect(within(example("Icons")).queryByRole("button", { name: "GitHub" })).toBeNull();
    expect(
      within(example("Long label")).getByRole("button", {
        name: "Send me a note about a project you have in mind",
      }),
    ).toBeInTheDocument();
  });

  it("documents the tooltip props on Button, Link, MenuTrigger and ThemeSwitcher (refinement R14.14)", async () => {
    await renderPage();
    const docsOf = (id: string, part: string) =>
      showcases.find((s) => s.id === id)?.props.find((p) => p.part === part)?.docs ?? {};

    expect(Object.keys(docsOf("button", "Button"))).toEqual(
      expect.arrayContaining(["disabledReason", "nameTooltip"]),
    );
    expect(Object.keys(docsOf("menu", "MenuTrigger (same as Button)"))).toEqual(
      expect.arrayContaining(["disabledReason", "nameTooltip"]),
    );
    expect(Object.keys(docsOf("link", "Link"))).toContain("nameTooltip");
    expect(Object.keys(docsOf("link", "Link"))).not.toContain("disabledReason");
    expect(Object.keys(docsOf("theme-switcher", "ThemeSwitcher"))).toContain("nameTooltip");

    const button = screen.getByRole("main");
    const disabled = within(
      within(button).getByRole("group", { name: "Disabled (still focusable)" }),
    )
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-describedby") !== null);
    expect(disabled).toEqual([true, false, false]);
    expect(
      within(button).getByText(/disabledReason is the disabled button's accessible description/),
    ).toBeInTheDocument();
    expect(
      within(button).getByText(/Icon-only buttons show their name as a tooltip/),
    ).toBeInTheDocument();
  });

  it("shows Button's customized CSS in a CodeBlock labelled CSS, as Showcase.module.css applies it (refinement R15.11)", async () => {
    const { page } = await renderPage();

    expectCustomCss(
      page,
      brandCtaCss,
      readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8"),
    );
  });
});
