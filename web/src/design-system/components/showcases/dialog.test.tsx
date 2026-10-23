import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import * as route from "../../../routes/design-system/components/dialog.tsx";
import {
  describeComponentPage,
  exampleTitle,
  renderComponentPage,
  showcases,
} from "../component-page-test.tsx";

const renderPage = () => renderComponentPage(route, "dialog");

describeComponentPage(route, "dialog");

describe("Dialog page examples (theme-creator design §11.4)", () => {
  it("shows the main example: a confirmation alertdialog focused on its least destructive action", async () => {
    const user = userEvent.setup();
    await renderPage();
    const main = screen.getByRole("group", { name: "Dialog example" });
    const trigger = within(main).getByRole("button", { name: "Delete theme" });

    await user.click(trigger);
    const dialog = screen.getByRole("alertdialog", { name: "Delete “Ocean”?" });
    expect(dialog).toHaveAccessibleDescription(
      "The theme is removed from this browser. This can’t be undone.",
    );
    expect(within(dialog).getByRole("button", { name: "Keep theme" })).toHaveFocus();

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(trigger).toHaveFocus();
    expect(within(main).getByRole("status")).toHaveTextContent("Deleted “Ocean”.");
  });

  it("shows each example in order, each opening its own dialog", async () => {
    const user = userEvent.setup();
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => within(section).getByRole("group", { name: title });

    expect([...section.querySelectorAll(exampleTitle)].map((label) => label.textContent)).toEqual([
      "Form",
      "Full size",
      "No backdrop close",
      "Long body",
    ]);

    await user.click(within(example("Form")).getByRole("button", { name: "Rename theme" }));
    const form = screen.getByRole("dialog", { name: "Rename theme" });
    const name = within(form).getByRole("textbox", { name: "Theme name" });
    expect(name).toHaveFocus();
    await user.clear(name);
    await user.type(name, "Harbor");
    await user.click(within(form).getByRole("button", { name: "Rename" }));
    expect(within(example("Form")).getByRole("status")).toHaveTextContent("Renamed to “Harbor”.");

    await user.click(
      within(example("Full size")).getByRole("button", { name: "Open full dialog" }),
    );
    await user.keyboard("{Escape}");

    await user.click(
      within(example("No backdrop close")).getByRole("button", {
        name: "Open without backdrop close",
      }),
    );
    const sticky = screen.getByRole("dialog", { name: "Unsaved changes" });
    await user.click(sticky);
    expect(sticky).toBeVisible();
    await user.keyboard("{Escape}");

    await user.click(
      within(example("Long body")).getByRole("button", { name: "Open long dialog" }),
    );
    expect(screen.getByRole("dialog", { name: "How themes are kept" })).toBeVisible();
  });

  it("documents each part's props, the keyboard and accessibility", async () => {
    await renderPage();
    const dialog = showcases.find((s) => s.id === "dialog");

    expect(dialog?.props.map(({ part, docs }) => [part, Object.keys(docs)])).toEqual([
      [
        "Dialog",
        [
          "open",
          "onClose",
          "onComplete",
          "title",
          "titleIcon",
          "titleLevel",
          "size",
          "closeOnBackdrop",
          "closeOnEsc",
          "role",
          "initialFocus",
          "children",
        ],
      ],
      ["DialogActions", ["justify"]],
      ["DialogButton", ["result"]],
    ]);
    const keyboard = screen.getByRole("table", { name: "Dialog keyboard" });
    expect(
      within(keyboard)
        .getAllByRole("rowheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Tab / Shift+Tab", "Escape", "Enter / Space"]);
    expect(screen.getByText(/^Focus moves into the dialog on open/)).toBeInTheDocument();
  });
});
