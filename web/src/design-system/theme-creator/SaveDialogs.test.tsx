import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { readCustomThemes } from "../../theme/custom-themes.ts";
import {
  cardAction,
  makeChange,
  newTheme,
  proposedName,
  renderCreator,
  saveDialog,
  saveNamed,
  toolbarSave,
  typeHex,
} from "./theme-creator-test.tsx";

const root = document.documentElement;

afterEach(() => {
  localStorage.clear();
  root.removeAttribute("data-theme");
  root.removeAttribute("data-custom-theme");
  root.removeAttribute("style");
});

type User = Awaited<ReturnType<typeof renderCreator>>["user"];

/** A pale second accent: its border fails 3:1 on the surfaces, so Save warns. */
async function failContrast(user: User) {
  await typeHex(user, screen.getByRole("group", { name: "Second accent" }), "#f4f0fd");
}

const save = (user: User) => user.click(toolbarSave());

/** Saves a new theme named `name`, with its own Action color; the draft then edits it. */
async function saveTheme(user: User, name: string, color: string) {
  await makeChange(user, color);
  await saveNamed(user, name);
}

describe("Save (theme-creator R3; theme-creator-controls R4.1, R4.4)", () => {
  it("asks for a new theme's name in a dialog, prefilled with the draft's name", async () => {
    const { user } = await renderCreator();
    await makeChange(user);

    await save(user);

    const dialog = saveDialog();
    expect(within(dialog).getByRole("textbox", { name: "Theme name" })).toHaveValue("");
    expect(within(dialog).getByRole("textbox", { name: "Theme name" })).toHaveFocus();
    expect(readCustomThemes()).toEqual([]);
  });

  it("shows a name problem in the dialog's field and focuses it (R2.6)", async () => {
    const { user } = await renderCreator();
    await typeHex(user, screen.getByRole("group", { name: "Action" }), "#2a8556");
    await save(user);

    await user.click(within(saveDialog()).getByRole("button", { name: "Save" }));

    const field = within(saveDialog()).getByRole("textbox", { name: "Theme name" });
    expect(field).toBeInvalid();
    expect(field).toHaveAccessibleDescription("Enter a name for the theme.");
    expect(field).toHaveFocus();
    expect(readCustomThemes()).toEqual([]);
  });

  it("Cancel in the name dialog saves nothing and returns focus to Save", async () => {
    const { user } = await renderCreator();
    await makeChange(user);
    await save(user);

    await user.click(within(saveDialog()).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(readCustomThemes()).toEqual([]);
    expect(toolbarSave()).toHaveFocus();
  });

  it("refuses a duplicate of Light, naming it (R3.2)", async () => {
    const { user } = await renderCreator();

    await saveNamed(user, "Mine");

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
    await saveNamed(user, "Mine");
    observer.disconnect();
    expect(records.some(({ removedNodes }) => removedNodes.length > 0)).toBe(true);
    expect(records.some(({ addedNodes }) => addedNodes.length > 0)).toBe(true);
    expect(notice).toHaveTextContent("This theme looks just like Light.");
  });

  it("saves a passing theme, announces it and doesn't select it site-wide (R3.4)", async () => {
    const { user } = await renderCreator();

    await saveTheme(user, "Forest", "#1e6b45");

    expect(readCustomThemes().map(({ name }) => name)).toEqual(["Forest"]);
    expect(screen.getByText("Saved Forest")).toHaveAttribute("role", "status");
    expect(screen.getByText(/^Editing Forest/)).toBeInTheDocument();
    expect(root).not.toHaveAttribute("data-custom-theme");
  });

  it("saves a theme being edited in place, without asking its name again", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Forest", "#1e6b45");
    const [forest] = readCustomThemes();
    await makeChange(user, "#94440a");

    await save(user);

    expect(screen.queryByRole("dialog")).toBeNull();
    const themes = readCustomThemes();
    expect(themes).toHaveLength(1);
    expect(themes[0]).toMatchObject({ id: forest?.id, name: "Forest" });
    expect(themes[0]?.vars["--color-action-background"]).toBe("#94440a");
  });

  describe("the contrast warning (R3.3)", () => {
    it("lists each failing pairing, with Keep editing focused first", async () => {
      const { user } = await renderCreator();
      await failContrast(user);

      await saveNamed(user, "Pale");

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
      const { user } = await renderCreator();
      await failContrast(user);
      await saveNamed(user, "Pale");

      await user.click(screen.getByRole("button", { name: "Save anyway" }));

      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(readCustomThemes().map(({ name }) => name)).toEqual(["Pale"]);
      expect(screen.getByText("Saved Pale")).toHaveAttribute("role", "status");
      expect(root).not.toHaveAttribute("data-theme");
    });

    it("Keep editing closes it and returns focus to Save, past the name dialog (WCAG 2.4.3)", async () => {
      const { user } = await renderCreator();
      await failContrast(user);
      await saveNamed(user, "Pale");

      await user.click(screen.getByRole("button", { name: "Keep editing" }));

      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(toolbarSave()).toHaveFocus();
    });

    it("Edit <token> closes it, opens the token's disclosure and focuses its control", async () => {
      const { user } = await renderCreator();
      await failContrast(user);
      await saveNamed(user, "Pale");

      await user.click(screen.getByRole("button", { name: "Edit color.accent-2.border" }));

      expect(screen.queryByRole("alertdialog")).toBeNull();
      const group = screen.getByRole("group", { name: "color.accent-2.border" });
      expect(group.querySelector("input")).toHaveFocus();
    });
  });

  /** Saves three themes, then changes a fourth and names it: the limit dialog opens. */
  async function reachLimit(user: User) {
    for (const [index, color] of ["#1e6b45", "#b3261e", "#94440a"].entries()) {
      await saveTheme(user, `Theme ${String(index + 1)}`, color);
      await newTheme(user, "Light");
    }
    expect(readCustomThemes()).toHaveLength(3);
    await saveTheme(user, "Fourth", "#5b3fa6");
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
    const { user } = await renderCreator();
    await saveTheme(user, "Ocean", "#1e6b45");
    const [ocean] = readCustomThemes();
    if (!ocean) throw new Error("not saved");
    localStorage.setItem("theme", `custom:${ocean.id}`);

    await cardAction(user, "Ocean", "Delete");
    const confirm = screen.getByRole("alertdialog", { name: "Delete “Ocean”?" });
    expect(within(confirm).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    expect(readCustomThemes()).toEqual([]);
    expect(localStorage.getItem("theme")).toBe("light");
    expect(root).toHaveAttribute("data-theme", "light");
  });

  it("re-saving the active theme applies the new values site-wide (R3.5)", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Ocean", "#1e6b45");
    const [ocean] = readCustomThemes();
    if (!ocean) throw new Error("not saved");
    localStorage.setItem("theme", `custom:${ocean.id}`);

    await makeChange(user, "#94440a");
    await save(user);

    expect(root.style.getPropertyValue("--color-action-background")).toBe("#94440a");
  });

  it("renames a saved theme in a dialog", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Ocean", "#1e6b45");

    await cardAction(user, "Ocean", "Rename");
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
    const { user } = await renderCreator();
    await makeChange(user);

    await newTheme(user, "Compact");
    const confirm = screen.getByRole("alertdialog", { name: "Start from Compact?" });
    expect(within(confirm).getByRole("button", { name: "Keep editing" })).toHaveFocus();
    await user.click(within(confirm).getByRole("button", { name: "Start over" }));

    expect(screen.getByText(/^New theme from Compact · All contrast/)).toBeInTheDocument();
    expect(await proposedName(user)).toBe("");
    expect(screen.getByRole("slider", { name: "Corner radius" })).toHaveValue("0");
  });

  it("discards back to the starting point after confirming", async () => {
    const { user } = await renderCreator();
    await makeChange(user);
    expect(screen.getByText(/Unsaved changes/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    await user.click(
      within(screen.getByRole("alertdialog", { name: "Discard changes?" })).getByRole("button", {
        name: "Discard",
      }),
    );

    expect(
      within(screen.getByRole("group", { name: "Action" })).getByRole("textbox", { name: "Hex" }),
    ).not.toHaveValue("#1e6b45");
    expect(screen.queryByText(/Unsaved changes/)).toBeNull();
  });
});

describe("Save as new (theme-creator-controls R4.5)", () => {
  async function openSaveAsNew(user: User) {
    await user.click(screen.getByRole("button", { name: "Save as new" }));
    const dialog = screen.getByRole("dialog", { name: "Save as new theme" });
    return { dialog, field: within(dialog).getByRole("textbox", { name: "Theme name" }) };
  }

  it("is offered only while editing a saved theme, prefilled “<name> copy”", async () => {
    const { user } = await renderCreator();
    expect(screen.queryByRole("button", { name: "Save as new" })).toBeNull();
    await saveTheme(user, "Ocean", "#1e6b45");

    const { field } = await openSaveAsNew(user);

    expect(field).toHaveValue("Ocean copy");
  });

  it("shows a name problem in the dialog's own field, and saves nothing", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Ocean", "#1e6b45");
    const { dialog, field } = await openSaveAsNew(user);

    await user.clear(field);
    await user.type(field, "ocean");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(field).toBeInvalid();
    expect(field).toHaveAccessibleDescription("You already have a theme named Ocean.");
    expect(field).toHaveFocus();
    // The dialog's field is the only name field on the page.
    expect(screen.getAllByRole("textbox", { name: "Theme name" })).toEqual([field]);
    expect(readCustomThemes().map(({ name }) => name)).toEqual(["Ocean"]);
  });

  it("Cancel changes nothing", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Ocean", "#94440a");
    await makeChange(user, "#1e6b45");
    const before = readCustomThemes();
    const { dialog } = await openSaveAsNew(user);

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(readCustomThemes()).toBe(before);
    expect(screen.getByText(/^Editing Ocean · Unsaved changes/)).toBeInTheDocument();
  });

  it("saves a new theme, leaves the original as it was, and edits the new one", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Ocean", "#94440a");
    const [original] = readCustomThemes();
    await makeChange(user, "#1e6b45");
    const { dialog } = await openSaveAsNew(user);

    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    const themes = readCustomThemes();
    expect(themes.map(({ name }) => name)).toEqual(["Ocean", "Ocean copy"]);
    expect(themes[0]).toEqual(original);
    expect(themes[1]?.vars["--color-action-background"]).toBe("#1e6b45");
    expect(screen.getByText("Saved Ocean copy")).toHaveAttribute("role", "status");
    expect(screen.getByText(/^Editing Ocean copy · All contrast/)).toBeInTheDocument();
    const copy = screen.getByRole("heading", { level: 3, name: "Ocean copy" }).closest("li");
    expect(copy && within(copy).getByText("Editing")).toBeInTheDocument();
  });

  it("refuses an unchanged copy as a duplicate of the original", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Ocean", "#1e6b45");
    const { dialog } = await openSaveAsNew(user);

    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(
      screen.getByText("This theme looks just like Ocean. Change something before saving it."),
    ).toHaveAttribute("role", "status");
    expect(readCustomThemes()).toHaveLength(1);
  });

  it("shows the contrast warning, and Save anyway saves the new theme", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Ocean", "#1e6b45");
    const [original] = readCustomThemes();
    await failContrast(user);
    const { dialog, field } = await openSaveAsNew(user);
    await user.clear(field);
    await user.type(field, "Pale");

    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    const warning = screen.getByRole("alertdialog", { name: /contrast issues?$/ });
    expect(readCustomThemes()).toHaveLength(1);
    await user.click(within(warning).getByRole("button", { name: "Save anyway" }));

    expect(readCustomThemes().map(({ name }) => name)).toEqual(["Ocean", "Pale"]);
    expect(readCustomThemes()[0]).toEqual(original);
    expect(screen.getByText("Saved Pale")).toHaveAttribute("role", "status");
  });

  it("returns focus to Save as new when the contrast warning it led to closes (WCAG 2.4.3)", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Ocean", "#1e6b45");
    await failContrast(user);
    const { dialog } = await openSaveAsNew(user);

    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    const warning = screen.getByRole("alertdialog", { name: /contrast issues?$/ });
    await user.click(within(warning).getByRole("button", { name: "Keep editing" }));

    expect(screen.getByRole("button", { name: "Save as new" })).toHaveFocus();
  });

  /** Saves three themes; the draft then edits the third, with a further change. */
  async function saveThree(user: User) {
    await saveTheme(user, "Theme 1", "#1e6b45");
    await newTheme(user, "Light");
    await saveTheme(user, "Theme 2", "#b3261e");
    await newTheme(user, "Light");
    await saveTheme(user, "Theme 3", "#94440a");
    await makeChange(user, "#5b3fa6");
  }

  it("at the limit, opens the limit dialog, and Overwrite saves under the new name", async () => {
    const { user } = await renderCreator();
    await saveThree(user);
    const third = readCustomThemes()[2];
    const { dialog, field } = await openSaveAsNew(user);
    await user.clear(field);
    await user.type(field, "Fourth");

    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    const limit = screen.getByRole("dialog", { name: "You have 3 saved themes" });
    await user.click(within(limit).getByRole("button", { name: "Overwrite Theme 2" }));

    const themes = readCustomThemes();
    expect(themes.map(({ name }) => name)).toEqual(["Theme 1", "Fourth", "Theme 3"]);
    expect(themes[1]?.vars["--color-action-background"]).toBe("#5b3fa6");
    expect(themes[2]).toEqual(third);
    expect(screen.getByText(/^Editing Fourth/)).toBeInTheDocument();
  });

  it("returns focus to Save as new when the limit dialog it led to is canceled", async () => {
    const { user } = await renderCreator();
    await saveThree(user);
    const { dialog } = await openSaveAsNew(user);

    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    const limit = screen.getByRole("dialog", { name: "You have 3 saved themes" });
    await user.click(within(limit).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Save as new" })).toHaveFocus();
  });
});

describe("the name dialog after a change elsewhere", () => {
  it("reopens with the problem when another tab took the name meanwhile", async () => {
    const { user } = await renderCreator();
    await makeChange(user);
    await save(user);
    const field = within(saveDialog()).getByRole("textbox", { name: "Theme name" });
    await user.type(field, "Harbor");
    // Another tab saves a theme with that name before this one is submitted.
    localStorage.setItem(
      "custom-themes",
      JSON.stringify({
        v: 1,
        themes: [
          {
            id: "tab00001",
            name: "Harbor",
            scheme: "dark",
            vars: {},
            source: { base: "dark", keys: {}, overrides: { semantic: {}, component: {} } },
          },
        ],
      }),
    );

    await user.click(within(saveDialog()).getByRole("button", { name: "Save" }));

    expect(
      within(saveDialog()).getByRole("textbox", { name: "Theme name" }),
    ).toHaveAccessibleDescription("You already have a theme named Harbor.");
    expect(readCustomThemes().map(({ name }) => name)).toEqual(["Harbor"]);
  });
});
