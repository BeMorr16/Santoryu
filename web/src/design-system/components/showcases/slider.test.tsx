import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import * as route from "../../../routes/design-system/components/slider.tsx";
import {
  describeComponentPage,
  exampleTitle,
  renderComponentPage,
  showcases,
} from "../component-page-test.tsx";

const renderPage = () => renderComponentPage(route, "slider");

describeComponentPage(route, "slider");

describe("Slider page examples (theme-creator design §12)", () => {
  it("shows the main example: a corner radius slider with its value in pixels", async () => {
    await renderPage();
    const main = screen.getByRole("group", { name: "Slider example" });

    const slider = within(main).getByRole("slider", { name: "Corner radius" });
    expect(slider).toHaveValue("4");
    expect(slider).toHaveAttribute("aria-valuetext", "4px");
    expect(within(main).getByText("4px")).toBeVisible();
  });

  it("shows each example in order", async () => {
    const user = userEvent.setup();
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => within(section).getByRole("group", { name: title });

    expect([...section.querySelectorAll(exampleTitle)].map((label) => label.textContent)).toEqual([
      "Marks",
      "Hint",
      "Controlled",
      "Hidden label",
      "Disabled",
    ]);
    expect(within(example("Marks")).getByRole("slider")).toHaveAttribute(
      "aria-valuetext",
      "Default, 4px",
    );
    expect(within(example("Hint")).getByRole("slider")).toHaveAccessibleDescription(
      "How much larger headings are than body text.",
    );
    const controlled = within(example("Controlled")).getByRole("slider");
    controlled.focus();
    await user.keyboard("{End}");
    expect(within(example("Controlled")).getByText("4", { selector: "code" })).toBeVisible();
    expect(
      within(example("Hidden label")).getByRole("slider", { name: "Preview zoom" }),
    ).toBeInTheDocument();
    expect(within(example("Disabled")).getByRole("slider")).toBeDisabled();
  });

  it("documents its props, the native props' target, the keyboard and accessibility", async () => {
    await renderPage();
    const slider = showcases.find((s) => s.id === "slider");

    expect(slider?.props.map(({ part, docs }) => [part, Object.keys(docs)])).toEqual([
      ["Slider", ["label", "hideLabel", "hint", "formatValue", "marks", "onValueChange"]],
    ]);
    expect(slider?.propsNote).toMatch(/go to the <input>.+className and style go to the wrapper/);
    const keyboard = screen.getByRole("table", { name: "Slider keyboard" });
    expect(within(keyboard).getAllByRole("rowheader")).toHaveLength(4);
    expect(screen.getByText(/^A native <input type="range">/)).toBeInTheDocument();
  });
});
