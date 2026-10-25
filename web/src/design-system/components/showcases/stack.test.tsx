import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import showcaseStyles from "../Showcase.module.css";
import {
  describeComponentPage,
  exampleTitle,
  renderComponentPage,
} from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/stack.tsx";

const renderPage = () => renderComponentPage(route, "stack");

describeComponentPage(route, "stack");

describe("Stack page examples", () => {
  it("shows the Stack examples, the labelled design-system-pages list and the legend-named fieldset (refinement R6.7)", async () => {
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => {
      const element = within(section).getByText(title, { selector: "h3" }).parentElement;
      if (element === null) throw new Error(`no ${title} example`);
      return element;
    };

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "Vertical (default), gaps none to xl",
      "Horizontal, gaps none to xl",
      "Align",
      "Justify",
      "Vertical alignment",
      "Wrapping by default",
      "One line",
      "Row and column gaps",
      "Semantics",
    ]);

    const alignment = example("Vertical alignment");
    expect(within(alignment).getByRole("button", { name: "Stretched (default)" })).toBeVisible();
    expect(within(alignment).getByRole("button", { name: "align start" })).toBeVisible();
    for (const title of ["Wrapping by default", "Row and column gaps"]) {
      const list = within(example(title)).getByRole("list");
      expect(list).toHaveClass(showcaseStyles.narrow ?? "");
      expect(within(list).getAllByRole("listitem")).toHaveLength(6);
    }
    const oneLine = example("One line");
    expect(within(oneLine).getByText("Project")).toBeVisible();
    expect(within(oneLine).getByRole("button", { name: "Edit project" })).toBeVisible();

    const semantics = example("Semantics");
    const pages = within(semantics).getByRole("list", { name: "Design System pages (example)" });
    expect(within(semantics).queryByRole("navigation")).toBeNull();
    expect(
      within(pages)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/design-system", "/design-system/tokens", "/design-system/components"]);
    const group = within(semantics).getByRole("group", { name: "Contact preference" });
    expect(within(group).getByRole("radio", { name: "Email" })).toBeChecked();
    expect(within(group).getByRole("radio", { name: "Phone" })).not.toBeChecked();
  });
});
