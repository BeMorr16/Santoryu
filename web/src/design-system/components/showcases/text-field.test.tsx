import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import * as route from "../../../routes/design-system/components/text-field.tsx";
import {
  describeComponentPage,
  exampleTitle,
  renderComponentPage,
  showcases,
} from "../component-page-test.tsx";

const renderPage = () => renderComponentPage(route, "text-field");

describeComponentPage(route, "text-field");

describe("TextField page examples (ds-tokens §11.6)", () => {
  it("shows the main example: a required email field with a hint", async () => {
    await renderPage();
    const main = screen.getByRole("group", { name: "TextField example" });

    const email = within(main).getByRole("textbox", { name: "Email" });
    expect(email).toBeRequired();
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(email).toHaveAccessibleDescription("Only used to reply to you.");
  });

  it("shows each example in order, each with its own field", async () => {
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => within(section).getByRole("group", { name: title });

    expect([...section.querySelectorAll(exampleTitle)].map((label) => label.textContent)).toEqual([
      "Hint",
      "Error",
      "Required",
      "Sizes",
      "Search",
      "Clearable",
      "Start icon",
      "Hidden label",
      "Disabled",
    ]);
    expect(within(example("Hint")).getByRole("textbox")).toHaveAccessibleDescription(
      "Letters and numbers only.",
    );
    expect(within(example("Error")).getByRole("textbox")).toBeInvalid();
    expect(within(example("Required")).getByRole("textbox")).toBeRequired();
    expect(within(example("Sizes")).getAllByRole("textbox")).toHaveLength(2);
    expect(
      within(example("Search")).getByRole("button", { name: "Clear Search the docs" }),
    ).toBeInTheDocument();
    expect(
      within(example("Clearable")).getByRole("button", { name: "Clear Display name" }),
    ).toBeInTheDocument();
    expect(example("Start icon").querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(
      within(example("Hidden label")).getByRole("searchbox", { name: "Search this page" }),
    ).toBeInTheDocument();
    expect(within(example("Disabled")).getByRole("textbox")).toBeDisabled();
  });

  it("clears the Search example with its button, keeping focus in the field", async () => {
    const user = userEvent.setup();
    await renderPage();
    const search = screen.getByRole("group", { name: "Search" });

    await user.click(within(search).getByRole("button", { name: "Clear Search the docs" }));

    const field = within(search).getByRole("searchbox", { name: "Search the docs" });
    expect(field).toHaveValue("");
    expect(field).toHaveFocus();
  });

  it("documents its props, the native props' target, the keyboard and accessibility", async () => {
    await renderPage();
    const textField = showcases.find((s) => s.id === "text-field");

    expect(textField?.props.map(({ part, docs }) => [part, Object.keys(docs)])).toEqual([
      [
        "TextField",
        [
          "label",
          "hideLabel",
          "hint",
          "error",
          "type",
          "size",
          "iconStart",
          "clearable",
          "clearLabel",
        ],
      ],
    ]);
    expect(textField?.propsNote).toMatch(
      /go to the <input>.+className and style go to the wrapper/,
    );
    const keyboard = screen.getByRole("table", { name: "TextField keyboard" });
    expect(
      within(keyboard)
        .getAllByRole("rowheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Tab", "Escape"]);
    expect(screen.getByText(/^A native <input> with a visible <label>/)).toBeInTheDocument();
  });
});
