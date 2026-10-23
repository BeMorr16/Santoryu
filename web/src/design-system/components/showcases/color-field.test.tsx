import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import * as route from "../../../routes/design-system/components/color-field.tsx";
import {
  describeComponentPage,
  exampleTitle,
  renderComponentPage,
  showcases,
} from "../component-page-test.tsx";

const renderPage = () => renderComponentPage(route, "color-field");

describeComponentPage(route, "color-field");

describe("ColorField page examples (theme-creator design §13)", () => {
  it("shows the main example: an action color with a hint and four swatches", async () => {
    await renderPage();
    const main = screen.getByRole("group", { name: "ColorField example" });

    const field = within(main).getByRole("group", { name: "Action color" });
    expect(field).toHaveAccessibleDescription("Buttons and links use it.");
    expect(within(field).getByRole("textbox", { name: "Hex" })).toHaveValue("#185480");
    const swatches = within(field).getByRole("group", { name: "Suggested colors" });
    expect(
      within(swatches)
        .getAllByRole("button")
        .map((button) => button.ariaLabel),
    ).toEqual(["Blue 700", "Gold 500", "Violet 600", "Green 600"]);
    expect(within(swatches).getByRole("button", { name: "Blue 700" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows each example in order", async () => {
    const user = userEvent.setup();
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => within(section).getByRole("group", { name: title });

    expect([...section.querySelectorAll(exampleTitle)].map((label) => label.textContent)).toEqual([
      "Hex only",
      "Controlled",
      "Invalid hex",
      "Disabled",
    ]);
    expect(within(example("Hex only")).queryByRole("button")).toBeNull();

    await user.click(within(example("Controlled")).getByRole("button", { name: "Violet 800" }));
    expect(within(example("Controlled")).getByText("#3d2875", { selector: "code" })).toBeVisible();

    const hex = within(example("Invalid hex")).getByRole("textbox", { name: "Hex" });
    await user.clear(hex);
    await user.type(hex, "#12");
    await user.tab();
    expect(hex).toBeInvalid();

    expect(within(example("Disabled")).getByRole("group", { name: "Status color" })).toBeDisabled();
  });

  it("documents its props, the keyboard and accessibility", async () => {
    await renderPage();
    const colorField = showcases.find((s) => s.id === "color-field");

    expect(colorField?.props.map(({ part, docs }) => [part, Object.keys(docs)])).toEqual([
      [
        "ColorField",
        [
          "label",
          "hint",
          "value",
          "defaultValue",
          "onValueChange",
          "swatches",
          "swatchesLabel",
          "disabled",
        ],
      ],
    ]);
    const keyboard = screen.getByRole("table", { name: "ColorField keyboard" });
    expect(within(keyboard).getAllByRole("rowheader")).toHaveLength(2);
    expect(screen.getByText(/^The value is always shown as hex text/)).toBeInTheDocument();
  });
});
