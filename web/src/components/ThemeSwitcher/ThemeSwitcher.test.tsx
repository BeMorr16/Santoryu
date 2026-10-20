import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { setSystemTheme } from "../../../test/system-theme.ts";
import { Icon } from "../Icon/Icon.tsx";
import type { IconName } from "../Icon/registry.ts";
import buttonStyles from "../shared/button-styles.module.css";
import { ThemeSwitcher, themeSwitcherName } from "./ThemeSwitcher.tsx";
import styles from "./ThemeSwitcher.module.css";

const root = document.documentElement;
const css = readFileSync(join(import.meta.dirname, "ThemeSwitcher.module.css"), "utf8");

/** The glyph inside an Icon's svg, to tell which icon a component drew. */
const glyphOf = (name: IconName) =>
  render(<Icon name={name} />).container.querySelector("svg")?.innerHTML;

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute("data-theme");
});

describe("ThemeSwitcher", () => {
  it.each(["light", "dark"] as const)(
    "with no choice, is named by the OS scheme (%s) and offers only Light and Dark (R13.1, R13.2)",
    async (os) => {
      const user = userEvent.setup();
      setSystemTheme(os);
      render(<ThemeSwitcher />);
      const label = os === "light" ? "Light" : "Dark";

      await user.click(screen.getByRole("button", { name: `Theme: ${label}` }));

      expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
      expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual([
        "Light",
        "Dark",
      ]);
      expect(screen.getByRole("menuitemradio", { name: label })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      expect(screen.getByRole("menuitemradio", { name: label })).toHaveFocus();
      expect(localStorage.getItem("theme")).toBeNull();
    },
  );

  it("follows an OS scheme change live while there's no choice (R13.6)", () => {
    render(<ThemeSwitcher />);
    expect(screen.getByRole("button", { name: "Theme: Light" })).toBeInTheDocument();

    act(() => {
      setSystemTheme("dark");
    });

    expect(screen.getByRole("button", { name: "Theme: Dark" })).toBeInTheDocument();
    expect(root.hasAttribute("data-theme")).toBe(false);
  });

  it.each([
    ["Light", "light"],
    ["Dark", "dark"],
  ] as const)(
    "choosing %s applies it to <html>, stores it and renames the trigger (R13.3)",
    async (label, value) => {
      const user = userEvent.setup();
      setSystemTheme(value === "light" ? "dark" : "light");
      render(<ThemeSwitcher />);

      await user.click(screen.getByRole("button", { name: /^Theme: / }));
      await user.click(screen.getByRole("menuitemradio", { name: label }));

      expect(root.getAttribute("data-theme")).toBe(value);
      expect(localStorage.getItem("theme")).toBe(value);
      expect(screen.getByRole("button", { name: `Theme: ${label}` })).toHaveFocus();
    },
  );

  it("applies a theme on Space and closes, returning focus to the trigger (refinement R5.9)", async () => {
    const user = userEvent.setup();
    setSystemTheme("light");
    render(<ThemeSwitcher />);
    await user.click(screen.getByRole("button", { name: "Theme: Light" }));

    await user.keyboard("{ArrowDown} ");

    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: "Theme: Dark" })).toHaveFocus();
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("keeps a choice when the OS scheme changes", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);
    await user.click(screen.getByRole("button", { name: "Theme: Light" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Light" }));

    act(() => {
      setSystemTheme("dark");
    });

    expect(screen.getByRole("button", { name: "Theme: Light" })).toBeInTheDocument();
    expect(root.getAttribute("data-theme")).toBe("light");
  });

  it("checks the item matching a stored choice", async () => {
    const user = userEvent.setup();
    localStorage.setItem("theme", "dark");
    render(<ThemeSwitcher />);

    await user.click(screen.getByRole("button", { name: "Theme: Dark" }));

    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemradio", { name: "Light" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("treats a legacy stored System value as no choice", () => {
    localStorage.setItem("theme", "system");
    setSystemTheme("dark");
    render(<ThemeSwitcher />);

    expect(screen.getByRole("button", { name: "Theme: Dark" })).toBeInTheDocument();
  });

  it("renders a decorative sun and moon, shown by CSS for the theme in effect", () => {
    render(<ThemeSwitcher />);

    const trigger = screen.getByRole("button", { name: /^Theme/ });
    const lightIcon = trigger.querySelector(`.${styles.lightIcon ?? ""}`);
    const darkIcon = trigger.querySelector(`.${styles.darkIcon ?? ""}`);
    expect(lightIcon).toHaveAttribute("aria-hidden", "true");
    expect(darkIcon).toHaveAttribute("aria-hidden", "true");
    expect(lightIcon?.innerHTML).toBe(glyphOf("sun"));
    expect(darkIcon?.innerHTML).toBe(glyphOf("moon"));
    expect(css).toMatch(/:global\(:root\[data-theme="dark"\]\) \.darkIcon \{\s*display: inline;/);
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)/);
  });

  it("is hidden while the page has no JavaScript (R13.9)", () => {
    const { container } = render(<ThemeSwitcher />);

    expect(container.firstElementChild).toHaveClass(styles.switcher ?? "");
    expect(css).toMatch(/:global\(:root:not\(\[data-js\]\)\) \.switcher \{\s*display: none;/);
  });

  it("forwards variant and size to its trigger", () => {
    render(<ThemeSwitcher variant="secondary" size="md" />);

    const trigger = screen.getByRole("button", { name: /^Theme/ });
    expect(trigger).toHaveClass(buttonStyles.secondary ?? "", buttonStyles.md ?? "");
    expect(trigger).not.toHaveClass(buttonStyles.sm ?? "");
  });

  it("opens below, lined up with the trigger's end edge, by default (refinement R10.1)", () => {
    render(<ThemeSwitcher />);

    const popup = screen.getByRole("menu", { hidden: true });
    expect(popup).toHaveAttribute("data-side", "bottom");
    expect(popup).toHaveAttribute("data-align", "end");
  });

  it("forwards side and align to its popup (refinement R10.1)", () => {
    render(<ThemeSwitcher side="top" align="start" />);

    const popup = screen.getByRole("menu", { hidden: true });
    expect(popup).toHaveAttribute("data-side", "top");
    expect(popup).toHaveAttribute("data-align", "start");
  });

  it.each([
    ["unset", undefined, styles.auto],
    ["true", true, undefined],
  ] as const)(
    "with showLabel %s, renders the visible label, keeping the name (refinement R10.2)",
    (_, showLabel, className) => {
      render(<ThemeSwitcher showLabel={showLabel} />);

      const trigger = screen.getByRole("button", { name: "Theme: Light" });
      const label = within(trigger).getByText("Theme", { exact: true });
      expect(label).toHaveAttribute("aria-hidden", "true");
      if (className) expect(label).toHaveClass(className);
      else expect(label).not.toHaveAttribute("class");
    },
  );

  it("with showLabel false, renders no visible label, keeping the name (refinement R10.2)", () => {
    render(<ThemeSwitcher showLabel={false} />);

    const trigger = screen.getByRole("button", { name: "Theme: Light" });
    expect(within(trigger).queryByText("Theme", { exact: true })).toBeNull();
  });

  it.each([undefined, false] as const)(
    "ends its trigger with a chevron, so it isn't square, with showLabel %s (refinement R10.3)",
    (showLabel) => {
      render(<ThemeSwitcher showLabel={showLabel} />);

      const trigger = screen.getByRole("button", { name: /^Theme/ });
      const svgs = trigger.querySelectorAll("svg");
      expect(svgs).toHaveLength(3);
      expect(svgs[2]?.innerHTML).toBe(glyphOf("chevron-down"));
      expect(svgs[2]).toHaveAttribute("aria-hidden", "true");
      expect(trigger).not.toHaveClass(buttonStyles.iconOnly ?? "");
    },
  );

  it("names the trigger by the theme in effect, or just Theme before it's known (R13.2, R13.8)", () => {
    expect(themeSwitcherName(null)).toBe("Theme");
    expect(themeSwitcherName("light")).toBe("Theme: Light");
    expect(themeSwitcherName("dark")).toBe("Theme: Dark");
  });

  it("hides an automatic label below 30em and shows it from there up (refinement R10.2)", () => {
    expect(css).toMatch(/^\.auto \{\s*display: none;/m);
    expect(css).toMatch(/@media \(min-width: 30em\) \{\s*\.auto \{\s*display: inline;/);
  });

  it("hydrates with no mismatch, then names the theme in effect (R3.6, R13.8)", () => {
    setSystemTheme("dark");
    const container = document.createElement("div");
    container.innerHTML = renderToString(<ThemeSwitcher />);
    document.body.append(container);
    expect(container.querySelector("button")).toHaveAccessibleName("Theme");
    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<ThemeSwitcher />, { container, hydrate: true, onRecoverableError });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Theme: Dark" })).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("has no axe violations, closed and open (R3.9)", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <header>
        <ThemeSwitcher />
      </header>,
    );
    await expectNoAxeViolations(container);

    await user.click(screen.getByRole("button", { name: "Theme: Light" }));
    await expectNoAxeViolations(container);
  });
});

describe("ThemeSwitcher: name tooltip (refinement R14.13)", () => {
  /** jsdom has no checkVisibility: report whether the visible "Theme" is displayed. */
  function labelDisplayed(displayed: boolean) {
    Object.defineProperty(HTMLElement.prototype, "checkVisibility", {
      configurable: true,
      value: () => displayed,
    });
    onTestFinished(() => {
      Reflect.deleteProperty(HTMLElement.prototype, "checkVisibility");
    });
  }

  // The tooltip popup is a span; the menu's popup (a div) follows it.
  const tooltipOf = (trigger: HTMLElement) => {
    const popup = trigger.nextElementSibling;
    return popup instanceof HTMLSpanElement && popup.hasAttribute("popover") ? popup : null;
  };

  it("shows its name while the label is hidden", async () => {
    const user = userEvent.setup();
    labelDisplayed(false);
    setSystemTheme("dark");
    render(<ThemeSwitcher showLabel={false} />);
    const trigger = screen.getByRole("button", { name: "Theme: Dark" });
    const tooltip = tooltipOf(trigger);
    expect(tooltip).toHaveTextContent("Theme: Dark");
    expect(tooltip).toHaveAttribute("aria-hidden", "true");

    await user.hover(trigger);
    await waitFor(() => {
      expect(tooltip).toBeVisible();
    });
  });

  it("doesn't show while the automatic label is displayed", async () => {
    const user = userEvent.setup();
    labelDisplayed(true);
    render(<ThemeSwitcher />);
    const trigger = screen.getByRole("button", { name: /^Theme/ });

    await user.hover(trigger);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    expect(tooltipOf(trigger)).not.toBeVisible();
  });

  it("has no tooltip with showLabel or nameTooltip={false}", () => {
    render(
      <>
        <ThemeSwitcher showLabel />
        <ThemeSwitcher showLabel={false} nameTooltip={false} />
      </>,
    );
    for (const trigger of screen.getAllByRole("button", { name: /^Theme/ })) {
      expect(tooltipOf(trigger)).toBeNull();
    }
  });
});
