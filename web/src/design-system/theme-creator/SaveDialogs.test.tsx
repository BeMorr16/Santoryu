import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { readCustomThemes } from "../../theme/custom-themes.ts";
import { renderCreator, typeHex } from "./theme-creator-test.tsx";

const root = document.documentElement;

afterEach(() => {
  localStorage.clear();
  root.removeAttribute("data-theme");
  root.removeAttribute("data-custom-theme");
  root.removeAttribute("style");
});

async function setup(name: string) {
  const rendered = await renderCreator();
  const field = screen.getByRole("textbox", { name: "Theme name" });
  await rendered.user.type(field, name);
  return rendered;
}

/** A pale second accent: its border fails 3:1 on the surfaces, so Save warns. */
async function failContrast(user: Awaited<ReturnType<typeof setup>>["user"]) {
  await typeHex(user, screen.getByRole("group", { name: "Second accent" }), "#f4f0fd");
}

const save = (user: Awaited<ReturnType<typeof setup>>["user"]) =>
  user.click(screen.getByRole("button", { name: "Save" }));

describe("Save (theme-creator R3)", () => {
  it("shows a name problem on the name field and focuses it (R2.6)", async () => {
    const { user } = await renderCreator();
    await typeHex(user, screen.getByRole("group", { name: "Action" }), "#2a8556");

    await save(user);

    const field = screen.getByRole("textbox", { name: "Theme name" });
    expect(field).toBeInvalid();
    expect(field).toHaveAccessibleDescription("Enter a name for the theme.");
    expect(field).toHaveFocus();
    expect(readCustomThemes()).toEqual([]);
  });

  it("refuses a duplicate of Light, naming it (R3.2)", async () => {
    const { user } = await setup("Mine");

    await save(user);

    const notice = screen.getByText(
      "This theme looks just like Light. Change something before saving it.",
    );
    expect(notice).toHaveAttribute("role", "status");
    expect(readCustomThemes()).toEqual([]);

    // A repeat is emptied first, so it's announced again: its text is removed, then added back.
    const records: MutationRecord[] = [];
    const observer = new MutationObserver((list) => {
      records.push(...list);
    });
    observer.observe(notice, { childList: true, characterData: true, subtree: true });
    await save(user);
    observer.disconnect();
    expect(records.some(({ removedNodes }) => removedNodes.length > 0)).toBe(true);
    expect(records.some(({ addedNodes }) => addedNodes.length > 0)).toBe(true);
    expect(notice).toHaveTextContent("This theme looks just like Light.");
  });

  it("saves a passing theme, announces it and doesn't select it site-wide (R3.4)", async () => {
    const { user } = await setup("Forest");
    await typeHex(user, screen.getByRole("group", { name: "Action" }), "#1e6b45");

    await save(user);

    expect(readCustomThemes().map(({ name }) => name)).toEqual(["Forest"]);
    expect(screen.getByText("Saved Forest")).toHaveAttribute("role", "status");
    expect(screen.getByText(/^Editing Forest/)).toBeInTheDocument();
    expect(root).not.toHaveAttribute("data-custom-theme");
  });

  describe("the contrast warning (R3.3)", () => {
    it("lists each failing pairing, with Keep editing focused first", async () => {
      const { user } = await setup("Pale");
      await failContrast(user);

      await save(user);

      const dialog = screen.getByRole("alertdialog", { name: /contrast issues?$/ });
      expect(within(dialog).getByRole("button", { name: "Keep editing" })).toHaveFocus();
      expect(dialog).toHaveTextContent(
        /color\.accent-2\.borderon color\.surface\.base: [\d.]+:1, needs 3:1on color\.surface\.raised/,
      );
      expect(
        within(dialog).getByRole("button", { name: "Edit color.accent-2.border" }),
      ).toBeInTheDocument();
      expect(readCustomThemes()).toEqual([]);
    });

    it("Save anyway saves and announces it, without changing the site theme", async () => {
      const { user } = await setup("Pale");
      await failContrast(user);
      await save(user);

      await user.click(screen.getByRole("button", { name: "Save anyway" }));

      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(readCustomThemes().map(({ name }) => name)).toEqual(["Pale"]);
      expect(screen.getByText("Saved Pale")).toHaveAttribute("role", "status");
      expect(root).not.toHaveAttribute("data-theme");
    });

    it("Keep editing closes it and returns focus to Save", async () => {
      const { user } = await setup("Pale");
      await failContrast(user);
      await save(user);

      await user.click(screen.getByRole("button", { name: "Keep editing" }));

      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
    });

    it("Edit <token> closes it, opens the token's disclosure and focuses its control", async () => {
      const { user } = await setup("Pale");
      await failContrast(user);
      await save(user);

      await user.click(screen.getByRole("button", { name: "Edit color.accent-2.border" }));

      expect(screen.queryByRole("alertdialog")).toBeNull();
      const group = screen.getByRole("group", { name: "color.accent-2.border" });
      expect(group.querySelector("input")).toHaveFocus();
    });
  });

  /** Saves three themes, then fills in a fourth and presses Save: the limit dialog opens. */
  async function reachLimit(user: Awaited<ReturnType<typeof setup>>["user"]) {
    for (const [index, color] of ["#1e6b45", "#b3261e", "#94440a"].entries()) {
      await typeHex(user, screen.getByRole("group", { name: "Action" }), color);
      const field = screen.getByRole("textbox", { name: "Theme name" });
      await user.clear(field);
      await user.type(field, `Theme ${String(index + 1)}`);
      await save(user);
      await user.click(screen.getByRole("button", { name: "Start from" }));
      await user.click(screen.getByRole("menuitem", { name: "Light" }));
    }
    expect(readCustomThemes()).toHaveLength(3);
    await typeHex(user, screen.getByRole("group", { name: "Action" }), "#5b3fa6");
    await user.type(screen.getByRole("textbox", { name: "Theme name" }), "Fourth");
    await save(user);
    return screen.getByRole("dialog", { name: "You have 3 saved themes" });
  }

  it("at the limit, overwrites a saved theme (R2.2)", async () => {
    const { user } = await renderCreator();
    const limit = await reachLimit(user);

    // Every other action here replaces or deletes a theme.
    expect(within(limit).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.click(within(limit).getByRole("button", { name: "Overwrite Theme 2" }));

    expect(readCustomThemes().map(({ name }) => name)).toEqual(["Theme 1", "Fourth", "Theme 3"]);
  });

  it("at the limit, deletes a saved theme after confirming, then saves (R2.2, R2.9)", async () => {
    const { user } = await renderCreator();
    const limit = await reachLimit(user);

    await user.click(within(limit).getByRole("button", { name: "Delete Theme 2" }));
    const confirm = screen.getByRole("alertdialog", { name: "Delete “Theme 2”?" });
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(readCustomThemes().map(({ name }) => name)).toEqual(["Theme 1", "Theme 3", "Fourth"]);
    expect(screen.getByText("Saved Fourth")).toBeInTheDocument();
  });
});

describe("saved themes (R2.9, R3.5)", () => {
  it("deletes after confirming, and moves the site off a deleted active theme", async () => {
    const { user } = await setup("Ocean");
    await typeHex(user, screen.getByRole("group", { name: "Action" }), "#1e6b45");
    await save(user);
    const [ocean] = readCustomThemes();
    if (!ocean) throw new Error("not saved");
    localStorage.setItem("theme", `custom:${ocean.id}`);

    await user.click(screen.getByRole("button", { name: "Saved themes (1)" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete Ocean" }));
    const confirm = screen.getByRole("alertdialog", { name: "Delete “Ocean”?" });
    expect(within(confirm).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    expect(readCustomThemes()).toEqual([]);
    expect(localStorage.getItem("theme")).toBe("light");
    expect(root).toHaveAttribute("data-theme", "light");
  });

  it("re-saving the active theme applies the new values site-wide (R3.5)", async () => {
    const { user } = await setup("Ocean");
    await typeHex(user, screen.getByRole("group", { name: "Action" }), "#1e6b45");
    await save(user);
    const [ocean] = readCustomThemes();
    if (!ocean) throw new Error("not saved");
    localStorage.setItem("theme", `custom:${ocean.id}`);

    await typeHex(user, screen.getByRole("group", { name: "Action" }), "#94440a");
    await save(user);

    expect(root.style.getPropertyValue("--color-action-background")).toBe("#94440a");
  });

  it("renames a saved theme in a dialog", async () => {
    const { user } = await setup("Ocean");
    await typeHex(user, screen.getByRole("group", { name: "Action" }), "#1e6b45");
    await save(user);

    await user.click(screen.getByRole("button", { name: "Saved themes (1)" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename Ocean" }));
    const dialog = screen.getByRole("dialog", { name: "Rename theme" });
    const field = within(dialog).getByRole("textbox", { name: "Theme name" });
    await user.clear(field);
    await user.click(within(dialog).getByRole("button", { name: "Rename" }));
    expect(field).toHaveAccessibleDescription("Enter a name for the theme.");
    expect(field).toHaveFocus();
    await user.type(field, "Harbor");
    await user.click(within(dialog).getByRole("button", { name: "Rename" }));

    expect(readCustomThemes().map(({ name }) => name)).toEqual(["Harbor"]);
    expect(screen.getByText(/^Editing Harbor/)).toBeInTheDocument();
  });
});

describe("starting points and discarding (R2.4, R11.2)", () => {
  it("confirms before starting from a preset over unsaved changes", async () => {
    const { user } = await setup("Mine");

    await user.click(screen.getByRole("button", { name: "Start from" }));
    await user.click(screen.getByRole("menuitem", { name: "Compact" }));
    const confirm = screen.getByRole("alertdialog", { name: "Start from Compact?" });
    expect(within(confirm).getByRole("button", { name: "Keep editing" })).toHaveFocus();
    await user.click(within(confirm).getByRole("button", { name: "Start over" }));

    expect(screen.getByRole("textbox", { name: "Theme name" })).toHaveValue("");
    expect(screen.getByRole("slider", { name: "Corner radius" })).toHaveValue("0");
  });

  it("discards back to the starting point after confirming", async () => {
    const { user } = await setup("Mine");
    expect(screen.getByText(/Unsaved changes/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    await user.click(
      within(screen.getByRole("alertdialog", { name: "Discard changes?" })).getByRole("button", {
        name: "Discard",
      }),
    );

    expect(screen.getByRole("textbox", { name: "Theme name" })).toHaveValue("");
    expect(screen.queryByText(/Unsaved changes/)).toBeNull();
  });
});
