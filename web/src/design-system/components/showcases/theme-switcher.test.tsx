import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, onTestFinished } from "vitest";
import switcherStyles from "../../../components/ThemeSwitcher/ThemeSwitcher.module.css";
import { menuKeyboard } from "../shared-docs.ts";
import {
  describeComponentPage,
  exampleTitle,
  renderComponentPage,
  showcases,
} from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/theme-switcher.tsx";

const renderPage = () => renderComponentPage(route, "theme-switcher");

describeComponentPage(route, "theme-switcher");

describe("ThemeSwitcher page examples", () => {
  it("shows the ThemeSwitcher examples, its props, its own keyboard table and a live caption (refinement R10.4, R10.5)", async () => {
    onTestFinished(() => {
      localStorage.clear();
      document.documentElement.removeAttribute("data-theme");
    });
    const user = userEvent.setup();
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => within(section).getByRole("group", { name: title });

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "Looks (each changes the whole site, not this panel)",
      "Label (changes the whole site, not this panel)",
      "Placement (changes the whole site, not this panel)",
    ]);

    const looks = within(example("Looks (each changes the whole site, not this panel)"));
    expect(looks.getAllByRole("button", { name: "Theme: Light" })).toHaveLength(3);

    const label = example("Label (changes the whole site, not this panel)");
    const [auto, always, never] = within(label).getAllByRole("button", { name: "Theme: Light" });
    expect(within(auto ?? label).getByText("Theme", { exact: true })).toHaveClass(
      switcherStyles.auto ?? "",
    );
    expect(within(always ?? label).getByText("Theme", { exact: true })).not.toHaveAttribute(
      "class",
    );
    expect(within(never ?? label).queryByText("Theme", { exact: true })).toBeNull();
    expect(
      within(label).getByText("Announced as: “Theme: Light, menu button, collapsed”"),
    ).toBeInTheDocument();

    const placement = example("Placement (changes the whole site, not this panel)");
    expect(
      [...placement.querySelectorAll('[role="menu"]')].map((popup) =>
        popup.getAttribute("data-align"),
      ),
    ).toEqual(["start", "end"]);

    const showcase = showcases.find((s) => s.id === "theme-switcher");
    const docs = showcase?.props[0]?.docs ?? {};
    expect(Object.keys(docs)).toEqual([
      "variant",
      "size",
      "showLabel",
      "nameTooltip",
      "side",
      "align",
    ]);
    expect(docs.nameTooltip?.default).toBe("true");
    expect(docs.showLabel?.default).toBe("auto: from 30em up");
    expect(docs.align?.default).toBe('"end"');
    expect(docs.side?.default).toBe('"bottom"');

    const keyboard = within(section).getByRole("table", { name: "ThemeSwitcher keyboard" });
    const row = within(keyboard).getByRole("row", { name: /^Enter \/ Space In the menu:/ });
    expect(row).toHaveTextContent(
      "In the menu: applies the theme, closes, and returns focus to the trigger.",
    );
    expect(within(keyboard).queryByRole("row", { name: /keeps the menu open/ })).toBeNull();
    // Menu's other rows are reused as they are, so they can't drift.
    expect(showcase?.keyboard).toHaveLength(menuKeyboard.length - 1);
    expect(showcase?.keyboard).toEqual(
      expect.arrayContaining(menuKeyboard.filter((r) => r.keys !== "Enter" && r.keys !== "Space")),
    );

    for (const note of [
      /chevron shows sighted users that the trigger opens a menu\. Screen readers announce a menu button with its state/,
      /visible "Theme" label is the start of the accessible name/,
      /Hide the label \(showLabel=\{false\}\) only where the icons make the purpose clear/,
      /then shows as a tooltip on hover and keyboard focus, but voice control users still have to discover/,
      /caption gives the trigger's accessible name, role and state\. Exact wording varies/,
      /Space applies a theme and closes the menu/,
      /report the site's theme, even inside a preview panel/,
    ]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }

    await user.click(auto ?? label);
    const popup = document.getElementById(auto?.getAttribute("aria-controls") ?? "");
    await user.click(within(popup ?? label).getByRole("menuitemradio", { name: "Dark" }));

    expect(
      within(label).getByText("Announced as: “Theme: Dark, menu button, collapsed”"),
    ).toBeInTheDocument();
  });
});
