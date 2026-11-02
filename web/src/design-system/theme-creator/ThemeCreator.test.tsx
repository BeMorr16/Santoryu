import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resize } from "../../../test/resize-observer.ts";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { readCustomThemes } from "../../theme/custom-themes.ts";
import { DRAFT_KEY } from "./model/draft.ts";
import {
  cardAction,
  makeChange,
  previewPage,
  previewProperty,
  proposedName,
  renderCreator,
  saveDialog,
  saveNamed,
  section,
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

const sectionLinks = () => screen.getByRole("navigation", { name: "Editor sections" });

/** Whether `a` comes before `b` in the document. */
const precedes = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

async function saveForest(user: Awaited<ReturnType<typeof renderCreator>>["user"]) {
  await makeChange(user);
  await saveNamed(user, "Forest");
}

describe("ThemeCreator: page order (theme-creator-controls R1, R6.1)", () => {
  it("shows the library, the toolbar and its section links, then the editor", async () => {
    await renderCreator();

    const parts = [
      screen.getByRole("region", { name: "Your themes" }),
      screen.getByText(/^New theme from/),
      toolbarSave(),
      sectionLinks(),
      screen.getByRole("heading", { level: 2, name: "Find a token" }),
      section("Color"),
      screen.getByRole("region", { name: "Preview" }),
    ];
    for (const [index, part] of parts.slice(1).entries()) {
      expect(precedes(parts[index] as Element, part)).toBe(true);
    }
  });

  it("has no theme bar: no Start from, Saved themes, or loose Import and Copy CSS buttons (R1.2)", async () => {
    await renderCreator();

    for (const name of [/^Start from/, /^Saved themes/, /^Import$/, /^Copy CSS$/]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });

  it("has no name field until a save asks for one (R4.1)", async () => {
    await renderCreator();

    expect(screen.queryByRole("textbox", { name: "Theme name" })).toBeNull();
  });

  it("tabs through the library, the toolbar, the section links, then the editor", async () => {
    const { user } = await renderCreator();
    await saveForest(user);
    (document.activeElement as HTMLElement | null)?.blur();

    const order: string[] = [];
    while (order.length < 12) {
      await user.tab();
      const active = document.activeElement;
      // jsdom and user-event don't implement inert, which takes a card's sample out of the Tab
      // order in browsers; e2e checks that there (theme-creator.spec.ts, "card's sample").
      if (active?.closest("[inert]")) continue;
      order.push(
        active instanceof HTMLInputElement
          ? `field: ${active.labels?.[0]?.textContent ?? active.type}`
          : (active?.textContent ?? ""),
      );
    }

    expect(order).toEqual([
      "New theme",
      "Edit Forest",
      "More actions for Forest",
      "Discard changes",
      "Export",
      "Save as new",
      "Save",
      "Color",
      "Typography",
      "Shape",
      "Spacing",
      expect.stringMatching(/^field: Search tokens/),
    ]);
  });
});

describe("ThemeCreator: the Preview bar's Save (theme-creator-controls R5.5)", () => {
  it("comes before the preview toggle and saves exactly as the toolbar's Save", async () => {
    const { user } = await renderCreator({ preview: false });
    await makeChange(user);
    const previewSave = screen.getAllByRole("button", { name: "Save" }).at(-1);
    if (!previewSave) throw new Error("no Preview bar Save");
    expect(previewSave).not.toBe(toolbarSave());
    expect(precedes(previewSave, screen.getByRole("button", { name: "Show preview" }))).toBe(true);

    await user.click(previewSave);
    const dialog = saveDialog();
    await user.type(within(dialog).getByRole("textbox", { name: "Theme name" }), "Forest");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(readCustomThemes().map(({ name }) => name)).toEqual(["Forest"]);
    expect(screen.getByText("Saved Forest")).toHaveAttribute("role", "status");
    expect(
      within(screen.getByRole("region", { name: "Your themes" })).getByRole("heading", {
        level: 3,
        name: "Forest",
      }),
    ).toBeInTheDocument();
  });

  it("runs the same checks: a missing name is caught in the name dialog", async () => {
    const { user } = await renderCreator({ preview: false });
    await makeChange(user);

    await user.click(screen.getAllByRole("button", { name: "Save" }).at(-1) as HTMLElement);
    await user.click(within(saveDialog()).getByRole("button", { name: "Save" }));

    const field = within(saveDialog()).getByRole("textbox", { name: "Theme name" });
    expect(field).toHaveAccessibleDescription("Enter a name for the theme.");
    expect(field).toHaveFocus();
  });

  it("returns focus to itself when the name dialog is canceled", async () => {
    const { user } = await renderCreator({ preview: false });
    await makeChange(user);
    const previewSave = screen.getAllByRole("button", { name: "Save" }).at(-1) as HTMLElement;

    await user.click(previewSave);
    await user.click(within(saveDialog()).getByRole("button", { name: "Cancel" }));

    expect(previewSave).toHaveFocus();
  });
});

describe("ThemeCreator: the toolbar's measured height (theme-creator-controls design §5.3)", () => {
  it("sets --theme-creator-toolbar-block-size on the root from the observed size, and removes it on unmount", async () => {
    const { unmount } = await renderCreator();
    const toolbar = sectionLinks().parentElement;
    if (!toolbar) throw new Error("no toolbar");

    act(() => {
      resize(toolbar, 120);
    });
    expect(root.style.getPropertyValue("--theme-creator-toolbar-block-size")).toBe("120px");
    act(() => {
      resize(toolbar, 168);
    });
    expect(root.style.getPropertyValue("--theme-creator-toolbar-block-size")).toBe("168px");

    unmount();

    expect(root.style.getPropertyValue("--theme-creator-toolbar-block-size")).toBe("");
  });
});

describe("ThemeCreator: focus clear of the pinned bars (theme-creator-controls R5.2)", () => {
  // jsdom has no layout or scrolling: rects are reported here, and scrolling is recorded.
  function layOut(tops: Map<Element, number>) {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      return DOMRect.fromRect({ y: tops.get(this) ?? 500, height: 32 });
    });
    const scrolled: Element[] = [];
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this);
    };
    return scrolled;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  });

  it("scrolls a field focused above the pinned bars back into view", async () => {
    await renderCreator();
    const field = screen.getByRole("searchbox", { name: "Search tokens" });
    const scrolled = layOut(new Map([[field, -66]]));

    field.focus();

    expect(scrolled).toEqual([field]);
  });

  it("leaves fields already in view, and the pinned toolbar's own controls, where they are", async () => {
    await renderCreator();
    const field = screen.getByRole("searchbox", { name: "Search tokens" });
    const save = toolbarSave();
    const scrolled = layOut(new Map([[save, 40]]));

    field.focus();
    save.focus();

    expect(scrolled).toEqual([]);
  });
});

describe("ThemeCreator: drafts (theme-creator R11.1)", () => {
  it("restores the draft after a reload, with its name, marked as unsaved", async () => {
    const first = await renderCreator();
    await saveForest(first.user);
    await cardAction(first.user, "Forest", "Duplicate");
    await makeChange(first.user, "#94440a");
    await waitFor(() => {
      expect(localStorage.getItem(DRAFT_KEY)).toContain("#94440a");
    });
    first.unmount();

    const { user } = await renderCreator();

    expect(screen.getByText(/^New theme from Forest · Unsaved changes/)).toBeInTheDocument();
    expect(previewProperty("--color-action-background")).toBe("#94440a");
    expect(await proposedName(user)).toBe("Forest copy");
  });
});

describe("ThemeCreator: key controls and preview (theme-creator R4, R5, R7)", () => {
  it("groups the editor into Color, Typography, Shape and Spacing, each with an h2, then the preview and chain (R4.1)", async () => {
    await renderCreator();

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Your themes",
      "Find a token",
      "Color",
      "Typography",
      "Shape",
      "Spacing",
      "Preview",
      "Token chain",
    ]);
  });

  it("shows the draft only inside a region labelled Preview (R7.1)", async () => {
    await renderCreator();

    const page = previewPage();
    expect(page).toHaveAttribute("data-theme", "light");
    expect(page.getAttribute("style") ?? "").toBe("");
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });

  it("updates the preview's inline action color as the Action color changes (R4.4, R5.1)", async () => {
    const { user } = await renderCreator();

    await typeHex(user, screen.getByRole("group", { name: "Action" }), "#2a8556");

    expect(previewProperty("--color-action-background")).toBe("#2a8556");
    expect(previewProperty("--color-link-default")).not.toBe("");
    expect(document.documentElement.style.getPropertyValue("--color-action-background")).toBe("");
  });

  it("flips the preview's scheme for a dark background (R2.5)", async () => {
    const { user } = await renderCreator();

    await typeHex(user, screen.getByRole("group", { name: "Background" }), "#0b2338");

    expect(previewPage()).toHaveAttribute("data-theme", "dark");
  });

  it("changes spacing with Density and radius with Corner radius (R5.5, R5.6)", async () => {
    const { user } = await renderCreator();

    const density = screen.getByRole("slider", { name: "Density" });
    expect(density).toHaveAttribute("aria-valuetext", "Default, 4px");
    density.focus();
    await user.keyboard("{End}");
    expect(previewProperty("--space-inset-md")).toBe("1.25rem");
    expect(density).toHaveAttribute("aria-valuetext", "5px");

    const radius = screen.getByRole("slider", { name: "Corner radius" });
    radius.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(previewProperty("--radius-control")).toBe("6px");
    expect(previewProperty("--radius-surface")).toBe("6px");
  });

  it("chooses a heading font from a menu (R5.4)", async () => {
    const { user } = await renderCreator();

    await user.click(screen.getByRole("button", { name: "Heading font: Space Grotesk" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Fira Code" }));

    expect(screen.getByRole("button", { name: "Heading font: Fira Code" })).toBeInTheDocument();
    expect(previewProperty("--type-family-heading")).toMatch(/^'Fira Code Variable'/);
  });

  it("offers Reset only while a key differs from the starting point, and Reset restores it (R5.8)", async () => {
    const { user } = await renderCreator();
    const shape = section("Shape");
    expect(within(shape).queryByRole("button", { name: /^Reset/ })).toBeNull();

    const width = screen.getByRole("slider", { name: "Border width" });
    width.focus();
    await user.keyboard("{ArrowRight}");
    expect(previewProperty("--effect-border-width")).toBe("3px");

    within(shape).getByRole("button", { name: "Reset Border width" }).focus();
    await user.keyboard("{Enter}");
    expect(previewProperty("--effect-border-width")).toBe("");
    expect(within(shape).queryByRole("button", { name: /^Reset/ })).toBeNull();
    // The button is gone, so focus moves to the control it reset (WCAG 2.4.3).
    expect(screen.getByRole("slider", { name: "Border width" })).toHaveFocus();
  });

  it("puts the preview behind a narrow-screen disclosure (R7.4)", async () => {
    const { user } = await renderCreator({ preview: false });

    const toggle = screen.getByRole("button", { name: "Show preview" });
    const panel = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("hidden");
    expect(screen.queryByRole("region", { name: "Preview" })).toBeNull();

    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Hide preview" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(panel).not.toHaveAttribute("hidden");
    expect(panel).toContainElement(previewPage());
  });

  it("has no axe violations", async () => {
    const { container } = await renderCreator();

    await expectNoAxeViolations(container);
  }, 30_000);

  it("has no axe violations with a saved theme in use, its menu open (R6.5)", async () => {
    const { user, container } = await renderCreator();
    await saveForest(user);
    await cardAction(user, "Forest", "Use on site");
    await user.click(screen.getByRole("button", { name: "More actions for Forest" }));

    await expectNoAxeViolations(container);
  }, 30_000);
});
