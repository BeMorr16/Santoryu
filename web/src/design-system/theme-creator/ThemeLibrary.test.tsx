import { act, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CUSTOM_THEMES_KEY, readCustomThemes } from "../../theme/custom-themes.ts";
import { emptySource } from "./model/draft.ts";
import {
  makeChange,
  newTheme,
  proposedName,
  renderCreator,
  saveNamed,
} from "./theme-creator-test.tsx";

const root = document.documentElement;

afterEach(() => {
  localStorage.clear();
  root.removeAttribute("data-theme");
  root.removeAttribute("data-custom-theme");
  root.removeAttribute("style");
  vi.restoreAllMocks();
});

const library = () => screen.getByRole("region", { name: "Your themes" });
const cardNames = () =>
  within(library())
    .queryAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
const card = (name: string) => {
  const item = within(library()).getByRole("heading", { level: 3, name }).closest("li");
  if (!item) throw new Error(`no card for ${name}`);
  return item;
};

async function saveTheme(
  user: Awaited<ReturnType<typeof renderCreator>>["user"],
  name: string,
  color: string,
) {
  await makeChange(user, color);
  await saveNamed(user, name);
}

describe("Your themes (theme-creator-controls R2)", () => {
  it("is headed “Your themes”, with the count and the empty sentence when none are saved", async () => {
    await renderCreator();

    expect(within(library()).getByRole("heading", { level: 2 })).toHaveTextContent("Your themes");
    expect(within(library()).getByText("0 of 3 saved")).toBeInTheDocument();
    expect(
      within(library()).getByText(
        "No saved themes yet. Make changes below and save to keep up to three.",
      ),
    ).toBeInTheDocument();
    expect(within(library()).queryByRole("list")).toBeNull();
  });

  it("always says where themes are kept (R2.4)", async () => {
    await renderCreator();

    expect(
      within(library()).getByText("Themes are saved in this browser. Export one to keep a copy."),
    ).toBeVisible();
  });

  it("shows a card per saved theme, in creation order, and counts them", async () => {
    const { user } = await renderCreator();

    await saveTheme(user, "Forest", "#1e6b45");
    await newTheme(user, "Light");
    await saveTheme(user, "Brick", "#b3261e");

    expect(cardNames()).toEqual(["Forest", "Brick"]);
    expect(within(library()).getAllByRole("listitem")).toHaveLength(2);
    expect(within(library()).getByText("2 of 3 saved")).toBeInTheDocument();
    expect(within(library()).queryByText(/^No saved themes yet/)).toBeNull();
  });

  it("marks the theme being edited, and disables its Edit", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Forest", "#1e6b45");

    expect(within(card("Forest")).getByText("Editing")).toBeInTheDocument();
    expect(within(card("Forest")).getByRole("button", { name: "Edit Forest" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await newTheme(user, "Light");

    expect(within(card("Forest")).queryByText("Editing")).toBeNull();
    expect(within(card("Forest")).getByRole("button", { name: "Edit Forest" })).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  it("Edit loads the theme, confirming first over unsaved changes", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Forest", "#1e6b45");
    await newTheme(user, "Light");
    await makeChange(user, "#94440a");

    await user.click(screen.getByRole("button", { name: "Edit Forest" }));
    const confirm = screen.getByRole("alertdialog", { name: "Start from Forest?" });
    await user.click(within(confirm).getByRole("button", { name: "Start over" }));

    expect(
      within(screen.getByRole("group", { name: "Action" })).getByRole("textbox", { name: "Hex" }),
    ).toHaveValue("#1e6b45");
    expect(screen.getByText(/^Editing Forest · All contrast/)).toBeInTheDocument();
    expect(screen.getByText("Editing Forest", { selector: "[role='status']" })).toBeInTheDocument();
  });

  it("Use on site selects it, marks it In use, and drops it from its menu", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Forest", "#1e6b45");
    const [forest] = readCustomThemes();

    await user.click(screen.getByRole("button", { name: "More actions for Forest" }));
    await user.click(screen.getByRole("menuitem", { name: "Use on site" }));

    expect(localStorage.getItem("theme")).toBe(`custom:${forest?.id ?? ""}`);
    expect(within(card("Forest")).getByText("In use")).toBeInTheDocument();
    expect(screen.getByText("Now using Forest across the site")).toHaveAttribute("role", "status");
    await user.click(screen.getByRole("button", { name: "More actions for Forest" }));
    expect(screen.queryByRole("menuitem", { name: "Use on site" })).toBeNull();
  });

  it("Duplicate starts a new draft named “<name> copy” from the theme", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Forest", "#1e6b45");

    await user.click(screen.getByRole("button", { name: "More actions for Forest" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicate" }));

    expect(screen.getByText(/^New theme from Forest · All contrast/)).toBeInTheDocument();
    expect(await proposedName(user)).toBe("Forest copy");
    expect(within(card("Forest")).queryByText("Editing")).toBeNull();
  });

  it("moves focus to the library's heading once a card's theme is deleted (WCAG 2.4.3)", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Forest", "#1e6b45");

    await user.click(screen.getByRole("button", { name: "More actions for Forest" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    const confirm = screen.getByRole("alertdialog", { name: "Delete “Forest”?" });
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    expect(cardNames()).toEqual([]);
    expect(within(library()).getByRole("heading", { level: 2 })).toHaveFocus();
  });

  it("returns focus to the card's menu button when its delete is canceled", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Forest", "#1e6b45");

    await user.click(screen.getByRole("button", { name: "More actions for Forest" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    const confirm = screen.getByRole("alertdialog", { name: "Delete “Forest”?" });
    await user.click(within(confirm).getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "More actions for Forest" })).toHaveFocus();
  });

  it("follows another tab's changes (R2.10)", async () => {
    await renderCreator();

    localStorage.setItem(
      CUSTOM_THEMES_KEY,
      JSON.stringify({
        v: 1,
        themes: [
          { id: "tab00001", name: "Harbor", scheme: "dark", vars: {}, source: emptySource("dark") },
        ],
      }),
    );
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: CUSTOM_THEMES_KEY }));
    });

    expect(cardNames()).toEqual(["Harbor"]);
    expect(within(card("Harbor")).getByText("Dark")).toBeInTheDocument();
    expect(within(library()).getByText("1 of 3 saved")).toBeInTheDocument();
  });

  it("marks the theme another tab selects as In use (R2.10)", async () => {
    const { user } = await renderCreator();
    await saveTheme(user, "Forest", "#1e6b45");
    const [forest] = readCustomThemes();

    localStorage.setItem("theme", `custom:${forest?.id ?? ""}`);
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "theme" }));
    });

    expect(within(card("Forest")).getByText("In use")).toBeInTheDocument();
  });

  it("warns that themes won't last when storage is refused (R2.4; theme-creator R9.6, R11.3)", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is disabled", "SecurityError");
    });
    // The store probes storage once, so it gets a fresh copy.
    vi.resetModules();
    const { renderCreator: renderFresh } = await import("./theme-creator-test.tsx");

    await renderFresh();

    expect(within(library()).getByText(/isn’t allowing storage/)).toHaveTextContent(
      "This browser isn’t allowing storage: saved themes last only while this page is open, and edits won’t survive a reload.",
    );
  });
});
