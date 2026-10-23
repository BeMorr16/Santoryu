import { render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { hubData } from "../../generated/hub-data.ts";
import { ComponentsPreview } from "./ComponentsPreview.tsx";
import styles from "./Hub.module.css";
import { ThemeCreatorPreview } from "./ThemeCreatorPreview.tsx";
import { TokensPreview } from "./TokensPreview.tsx";

const previews: [string, ComponentType][] = [
  ["Tokens", TokensPreview],
  ["Components", ComponentsPreview],
  ["Theme Creator", ThemeCreatorPreview],
];

/** The preview's root: the one element render() puts in the container. */
function renderPreview(Preview: ComponentType) {
  const { container } = render(<Preview />);
  const root = container.firstElementChild;
  if (!(root instanceof HTMLElement)) throw new Error("no preview root");
  return root;
}

describe("hub previews (ds-hub R3.5)", () => {
  // jsdom and user-event don't implement inert; e2e checks the Tab stops in real browsers.
  it.each(previews)(
    "hides the %s preview from assistive technology and makes it inert",
    (_name, Preview) => {
      const root = renderPreview(Preview);

      expect(root).toHaveAttribute("aria-hidden", "true");
      expect(root).toHaveAttribute("inert");
      expect(root).toHaveClass(styles.frame ?? "");
      expect(screen.queryAllByRole("button")).toHaveLength(0);
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    },
  );
});

describe("Tokens preview (ds-hub R3.1)", () => {
  it("shows six color swatches, three type sizes, and radius and space steps", () => {
    const root = renderPreview(TokensPreview);

    expect(root.querySelectorAll(`.${styles.swatch ?? ""}`)).toHaveLength(6);
    const samples = within(root).getAllByText("Aa");
    expect(samples).toHaveLength(3);
    expect(samples.map((sample) => sample.className)).toEqual([
      expect.stringContaining(styles.typeSmall ?? ""),
      expect.stringContaining(styles.typeBody ?? ""),
      expect.stringContaining(styles.typeH3 ?? ""),
    ]);
    expect(root.querySelectorAll(`.${styles.shape ?? ""}`)).toHaveLength(3);
    expect(root.querySelectorAll(`.${styles.bar ?? ""}`)).toHaveLength(3);
  });
});

describe("Components preview (ds-hub R3.2)", () => {
  it("is made of a real Button, Badge, TextField and Separator", () => {
    const root = renderPreview(ComponentsPreview);

    expect(within(root).getByRole("button", { name: "Button", hidden: true })).toBeInTheDocument();
    expect(within(root).getByText("New")).toBeInTheDocument();
    expect(within(root).getByRole("textbox", { name: "Email", hidden: true })).toHaveAttribute(
      "type",
      "email",
    );
    expect(within(root).getByRole("separator", { hidden: true })).toBeInTheDocument();
  });
});

describe("Theme Creator preview (ds-hub R3.3)", () => {
  it("shows Light, Dark and High contrast panels, each scoped to its theme", () => {
    const root = renderPreview(ThemeCreatorPreview);

    const panels = [...root.children] as HTMLElement[];
    expect(panels.map((panel) => panel.dataset.theme)).toEqual([
      "light",
      "dark",
      hubData.highContrast.scheme,
    ]);
    expect(panels.map((panel) => panel.firstElementChild?.textContent)).toEqual([
      "Light",
      "Dark",
      hubData.highContrast.name,
    ]);
    for (const panel of panels) {
      expect(within(panel).getByRole("button", { name: "Save", hidden: true })).toBeVisible();
    }
    expect(panels[0]).not.toHaveAttribute("style");
    expect(panels[1]).not.toHaveAttribute("style");
    const vars = Object.entries(hubData.highContrast.vars);
    expect(vars.length).toBeGreaterThan(0);
    for (const [name, value] of vars) {
      expect(panels[2]?.style.getPropertyValue(name)).toBe(value);
    }
  });
});
