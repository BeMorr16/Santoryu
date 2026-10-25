import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import layoutStyles from "../../../components/shared/layout.module.css";
import showcaseStyles from "../Showcase.module.css";
import separatorStyles from "../../../components/Separator/Separator.module.css";
import { byline, customSeparatorCss } from "./separator.tsx";
import {
  describeComponentPage,
  exampleTitle,
  renderComponentPage,
  showcases,
} from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/separator.tsx";

const renderPage = () => renderComponentPage(route, "separator");

describeComponentPage(route, "separator");

describe("Separator page examples", () => {
  it("shows the Separator examples, its props, notes and the customized CSS it applies (refinement R17.8)", async () => {
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => within(section).getByRole("group", { name: title });
    const decorativeIn = (element: HTMLElement) =>
      [...element.querySelectorAll(`.${separatorStyles.separator ?? ""}`)].filter(
        (separator) => separator.tagName === "DIV",
      );

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "Horizontal",
      "Vertical",
      "Variants",
      "Thickness",
      "Customized with component tokens",
    ]);

    const horizontal = example("Horizontal");
    const rule = within(horizontal).getByRole("separator");
    expect(rule.tagName).toBe("HR");
    expect(rule).not.toHaveAttribute("aria-orientation");
    // Spaced by its Stack's gap, between two paragraphs (refinement R17.4).
    expect(rule.parentElement).toHaveClass(layoutStyles["row-gap-md"] ?? "");
    expect(rule.previousElementSibling?.tagName).toBe("P");
    expect(rule.nextElementSibling?.tagName).toBe("P");
    expect(horizontal).toHaveTextContent(
      /It has the separator role, so screen readers can announce the break/,
    );

    const vertical = example("Vertical");
    expect(within(vertical).queryByRole("separator", { hidden: true })).toBeNull();
    const lines = decorativeIn(vertical);
    expect(lines).toHaveLength(byline.items.length);
    for (const line of lines) {
      expect(line).toHaveAttribute("aria-hidden", "true");
      expect(line).toHaveClass(separatorStyles.vertical ?? "");
    }
    const row = lines[0]?.parentElement;
    expect([...(row?.children ?? [])].map((child) => child.textContent)).toEqual([
      byline.date,
      "",
      byline.items[0],
      "",
      byline.items[1],
    ]);
    expect(within(vertical).getByText(byline.date)).toHaveAttribute("datetime", byline.dateTime);
    expect(vertical).toHaveTextContent(
      /hidden from assistive technology. These only divide items in a row/,
    );

    const variants = decorativeIn(example("Variants"));
    expect(variants.map((line) => line.previousElementSibling?.textContent)).toEqual([
      "Subtle (default)",
      "Strong",
    ]);
    expect(variants[0]).toHaveClass(separatorStyles.subtle ?? "");
    expect(variants[1]).toHaveClass(separatorStyles.strong ?? "");

    const thicknesses = decorativeIn(example("Thickness"));
    expect(thicknesses.map((line) => line.previousElementSibling?.textContent)).toEqual([
      "Thin (default)",
      "Thick",
    ]);
    expect(thicknesses[0]).toHaveClass(separatorStyles.thin ?? "");
    expect(thicknesses[1]).toHaveClass(separatorStyles.thick ?? "");

    const custom = example("Customized with component tokens");
    expect(within(custom).getByRole("separator")).toHaveClass(showcaseStyles.customSeparator ?? "");
    expect(custom.querySelector("pre code")?.textContent).toBe(customSeparatorCss);
    expect(readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8")).toContain(
      customSeparatorCss,
    );

    const separator = showcases.find((s) => s.id === "separator");
    expect(separator?.props.map(({ part, docs }) => [part, Object.keys(docs)])).toEqual([
      ["Separator", ["orientation", "decorative", "variant", "thickness"]],
    ]);
    expect(separator?.props[0]?.docs.orientation?.description).toMatch(
      /goes in a vertical flow \(block flow or a vertical Stack\).+Vertical goes in a horizontal flow \(a horizontal Stack\)/,
    );
    // In the Content group, after Figure and before Badge (ds-components R2.2).
    const ids = showcases.map((s) => s.id);
    const at = ids.indexOf("separator");
    expect(ids.slice(at - 1, at + 2)).toEqual(["figure", "separator", "badge"]);
    expect(separator?.propsNote).toMatch(
      /There are no children.+role, aria-orientation and aria-hidden come from decorative and orientation, and there's no tabIndex.+className and native props reach the hr or, when decorative, the div.+no margin, so the parent's gap spaces it.+Neither the hr nor the decorative div can sit inside a p, heading, button or label; use a Stack div.+A ul or ol holds only li/,
    );
    expect(separator?.keyboard).toBeUndefined();
    expect(within(section).queryByRole("table", { name: "Separator keyboard" })).toBeNull();
    for (const note of [
      /Semantic by default.+Make it decorative where headings, lists or landmarks already mark the break/,
      /Never focusable: a focusable separator is a splitter/,
      /A semantic vertical separator has aria-orientation="vertical"/,
      /subtle lines aren't contrast-checked.+strong is checked to 3:1 against every surface/,
      /In forced colors the line takes a system color, so both variants look the same/,
      /In a wrapping row, a line can start with a vertical separator/,
    ]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }
  });
});
