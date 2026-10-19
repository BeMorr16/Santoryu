import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import iconStyles from "../../components/Icon/Icon.module.css";
import { icons } from "../../components/Icon/registry.ts";
import linkStyles from "../../components/Link/Link.module.css";
import buttonStyles from "../../components/shared/button-styles.module.css";
import hiddenStyles from "../../components/VisuallyHidden/VisuallyHidden.module.css";
import showcaseStyles from "./Showcase.module.css";
import { ComponentsPage } from "./ComponentsPage.tsx";
import { showcases } from "./registry.ts";
import { compactMenuCss } from "./showcases/menu.tsx";
import { announced } from "./showcases/visually-hidden.tsx";

function renderPage() {
  const Stub = createRoutesStub([
    {
      path: "/lab/components",
      Component: () => (
        <main>
          <h1>Components</h1>
          <ComponentsPage />
        </main>
      ),
    },
  ]);
  return render(<Stub initialEntries={["/lab/components"]} />);
}

describe("/lab/components page (R15.1, R15.3)", () => {
  it("lists every section in an in-page list, linking to its id", async () => {
    renderPage();

    const list = await screen.findByRole("list", { name: "On this page" });
    const links = within(list).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual(
      showcases.map((showcase) => [showcase.name, `#${showcase.id}`]),
    );
  });

  it("renders one section per component, named by its h2, in registry order", async () => {
    renderPage();
    await screen.findByRole("list", { name: "On this page" });

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(
      showcases.map((showcase) => showcase.name),
    );
    for (const showcase of showcases) {
      expect(screen.getByRole("region", { name: showcase.name })).toHaveAttribute(
        "id",
        showcase.id,
      );
    }
  });

  it.each(showcases.map((s) => [s.name, s] as const))(
    "shows %s's purpose, examples panel, props, tokens and accessibility notes",
    async (_name, showcase) => {
      renderPage();
      const section = await screen.findByRole("region", { name: showcase.name });

      expect(section).toHaveTextContent(showcase.purpose);
      expect(
        within(section).getByRole("group", { name: `${showcase.name} examples` }),
      ).toBeVisible();
      expect(
        within(section)
          .getAllByRole("heading", { level: 3 })
          .map((h) => h.textContent),
      ).toEqual(["Examples", "Props", "Component tokens", "Accessibility"]);
      for (const { part, docs } of showcase.props) {
        const table = within(section).getByRole("table", { name: `${part} props` });
        expect(
          within(table)
            .getAllByRole("rowheader")
            .map((row) => row.textContent),
        ).toEqual(Object.keys(docs));
      }
      if (showcase.tokens === null) {
        expect(section).toHaveTextContent(showcase.tokensNote ?? "");
      } else {
        expect(
          within(section).getByRole("table", { name: `${showcase.name} component tokens` }),
        ).toBeInTheDocument();
      }
      for (const note of showcase.a11y) expect(section).toHaveTextContent(note);
      if (showcase.keyboard) {
        const keyboard = within(section).getByRole("table", { name: `${showcase.name} keyboard` });
        expect(within(keyboard).getAllByRole("rowheader")).toHaveLength(showcase.keyboard.length);
      }
    },
  );

  it.each(showcases.map((s) => [s.name, s] as const))(
    "renders %s's props note under the native-props sentence only when it has one",
    async (_name, showcase) => {
      renderPage();
      const section = await screen.findByRole("region", { name: showcase.name });

      const native = within(section).getByText(/^Any native prop not listed here/);
      const next = native.nextElementSibling;
      if (showcase.propsNote === undefined) {
        expect(next?.tagName).not.toBe("P");
      } else {
        expect(next?.tagName).toBe("P");
        expect(next).toHaveTextContent(showcase.propsNote);
      }
    },
  );

  it("documents Icon's SVG escape hatches in a props note (refinement R1.6, R1.11)", () => {
    expect(showcases.find((s) => s.id === "icon")?.propsNote).toMatch(
      /fill.+stroke.+viewBox.+width.+height.+transform.+children.+fill replaces currentColor.+256-unit grid.+overridden by the size classes.+Children must not be focusable or include <title> or <desc>/,
    );
  });

  it("captions every registry icon with its name, and keeps those icons decorative (refinement R1.7)", async () => {
    renderPage();
    const section = await screen.findByRole("region", { name: "Icon" });

    const registry = within(section).getByText("Registry", { selector: "p" }).parentElement;
    if (registry === null) throw new Error("no Registry example");
    const captions = within(registry)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(captions).toEqual(Object.keys(icons));
    expect(within(registry).queryAllByRole("img")).toEqual([]);
    expect(registry.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(captions.length);
  });

  it("shows icons following their text's size and color (refinement R1.8)", async () => {
    renderPage();
    const section = await screen.findByRole("region", { name: "Icon" });

    for (const size of [showcaseStyles.textH2, showcaseStyles.textSmall]) {
      const icon = section.querySelector(`p.${size ?? ""} > svg`);
      expect(icon).toHaveClass(iconStyles["size-inherit"] ?? "");
    }
    const link = within(section).getByRole("link", { name: "Design tokens" });
    const accent = section.querySelector(`span.${showcaseStyles.accentText ?? ""}`);
    for (const icon of [link.querySelector("svg"), accent?.querySelector("svg")]) {
      expect(icon).toHaveAttribute("fill", "currentColor");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("renders the Menu showcase's View items with no icon of their own (refinement R1.10)", async () => {
    renderPage();
    const section = await screen.findByRole("region", { name: "Menu" });

    for (const name of ["Grid", "List"]) {
      const item = within(section).getByRole("menuitemradio", { name, hidden: true });
      // Only the checked-state indicator, which every radio item draws.
      expect(item.querySelectorAll("svg")).toHaveLength(1);
    }
  });

  it("shows the Menu examples, link items and the customized CSS it applies (refinement R5.13)", async () => {
    renderPage();
    const section = await screen.findByRole("region", { name: "Menu" });
    const titles = [
      "Actions",
      "Icons and links",
      "Radio group (controlled)",
      "Checkboxes and a separator",
      "Trigger looks",
      "Placement",
      "Controlled open",
      "Customized with component tokens",
    ];
    const labels = [...section.querySelectorAll("p.label")].map((label) => label.textContent);
    expect(labels).toEqual(titles);

    const github = within(section).getByRole("menuitem", {
      name: "GitHub, opens in new tab",
      hidden: true,
    });
    expect(github).toHaveAttribute("href", "https://github.com/");
    expect(
      within(section).getByRole("menuitem", { name: "LinkedIn, opens in new tab", hidden: true }),
    ).toHaveAttribute("target", "_blank");
    expect(within(section).getAllByRole("separator", { hidden: true })).toHaveLength(1);
    expect(within(section).getByRole("button", { name: "More options" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );

    const compact = within(section).getByRole("button", { name: "Compact" }).parentElement;
    expect(compact).toHaveClass(showcaseStyles.compactMenu ?? "");
    const shown = [...section.querySelectorAll("pre code")].map((code) => code.textContent);
    expect(shown).toContain(compactMenuCss);
    expect(readFileSync(join(import.meta.dirname, "Showcase.module.css"), "utf8")).toContain(
      compactMenuCss,
    );
  });

  it("captions each VisuallyHidden example with the role and name it announces (refinement R2.8, R2.9)", async () => {
    renderPage();
    const section = await screen.findByRole("region", { name: "VisuallyHidden" });

    const queries = {
      button: ["button", {}],
      link: ["link", {}],
      "heading level 4": ["heading", { level: 4 }],
      "search field": ["searchbox", {}],
    } as const;
    for (const { name, role } of Object.values(announced)) {
      const [ariaRole, options] = queries[role];
      expect(within(section).getByRole(ariaRole, { ...options, name })).toBeInTheDocument();
      expect(within(section).getByText(`Announced as: “${name}, ${role}”`)).toBeInTheDocument();
    }
  });

  it("toggles the VisuallyHidden examples' hidden content with a pressed button (refinement R2.10)", async () => {
    const user = userEvent.setup();
    renderPage();
    const section = await screen.findByRole("region", { name: "VisuallyHidden" });
    const panel = within(section).getByRole("group", { name: "VisuallyHidden examples" });
    const examples = () =>
      [...panel.querySelectorAll(`.${hiddenStyles.root ?? ""}`)].filter(
        // The panel's own theme trigger keeps its hidden "(VisuallyHidden preview)".
        (element) => element.closest("[aria-haspopup]") === null,
      );
    const toggle = within(panel).getByRole("button", { name: "Show hidden content" });

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(examples()).toHaveLength(Object.keys(announced).length);
    for (const element of examples()) {
      expect(element).not.toHaveClass(showcaseStyles.revealHidden ?? "");
    }

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    for (const element of examples()) {
      expect(element).toHaveClass(showcaseStyles.revealHidden ?? "");
    }

    await user.keyboard(" ");

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    for (const element of examples()) {
      expect(element).not.toHaveClass(showcaseStyles.revealHidden ?? "");
    }
  });

  it.each([
    ["Show grid", true],
    ["Wrap lines", false],
    ["Mark as done", false],
    ["Notify me", true],
  ] as const)(
    "flips the %s toggle on click and Space, and its caption follows (refinement R3.11, palette-expansion R3.5)",
    async (name, initial) => {
      const user = userEvent.setup();
      renderPage();
      const section = await screen.findByRole("region", { name: "Button" });
      const toggles = within(section).getByText("Toggles", { selector: "p" }).parentElement;
      if (toggles === null) throw new Error("no Toggles example");
      const toggle = within(toggles).getByRole("button", { name });
      const caption = (pressed: boolean) =>
        `Announced as: “${name}, toggle button, ${pressed ? "pressed" : "not pressed"}”`;

      expect(toggle).toHaveAttribute("aria-pressed", String(initial));
      expect(within(toggles).getByText(caption(initial))).toBeInTheDocument();

      await user.click(toggle);

      expect(toggle).toHaveAttribute("aria-pressed", String(!initial));
      expect(within(toggles).getByText(caption(!initial))).toBeInTheDocument();

      await user.keyboard(" ");

      expect(toggle).toHaveAttribute("aria-pressed", String(initial));
      expect(within(toggles).getByText(caption(initial))).toBeInTheDocument();
    },
  );

  it("names each icon-only button as its caption says, and drops GitHub from Icons (refinement R3.11)", async () => {
    renderPage();
    const section = await screen.findByRole("region", { name: "Button" });
    const example = (title: string) => {
      const element = within(section).getByText(title, { selector: "p" }).parentElement;
      if (element === null) throw new Error(`no ${title} example`);
      return element;
    };

    const tiles = within(example("Icon-only")).getAllByRole("listitem");
    const expected = [
      ["sm · aria-label", "Mark as done"],
      ["md · aria-label", "Next"],
      ["sm · VisuallyHidden", "Show more"],
      ["md · VisuallyHidden", "Show more"],
    ] as const;
    expect(tiles.map((tile) => tile.querySelector("code")?.textContent)).toEqual(
      expected.map(([caption]) => caption),
    );
    for (const [index, [caption, name]] of expected.entries()) {
      const button = within(tiles[index] ?? section).getByRole("button", { name });
      const byLabel = caption.endsWith("aria-label");
      expect(button.hasAttribute("aria-label")).toBe(byLabel);
      expect(button.querySelector(`.${hiddenStyles.root ?? ""}`) !== null).toBe(!byLabel);
      expect(button).toHaveClass(buttonStyles.iconOnly ?? "");
    }

    expect(within(example("Icons")).queryByRole("button", { name: "GitHub" })).toBeNull();
    expect(
      within(example("Long label")).getByRole("button", {
        name: "Send me a note about a project you have in mind",
      }),
    ).toBeInTheDocument();
  });

  it("shows Link's current-page, visited, new-tab, icon-only and customized examples (refinement R4.11)", async () => {
    renderPage();
    const section = await screen.findByRole("region", { name: "Link" });
    const example = (title: string) => {
      const element = within(section).getByText(title, { selector: "p" }).parentElement;
      if (element === null) throw new Error(`no ${title} example`);
      return element;
    };

    const current = example("Current page");
    const expected = [
      ["Components", "page", "Announced as: “Components, link, current page”"],
      ["This page, unmarked", "false", "Announced as: “This page, unmarked, link”"],
    ] as const;
    for (const [name, ariaCurrent, caption] of expected) {
      const link = within(current).getByRole("link", { name });
      expect(link).toHaveAttribute("aria-current", ariaCurrent);
      expect(within(current).getByText(caption)).toBeInTheDocument();
    }

    for (const link of within(example("Visited (opt-in)")).getAllByRole("link")) {
      expect(link).toHaveClass(linkStyles.showVisited ?? "");
    }
    const narrow = within(example("New tab")).getByText(/The code for this site is on/);
    expect(narrow).toHaveClass(showcaseStyles.narrow ?? "");
    expect(
      within(narrow).getByRole("link", { name: "GitHub, opens in new tab" }),
    ).toBeInTheDocument();
    expect(within(example("As a button")).getByRole("link", { name: "Email me" })).toHaveClass(
      buttonStyles.iconOnly ?? "",
    );
    const quiet = within(example("Customized with a component token")).getByText(/Quiet links/);
    expect(quiet).toHaveClass(showcaseStyles.quietLinks ?? "");
    expect(within(quiet).getByRole("link", { name: "token reference" })).toBeInTheDocument();
  });

  it("shows the Stack examples, the labelled lab-pages list and the legend-named fieldset (refinement R6.7)", async () => {
    renderPage();
    const section = await screen.findByRole("region", { name: "Stack" });
    const example = (title: string) => {
      const element = within(section).getByText(title, { selector: "p" }).parentElement;
      if (element === null) throw new Error(`no ${title} example`);
      return element;
    };

    const labels = [...section.querySelectorAll("p.label")].map((label) => label.textContent);
    expect(labels).toEqual([
      "Vertical (default), gaps none to xl",
      "Horizontal, gaps none to xl",
      "Align",
      "Justify",
      "Vertical alignment",
      "Wrapping by default",
      "One line",
      "Row and column gaps",
      "Semantics",
    ]);

    const alignment = example("Vertical alignment");
    expect(within(alignment).getByRole("button", { name: "Stretched (default)" })).toBeVisible();
    expect(within(alignment).getByRole("button", { name: "align start" })).toBeVisible();
    for (const title of ["Wrapping by default", "Row and column gaps"]) {
      const list = within(example(title)).getByRole("list");
      expect(list).toHaveClass(showcaseStyles.narrow ?? "");
      expect(within(list).getAllByRole("listitem")).toHaveLength(6);
    }
    const oneLine = example("One line");
    expect(within(oneLine).getByText("Project")).toBeVisible();
    expect(within(oneLine).getByRole("button", { name: "Edit project" })).toBeVisible();

    const semantics = example("Semantics");
    const pages = within(semantics).getByRole("list", { name: "Lab pages (example)" });
    expect(within(semantics).queryByRole("navigation")).toBeNull();
    expect(
      within(pages)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/lab", "/lab/tokens", "/lab/components"]);
    const group = within(semantics).getByRole("group", { name: "Contact preference" });
    expect(within(group).getByRole("radio", { name: "Email" })).toBeChecked();
    expect(within(group).getByRole("radio", { name: "Phone" })).not.toBeChecked();
  });

  it("has no axe violations (R3.9)", async () => {
    const { container } = renderPage();
    await screen.findByRole("list", { name: "On this page" });

    await expectNoAxeViolations(container);
  }, 30_000);
});
