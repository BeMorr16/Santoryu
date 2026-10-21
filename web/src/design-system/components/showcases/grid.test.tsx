import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import gridStyles from "../../../components/Grid/Grid.module.css";
import layoutStyles from "../../../components/shared/layout.module.css";
import showcaseStyles from "../Showcase.module.css";
import {
  describeComponentPage,
  exampleTitle,
  renderComponentPage,
} from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/grid.tsx";

const renderPage = () => renderComponentPage(route, "grid");

describeComponentPage(route, "grid");

describe("Grid page examples", () => {
  it("shows the Grid examples, the column options and the legend-named fieldset (refinement R7.6)", async () => {
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => {
      const element = within(section).getByText(title, { selector: "h3" }).parentElement;
      if (element === null) throw new Error(`no ${title} example`);
      return element;
    };

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "min sm",
      "min md",
      "min lg",
      "Narrow container",
      "Row and column gaps",
      "Few items, stretched (default)",
      "Few items, stretch={false}",
      "At most two columns",
      "Semantics",
    ]);

    const list = (title: string) => within(example(title)).getByRole("list");
    for (const min of ["sm", "md", "lg"]) {
      expect(list(`min ${min}`)).toHaveClass(gridStyles[`min-${min}`] ?? "");
    }
    expect(list("Narrow container")).toHaveClass(
      showcaseStyles.narrow ?? "",
      gridStyles["min-md"] ?? "",
    );
    expect(list("Row and column gaps")).toHaveClass(
      layoutStyles["row-gap-xs"] ?? "",
      layoutStyles["column-gap-xl"] ?? "",
    );
    expect(within(list("Few items, stretched (default)")).getAllByRole("listitem")).toHaveLength(2);
    expect(list("Few items, stretched (default)")).not.toHaveClass(gridStyles.fill ?? "");
    expect(within(list("Few items, stretch={false}")).getAllByRole("listitem")).toHaveLength(2);
    expect(list("Few items, stretch={false}")).toHaveClass(gridStyles.fill ?? "");
    expect(within(list("At most two columns")).getAllByRole("listitem")).toHaveLength(4);
    expect(list("At most two columns")).toHaveClass(gridStyles["max-2"] ?? "");

    const group = within(example("Semantics")).getByRole("group", { name: "Projects to show" });
    expect(within(group).getByRole("checkbox", { name: "Personal site" })).toBeChecked();
    expect(within(group).getAllByRole("checkbox")).toHaveLength(4);

    expect(within(section).getByText(/maxColumns is a ceiling, not a count/)).toBeInTheDocument();
    for (const note of [/Grid never reorders items/, /the legend still names the group/]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }
  });
});
