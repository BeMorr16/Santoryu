import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PreviewPanel } from "./PreviewPanel.tsx";

function renderPanels() {
  render(
    <>
      <PreviewPanel label="Button examples">
        <button type="button">Save</button>
      </PreviewPanel>
      <PreviewPanel label="Link examples">
        <a href="#x">Read more</a>
      </PreviewPanel>
    </>,
  );
  return {
    button: screen.getByRole("group", { name: "Button examples" }),
    link: screen.getByRole("group", { name: "Link examples" }),
  };
}

async function choose(user: ReturnType<typeof userEvent.setup>, panel: string, theme: string) {
  await user.click(
    screen.getByRole("button", { name: new RegExp(`\\(${panel} examples preview\\)$`) }),
  );
  await user.click(screen.getByRole("menuitemradio", { name: theme }));
}

describe("PreviewPanel (R15.6, R15.7)", () => {
  it("follows the site theme by default, with a trigger named by the choice and the panel", () => {
    const panels = renderPanels();

    expect(panels.button).not.toHaveAttribute("data-theme");
    expect(
      screen.getByRole("button", { name: "Theme: Site (Button examples preview)" }),
    ).toBeInTheDocument();
  });

  it.each(["Light", "Dark"])("sets data-theme on its own panel only for %s", async (theme) => {
    const user = userEvent.setup();
    const panels = renderPanels();

    await choose(user, "Button", theme);

    expect(panels.button).toHaveAttribute("data-theme", theme.toLowerCase());
    expect(panels.link).not.toHaveAttribute("data-theme");
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(
      screen.getByRole("button", { name: `Theme: ${theme} (Button examples preview)` }),
    ).toHaveFocus();
  });

  it("clears data-theme when Site is chosen again", async () => {
    const user = userEvent.setup();
    const panels = renderPanels();

    await choose(user, "Link", "Dark");
    await choose(user, "Link", "Site");

    expect(panels.link).not.toHaveAttribute("data-theme");
  });

  it("doesn't persist the choice", async () => {
    const user = userEvent.setup();
    localStorage.clear();
    renderPanels();

    await choose(user, "Button", "Dark");

    expect(localStorage.length).toBe(0);
  });

  describe("custom themes (theme-creator R9.7)", () => {
    const ocean = {
      id: "ocean123",
      name: "Ocean",
      scheme: "dark",
      vars: { "--color-action-background": "#7a5618" },
      source: {},
    };
    const storeThemes = (...themes: unknown[]) => {
      localStorage.setItem("custom-themes", JSON.stringify({ v: 1, themes }));
      window.dispatchEvent(new StorageEvent("storage", { key: "custom-themes" }));
    };

    it("lists them after Site, Light and Dark, and applies one to its panel only", async () => {
      const user = userEvent.setup();
      localStorage.clear();
      storeThemes(ocean);
      const panels = renderPanels();

      await user.click(
        screen.getByRole("button", { name: "Theme: Site (Button examples preview)" }),
      );
      expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual([
        "Site",
        "Light",
        "Dark",
        "Ocean",
      ]);
      await user.click(screen.getByRole("menuitemradio", { name: "Ocean" }));

      expect(panels.button).toHaveAttribute("data-theme", "dark");
      expect(panels.button.style.getPropertyValue("--color-action-background")).toBe("#7a5618");
      expect(panels.link).not.toHaveAttribute("data-theme");
      expect(document.documentElement).not.toHaveAttribute("data-theme");
      expect(document.documentElement).not.toHaveAttribute("data-custom-theme");
      expect(document.documentElement.style.getPropertyValue("--color-action-background")).toBe("");
      expect(
        screen.getByRole("button", { name: "Theme: Ocean (Button examples preview)" }),
      ).toBeInTheDocument();
      localStorage.clear();
    });

    it("falls back to Site when the chosen theme is deleted", async () => {
      const user = userEvent.setup();
      localStorage.clear();
      storeThemes(ocean);
      const panels = renderPanels();
      await choose(user, "Button", "Ocean");

      act(() => {
        storeThemes();
      });

      expect(panels.button).not.toHaveAttribute("data-theme");
      expect(panels.button.style.getPropertyValue("--color-action-background")).toBe("");
      expect(
        screen.getByRole("button", { name: "Theme: Site (Button examples preview)" }),
      ).toBeInTheDocument();
      localStorage.clear();
    });
  });
});
