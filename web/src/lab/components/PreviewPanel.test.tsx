import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PreviewPanel } from "./PreviewPanel.tsx";

function renderPanels() {
  render(
    <>
      <PreviewPanel label="Button">
        <button type="button">Save</button>
      </PreviewPanel>
      <PreviewPanel label="Link">
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
  await user.click(screen.getByRole("button", { name: new RegExp(`\\(${panel} preview\\)$`) }));
  await user.click(screen.getByRole("menuitemradio", { name: theme }));
}

describe("PreviewPanel (R15.6, R15.7)", () => {
  it("follows the site theme by default, with a trigger named by the choice and the panel", () => {
    const panels = renderPanels();

    expect(panels.button).not.toHaveAttribute("data-theme");
    expect(
      screen.getByRole("button", { name: "Theme: Site (Button preview)" }),
    ).toBeInTheDocument();
  });

  it.each(["Light", "Dark"])("sets data-theme on its own panel only for %s", async (theme) => {
    const user = userEvent.setup();
    const panels = renderPanels();

    await choose(user, "Button", theme);

    expect(panels.button).toHaveAttribute("data-theme", theme.toLowerCase());
    expect(panels.link).not.toHaveAttribute("data-theme");
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(screen.getByRole("button", { name: `Theme: ${theme} (Button preview)` })).toHaveFocus();
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
});
