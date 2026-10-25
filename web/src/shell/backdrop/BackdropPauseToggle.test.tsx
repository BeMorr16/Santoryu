import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import styles from "./Backdrop.module.css";
import { BackdropPauseToggle } from "./BackdropPauseToggle.tsx";
import { writeBackdropPaused } from "./motion-preference.ts";

const toggle = () => screen.getByRole("button", { name: "Pause background animation" });

afterEach(() => {
  writeBackdropPaused(false);
  localStorage.clear();
});

describe("BackdropPauseToggle (site-backdrop R6.7)", () => {
  it("is a named toggle button, not pressed at first", async () => {
    const { container } = render(<BackdropPauseToggle />);

    expect(toggle()).toHaveAttribute("aria-pressed", "false");
    expect(toggle()).toHaveAttribute("type", "button");
    await expectNoAxeViolations(container);
  });

  it("pauses and resumes on click, keeping its name and saving the choice", async () => {
    const user = userEvent.setup();
    render(<BackdropPauseToggle />);

    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("backdrop-motion")).toBe("paused");

    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem("backdrop-motion")).toBeNull();
  });

  it("toggles from the keyboard with Enter and Space", async () => {
    const user = userEvent.setup();
    render(<BackdropPauseToggle />);

    await user.tab();
    expect(toggle()).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(toggle()).toHaveAttribute("aria-pressed", "true");
    await user.keyboard(" ");
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
  });

  it("is hidden while the page has no JavaScript, since it can't work without it", () => {
    render(<BackdropPauseToggle />);
    const css = readFileSync(join(import.meta.dirname, "Backdrop.module.css"), "utf8");

    expect(toggle()).toHaveClass(styles.pause ?? "");
    expect(css).toMatch(/:global\(:root:not\(\[data-js\]\)\) \.pause \{\s*display: none;/);
  });

  it("shows a pause saved on an earlier visit", () => {
    localStorage.setItem("backdrop-motion", "paused");
    render(<BackdropPauseToggle />);

    expect(toggle()).toHaveAttribute("aria-pressed", "true");
  });

  it("hydrates over the prerendered button with no mismatch, then shows a saved pause", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<BackdropPauseToggle />);
    document.body.append(container);
    localStorage.setItem("backdrop-motion", "paused");
    const onRecoverableError = vi.fn();

    render(<BackdropPauseToggle />, { container, hydrate: true, onRecoverableError });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(toggle()).toHaveAttribute("aria-pressed", "true");
    container.remove();
  });
});
