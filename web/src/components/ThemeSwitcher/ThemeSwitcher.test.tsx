import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { setSystemTheme } from "../../../test/system-theme.ts";
import { ThemeSwitcher } from "./ThemeSwitcher.tsx";
import styles from "./ThemeSwitcher.module.css";

const root = document.documentElement;
const css = readFileSync(join(import.meta.dirname, "ThemeSwitcher.module.css"), "utf8");

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

  it("renders a decorative icon for each theme, shown by CSS for the theme in effect", () => {
    render(<ThemeSwitcher />);

    const trigger = screen.getByRole("button", { name: /^Theme/ });
    expect(trigger.querySelector(`.${styles.lightIcon ?? ""}`)).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(trigger.querySelector(`.${styles.darkIcon ?? ""}`)).toHaveAttribute(
      "aria-hidden",
      "true",
    );
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

    expect(screen.getByRole("button", { name: /^Theme/ }).className).toMatch(/secondary/);
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
