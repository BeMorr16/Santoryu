import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import cardStyles from "../../components/Card/Card.module.css";
import type { StoredTheme } from "../../theme/custom-themes.ts";
import { emptySource } from "./model/draft.ts";
import { ThemeCard } from "./ThemeCard.tsx";

const ocean: StoredTheme = {
  id: "ocean123",
  name: "Ocean",
  scheme: "dark",
  vars: { "--color-action-background": "#1e6b45" },
  source: emptySource("dark"),
};

function renderCard({ inUse = false, editing = false } = {}) {
  const user = userEvent.setup();
  const onEdit = vi.fn();
  const onAction = vi.fn();
  const result = render(
    <ul>
      <ThemeCard
        theme={ocean}
        inUse={inUse}
        editing={editing}
        onEdit={onEdit}
        onAction={onAction}
      />
    </ul>,
  );
  return { user, onEdit, onAction, ...result };
}

const more = () => screen.getByRole("button", { name: "More actions for Ocean" });
const itemNames = () => screen.getAllByRole("menuitem").map((item) => item.textContent);

describe("ThemeCard (theme-creator-controls R2.2, R2.5, R2.6, R2.11)", () => {
  it("is a list item headed by the theme's name, with its scheme as text", () => {
    renderCard();

    const card = screen.getByRole("listitem");
    expect(within(card).getByRole("heading", { level: 3, name: "Ocean" })).toBeInTheDocument();
    expect(within(card).getByText("Dark")).toBeInTheDocument();
    expect(within(card).queryByText("In use")).toBeNull();
    expect(within(card).queryByText("Editing")).toBeNull();
  });

  it("names its controls after the theme, starting with their visible text (R6.2)", () => {
    renderCard();

    expect(screen.getByRole("button", { name: "Edit Ocean" })).toHaveTextContent(/^Edit/);
    expect(more()).toHaveTextContent(/^More/);
    expect(more()).toHaveAttribute("aria-haspopup", "menu");
  });

  it("shows the In use and Editing badges", () => {
    renderCard({ inUse: true, editing: true });

    expect(screen.getByText("In use")).toBeInTheDocument();
    expect(screen.getByText("Editing")).toBeInTheDocument();
  });

  it("is outlined while the draft edits it, as well as badged, and raised otherwise (R2.5)", () => {
    const { rerender } = renderCard();
    expect(screen.getByRole("listitem")).toHaveClass(cardStyles.raised ?? "");

    rerender(
      <ul>
        <ThemeCard theme={ocean} inUse={false} editing onEdit={vi.fn()} onAction={vi.fn()} />
      </ul>,
    );

    expect(screen.getByRole("listitem")).toHaveClass(cardStyles.outlined ?? "");
    expect(screen.getByRole("listitem")).not.toHaveClass(cardStyles.raised ?? "");
  });

  it("disables Edit with its reason while the draft edits this theme (R2.5)", async () => {
    const { user, onEdit } = renderCard({ editing: true });

    const edit = screen.getByRole("button", { name: "Edit Ocean" });
    expect(edit).toHaveAttribute("aria-disabled", "true");
    expect(edit).toHaveAccessibleDescription("You’re editing this theme");
    await user.click(edit);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("calls Edit", async () => {
    const { user, onEdit } = renderCard();

    await user.click(screen.getByRole("button", { name: "Edit Ocean" }));

    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("offers Use on site, Duplicate, Rename, then Delete after a separator", async () => {
    const { user } = renderCard();

    await user.click(more());

    const menu = screen.getByRole("menu", { name: "More actions for Ocean" });
    expect(itemNames()).toEqual(["Use on site", "Duplicate", "Rename", "Delete"]);
    const separator = within(menu).getByRole("separator");
    expect(separator.nextElementSibling).toHaveTextContent("Delete");
  });

  it("omits Use on site while the theme is in use", async () => {
    const { user } = renderCard({ inUse: true });

    await user.click(more());

    expect(itemNames()).toEqual(["Duplicate", "Rename", "Delete"]);
  });

  it("works from the keyboard: Enter opens, arrows move, Escape closes, Space chooses", async () => {
    const { user, onAction } = renderCard();
    more().focus();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("menuitem", { name: "Use on site" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(more()).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    await user.keyboard(" ");
    expect(onAction).toHaveBeenCalledWith("delete");
    expect(more()).toHaveFocus();
  });

  it.each([
    ["Use on site", "useOnSite"],
    ["Duplicate", "duplicate"],
    ["Rename", "rename"],
    ["Delete", "delete"],
  ])("calls its action for %s", async (name, action) => {
    const { user, onAction } = renderCard();

    await user.click(more());
    await user.click(screen.getByRole("menuitem", { name }));

    expect(onAction).toHaveBeenCalledExactlyOnceWith(action);
  });

  it("draws a sample in the theme, hidden from assistive technology and inert (R2.11)", () => {
    const { container } = renderCard();

    const sample = container.querySelector<HTMLElement>("[data-theme='dark']");
    expect(sample?.style.getPropertyValue("--color-action-background")).toBe("#1e6b45");
    const frame = sample?.closest("[aria-hidden='true']");
    expect(frame).toHaveAttribute("inert");
    // Only the card's own controls are exposed: the sample's button isn't.
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Edit Ocean",
      "More actions for Ocean",
    ]);
  });

  it("has no axe violations, editing and in use", async () => {
    const { container } = renderCard({ inUse: true, editing: true });

    await expectNoAxeViolations(container);
  });
});
