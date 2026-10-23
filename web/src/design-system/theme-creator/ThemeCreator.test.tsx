import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import {
  previewPage,
  previewProperty,
  renderCreator,
  section,
  typeHex,
} from "./theme-creator-test.tsx";

afterEach(() => {
  localStorage.clear();
});

describe("ThemeCreator: key controls and preview (theme-creator R4, R5, R7)", () => {
  it("groups the editor into Color, Typography, Shape and Spacing, each with an h2, then the preview and chain (R4.1)", async () => {
    await renderCreator();

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Find a token",
      "Color",
      "Typography",
      "Shape",
      "Spacing",
      "Preview",
      "Token chain",
    ]);
  });

  it("shows the draft only inside a region labelled Preview (R7.1)", async () => {
    await renderCreator();

    const page = previewPage();
    expect(page).toHaveAttribute("data-theme", "light");
    expect(page.getAttribute("style") ?? "").toBe("");
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });

  it("updates the preview's inline action color as the Action color changes (R4.4, R5.1)", async () => {
    const { user } = await renderCreator();

    await typeHex(user, screen.getByRole("group", { name: "Action" }), "#2a8556");

    expect(previewProperty("--color-action-background")).toBe("#2a8556");
    expect(previewProperty("--color-link-default")).not.toBe("");
    expect(document.documentElement.style.getPropertyValue("--color-action-background")).toBe("");
  });

  it("flips the preview's scheme for a dark background (R2.5)", async () => {
    const { user } = await renderCreator();

    await typeHex(user, screen.getByRole("group", { name: "Background" }), "#0b2338");

    expect(previewPage()).toHaveAttribute("data-theme", "dark");
  });

  it("changes spacing with Density and radius with Corner radius (R5.5, R5.6)", async () => {
    const { user } = await renderCreator();

    const density = screen.getByRole("slider", { name: "Density" });
    expect(density).toHaveAttribute("aria-valuetext", "Default, 4px");
    density.focus();
    await user.keyboard("{End}");
    expect(previewProperty("--space-inset-md")).toBe("1.25rem");
    expect(density).toHaveAttribute("aria-valuetext", "5px");

    const radius = screen.getByRole("slider", { name: "Corner radius" });
    radius.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(previewProperty("--radius-control")).toBe("6px");
    expect(previewProperty("--radius-surface")).toBe("6px");
  });

  it("chooses a heading font from a menu (R5.4)", async () => {
    const { user } = await renderCreator();

    await user.click(screen.getByRole("button", { name: "Heading font: Space Grotesk" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Fira Code" }));

    expect(screen.getByRole("button", { name: "Heading font: Fira Code" })).toBeInTheDocument();
    expect(previewProperty("--type-family-heading")).toMatch(/^'Fira Code Variable'/);
  });

  it("offers Reset only while a key differs from the starting point, and Reset restores it (R5.8)", async () => {
    const { user } = await renderCreator();
    const shape = section("Shape");
    expect(within(shape).queryByRole("button", { name: /^Reset/ })).toBeNull();

    const width = screen.getByRole("slider", { name: "Border width" });
    width.focus();
    await user.keyboard("{ArrowRight}");
    expect(previewProperty("--effect-border-width")).toBe("2px");

    within(shape).getByRole("button", { name: "Reset Border width" }).focus();
    await user.keyboard("{Enter}");
    expect(previewProperty("--effect-border-width")).toBe("");
    expect(within(shape).queryByRole("button", { name: /^Reset/ })).toBeNull();
    // The button is gone, so focus moves to the control it reset (WCAG 2.4.3).
    expect(screen.getByRole("slider", { name: "Border width" })).toHaveFocus();
  });

  it("puts the preview behind a narrow-screen disclosure (R7.4)", async () => {
    const { user } = await renderCreator({ preview: false });

    const toggle = screen.getByRole("button", { name: "Show preview" });
    const panel = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("hidden");
    expect(screen.queryByRole("region", { name: "Preview" })).toBeNull();

    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Hide preview" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(panel).not.toHaveAttribute("hidden");
    expect(panel).toContainElement(previewPage());
  });

  it("has no axe violations", async () => {
    const { container } = await renderCreator();

    await expectNoAxeViolations(container);
  }, 30_000);
});
