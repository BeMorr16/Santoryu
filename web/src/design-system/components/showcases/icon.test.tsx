import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import iconStyles from "../../../components/Icon/Icon.module.css";
import { icons } from "../../../components/Icon/registry.ts";
import typographyStyles from "../../../components/Typography/Typography.module.css";
import { describeComponentPage, renderComponentPage, showcases } from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/icon.tsx";

const renderPage = () => renderComponentPage(route, "icon");

describeComponentPage(route, "icon");

describe("Icon page examples", () => {
  it("documents Icon's SVG escape hatches in a props note (refinement R1.6, R1.11)", () => {
    expect(showcases.find((s) => s.id === "icon")?.propsNote).toMatch(
      /fill.+stroke.+viewBox.+width.+height.+transform.+children.+fill replaces currentColor.+256-unit grid.+overridden by the size classes.+Children must not be focusable or include <title> or <desc>/,
    );
  });

  it("captions every registry icon with its name, and keeps those icons decorative (refinement R1.7)", async () => {
    await renderPage();
    const section = screen.getByRole("main");

    const registry = within(section).getByText("Registry", { selector: "h3" }).parentElement;
    if (registry === null) throw new Error("no Registry example");
    const captions = within(registry)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(captions).toEqual(Object.keys(icons));
    expect(within(registry).queryAllByRole("img")).toEqual([]);
    expect(registry.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(captions.length);
  });

  it("shows icons following their text's size and color (refinement R1.8)", async () => {
    await renderPage();
    const section = screen.getByRole("main");

    for (const text of ["Heading-size text, heading-size icon", "Small text, small icon"]) {
      const icon = within(section).getByText(text).querySelector("svg");
      expect(icon).toHaveClass(iconStyles["size-inherit"] ?? "");
    }
    expect(within(section).getByText("Heading-size text, heading-size icon")).toHaveClass(
      typographyStyles.h2 ?? "",
    );
    expect(within(section).getByText("Small text, small icon")).toHaveClass(
      typographyStyles.small ?? "",
    );
    const link = within(section).getByRole("link", { name: "Design tokens" });
    const accent = within(section).getByText("Accent-colored text and icon");
    expect(accent.tagName).toBe("SPAN");
    expect(accent).toHaveClass(typographyStyles["tone-accent"] ?? "");
    for (const icon of [link.querySelector("svg"), accent.querySelector("svg")]) {
      expect(icon).toHaveAttribute("fill", "currentColor");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    }
  });
});
