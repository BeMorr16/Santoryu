import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { sectionComponents, sectionSemantics, semanticControl } from "./model/controls.ts";
import {
  openDisclosure,
  previewProperty,
  renderCreator,
  section,
  typeHex,
} from "./theme-creator-test.tsx";

afterEach(() => {
  localStorage.clear();
});

/** A row, by its token path. */
function row(token: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-token="${token}"]`);
  if (!found) throw new Error(`no row for ${token}`);
  return found;
}

describe("token rows (theme-creator R6)", () => {
  it("renders no rows while a disclosure is closed (design §8.2)", async () => {
    await renderCreator();

    expect(document.querySelectorAll("[data-token]")).toHaveLength(0);
    expect(
      within(section("Color")).getByRole("button", { name: /^Semantic tokens \(\d+\)$/ }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("lists every semantic token of a section, each named by its path (R6.1, R6.4)", async () => {
    const { user } = await renderCreator();

    for (const [name, tokens] of [
      ["Color", sectionSemantics.color],
      ["Typography", sectionSemantics.typography],
      ["Shape", sectionSemantics.shape],
      ["Spacing", sectionSemantics.spacing],
    ] as const) {
      await openDisclosure(user, name, "Semantic tokens");
      for (const { name: token } of tokens) {
        // Each row's control is named by its path: a color's fieldset (its hex field and swatches
        // sit inside that named group), a number field, or a font menu (R6.4).
        const kind = semanticControl(token).kind;
        const scope = within(row(token));
        if (kind === "color") expect(scope.getByRole("group", { name: token })).toBeInTheDocument();
        if (kind === "dimension" || kind === "number") {
          expect(scope.getByRole("spinbutton", { name: token })).toBeInTheDocument();
        }
        if (kind === "font") {
          expect(
            scope.getByRole("button", { name: new RegExp(`\\(${token}\\)$`) }),
          ).toBeInTheDocument();
        }
      }
    }
  }, 60_000);

  it("marks an edited row Edited, applies it, and Reset returns it to its derived value (R6.3)", async () => {
    const { user } = await renderCreator();
    await openDisclosure(user, "Color", "Semantic tokens");
    const muted = row("color.text.muted");
    expect(within(muted).getByText("From Light")).toBeInTheDocument();

    await typeHex(user, within(muted).getByRole("group", { name: "color.text.muted" }), "#333333");

    expect(within(row("color.text.muted")).getByText("Edited")).toBeInTheDocument();
    expect(previewProperty("--color-text-muted")).toBe("#333333");
    expect(
      within(section("Color")).getByRole("button", {
        name: /^Semantic tokens \(\d+ · 1 edited\)$/,
      }),
    ).toBeInTheDocument();

    await user.click(
      within(row("color.text.muted")).getByRole("button", { name: "Reset color.text.muted" }),
    );
    expect(within(row("color.text.muted")).getByText("From Light")).toBeInTheDocument();
    expect(previewProperty("--color-text-muted")).toBe("");
    expect(
      within(row("color.text.muted"))
        .getByRole("group", { name: "color.text.muted" })
        .querySelector("input"),
    ).toHaveFocus();
  });

  it("marks a row set by a key control as from that key", async () => {
    const { user } = await renderCreator();
    await typeHex(user, screen.getByRole("group", { name: "Action" }), "#2a8556");
    await openDisclosure(user, "Color", "Semantic tokens");

    expect(within(row("color.link.default")).getByText("From Action")).toBeInTheDocument();
  });

  it("edits a number token within its limits, as a number with its unit", async () => {
    const { user } = await renderCreator();
    await openDisclosure(user, "Spacing", "Semantic tokens");

    const field = within(row("space.inset.md")).getByRole("spinbutton", { name: "space.inset.md" });
    expect(field).toHaveAccessibleDescription("rem");
    await user.clear(field);
    await user.type(field, "1.5");
    expect(previewProperty("--space-inset-md")).toBe("1.5rem");

    await user.clear(field);
    await user.type(field, "99");
    await user.tab();
    expect(field).toBeInvalid();
    expect(previewProperty("--space-inset-md")).toBe("1.5rem");
  });

  it("re-points a component token, changing the preview's component property (R6.2)", async () => {
    const { user } = await renderCreator();
    await openDisclosure(user, "Color", "Component tokens");
    const token = "component.button.primary.background";

    await user.click(
      within(row(token)).getByRole("button", {
        name: `color.action.background (for ${token})`,
      }),
    );
    await user.click(screen.getByRole("menuitemradio", { name: "color.accent.border" }));

    expect(previewProperty("--component-button-primary-background")).toBe(
      "var(--color-accent-border)",
    );
    expect(within(row(token)).getByText("Edited")).toBeInTheDocument();
  });

  it("groups component tokens under a heading per component", async () => {
    const { user } = await renderCreator();
    await openDisclosure(user, "Shape", "Component tokens");

    const headings = within(section("Shape"))
      .getAllByRole("heading", { level: 4 })
      .map((heading) => heading.textContent);
    expect(headings).toContain("Button");
    expect(document.querySelectorAll("[data-token^='component.']")).toHaveLength(
      sectionComponents.shape.length,
    );
  });

  it("switches a color row's swatches between families with its Family menu (design §8.4)", async () => {
    const { user } = await renderCreator();
    await openDisclosure(user, "Color", "Semantic tokens");
    const action = row("color.action.background");
    expect(within(action).getByRole("group", { name: "Gold swatches" })).toBeInTheDocument();

    await user.click(
      within(action).getByRole("button", { name: "Family: Gold (color.action.background)" }),
    );
    await user.click(screen.getByRole("menuitemradio", { name: "Violet" }));

    const violet = within(row("color.action.background")).getByRole("group", {
      name: "Violet swatches",
    });
    await user.click(within(violet).getByRole("button", { name: "Violet 600" }));
    expect(previewProperty("--color-action-background")).toBe("#5b3fa6");
  });
});

describe("Find a token (theme-creator R4.3)", () => {
  it("opens the disclosures with matches, shows only matching rows, and announces the count once typing settles", async () => {
    const { user } = await renderCreator();

    await user.type(screen.getByRole("searchbox", { name: "Search tokens" }), "action.text");

    expect(
      within(section("Color")).getByRole("button", { name: /^Semantic tokens/ }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      within(section("Spacing")).getByRole("button", { name: /^Semantic tokens/ }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(row("color.action.text")).toBeInTheDocument();
    expect(document.querySelector("[data-token='color.text.default']")).toBeNull();
    expect(
      await screen.findByText(/^\d+ tokens? match/, {}, { timeout: 2000 }),
    ).toBeInTheDocument();
  });
});
