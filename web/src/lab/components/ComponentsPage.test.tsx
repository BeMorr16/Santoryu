import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { describe, expect, it, onTestFinished } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import gridStyles from "../../components/Grid/Grid.module.css";
import iconStyles from "../../components/Icon/Icon.module.css";
import { icons } from "../../components/Icon/registry.ts";
import linkStyles from "../../components/Link/Link.module.css";
import buttonStyles from "../../components/shared/button-styles.module.css";
import layoutStyles from "../../components/shared/layout.module.css";
import switcherStyles from "../../components/ThemeSwitcher/ThemeSwitcher.module.css";
import typographyStyles from "../../components/Typography/Typography.module.css";
import hiddenStyles from "../../components/VisuallyHidden/VisuallyHidden.module.css";
import showcaseStyles from "./Showcase.module.css";
import { ComponentsPage } from "./ComponentsPage.tsx";
import { showcases } from "./registry.ts";
import badgeStyles from "../../components/Badge/Badge.module.css";
import cardStyles from "../../components/Card/Card.module.css";
import {
  accordionKeyboard,
  customAccordionCss,
  findCaption,
  findWord,
  richHeadingAnnounced,
} from "./showcases/accordion.tsx";
import { customBadgeCss } from "./showcases/badge.tsx";
import { accentCardCss } from "./showcases/card.tsx";
import { compactMenuCss, menuKeyboard } from "./showcases/menu.tsx";
import { customTooltipCss, describedButton, tooltipKeyboard } from "./showcases/tooltip.tsx";
import { customLabelCss, scale, tones } from "./showcases/typography.tsx";
import { announced } from "./showcases/visually-hidden.tsx";

/** Each Example's visible title: the label-look paragraph that starts its group (refinement R8.13, R12.12). */
const exampleTitle = `[role="group"] > p.${typographyStyles.label ?? ""}:first-child`;

/** Each section's folded reference items, in order (refinement R13.14). */
const referenceItems = ["Props", "Component tokens", "Accessibility"] as const;

/** Opens a section's folded reference items, so their tables are in the accessibility tree. */
async function openReference(section: HTMLElement) {
  const user = userEvent.setup();
  for (const name of referenceItems) {
    await user.click(within(section).getByRole("button", { name, expanded: false }));
  }
}

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
    expect(screen.getByText("On this page")).toHaveClass(typographyStyles.label ?? "");
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
      for (const name of referenceItems) {
        const button = within(section).getByRole("button", { name, expanded: false });
        expect(button.closest("h3")).toHaveClass(typographyStyles.h3 ?? "");
      }
      await openReference(section);
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

  it.each(showcases.map((s) => [s.name, s] as const))(
    "names every %s example as a group by its visible title (refinement R8.13)",
    async (_name, showcase) => {
      renderPage();
      const section = await screen.findByRole("region", { name: showcase.name });
      const panel = within(section).getByRole("group", { name: `${showcase.name} examples` });

      const titles = [...panel.querySelectorAll(exampleTitle)];
      expect(titles.length).toBeGreaterThan(0);
      for (const title of titles) {
        const group = title.parentElement;
        expect(group).toHaveAttribute("role", "group");
        expect(group).toHaveAccessibleName(title.textContent);
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

    for (const text of ["Heading-size text, heading-size icon", "Small text, small icon"]) {
      const icon = within(section).getByText(text).querySelector("svg");
      expect(icon).toHaveClass(iconStyles["size-inherit"] ?? "");
    }
    expect(within(section).getByText("Heading-size text, heading-size icon")).toHaveClass(
      typographyStyles.h2 ?? "",
    );
    expect(within(section).getByText("Small text, small icon")).toHaveClass(
      typographyStyles.small ?? "",
    );
    const link = within(section).getByRole("link", { name: "Design tokens" });
    const accent = within(section).getByText("Accent-colored text and icon");
    expect(accent.tagName).toBe("SPAN");
    expect(accent).toHaveClass(typographyStyles["tone-accent"] ?? "");
    for (const icon of [link.querySelector("svg"), accent.querySelector("svg")]) {
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
    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
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

  it("shows Link's current-page, underline-on-hover, visited, new-tab, icon-only and customized examples (refinement R4.11, R11.12)", async () => {
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

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels.indexOf("Underline on hover")).toBe(labels.indexOf("Current page") + 1);
    const hoverPages = within(example("Underline on hover")).getByRole("list", {
      name: "Lab pages",
    });
    const hoverLinks = within(hoverPages).getAllByRole("link");
    expect(hoverLinks.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Lab", "/lab"],
      ["Tokens", "/lab/tokens"],
      ["Components", "/lab/components"],
    ]);
    for (const link of hoverLinks) expect(link).toHaveClass(linkStyles.underlineHover ?? "");
    expect(within(hoverPages).getByRole("link", { name: "Components" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await openReference(section);
    const underlineRow = within(section).getByRole("row", { name: /^underline\b/ });
    expect(underlineRow).toHaveTextContent('"always" | "hover"');
    expect(section).toHaveTextContent(
      /underline="hover" drops the underline at rest\. Use it only where the position marks the links/,
    );

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

  it("shows the Typography examples, the scale, tones, measure, inline text and the customized CSS it applies (refinement R12.13)", async () => {
    renderPage();
    const section = await screen.findByRole("region", { name: "Typography" });
    const example = (title: string) => within(section).getByRole("group", { name: title });

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "Type scale",
      "Level and look are separate",
      "Look from the element",
      "Tones",
      "Measure",
      "Inline text",
      "Customized with component tokens",
    ]);

    const scaleExample = example("Type scale");
    expect(within(scaleExample).queryAllByRole("heading")).toEqual([]);
    expect(scale.map(({ variant }) => variant)).toEqual([
      "display",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "lead",
      "body",
      "small",
      "label",
      "code",
    ]);
    for (const { variant, text } of scale) {
      const item = within(scaleExample).getByText(text);
      expect(item.tagName).toBe("P");
      expect(item).toHaveClass(typographyStyles[variant] ?? "");
    }

    const separate = example("Level and look are separate");
    expect(
      within(separate).getByRole("heading", { level: 4, name: "An h4 with the h2 look" }),
    ).toHaveClass(typographyStyles.h2 ?? "");
    expect(
      within(separate).getByRole("heading", { level: 5, name: "An h5 with the label look" }),
    ).toHaveClass(typographyStyles.label ?? "");

    const derived = example("Look from the element");
    expect(
      within(derived).getByRole("heading", { level: 4, name: "An h4, with the h4 look" }),
    ).toHaveClass(typographyStyles.h4 ?? "");
    for (const [text, tag, look] of [
      ["A code element, with the code look", "CODE", "code"],
      ["A small element, with the small look", "SMALL", "small"],
    ] as const) {
      const item = within(derived).getByText(text);
      expect(item.tagName).toBe(tag);
      expect(item).toHaveClass(typographyStyles[look] ?? "");
    }
    const strong = within(derived).getByText("strong text");
    expect(strong.tagName).toBe("STRONG");
    expect(strong.parentElement).toHaveClass(typographyStyles.lead ?? "");
    for (const look of ["lead", "body"]) {
      expect(strong).not.toHaveClass(typographyStyles[look] ?? "");
    }

    expect(tones.map(({ text }) => text).slice(5)).toEqual([
      "Success: saved",
      "Warning: unsaved changes",
      "Error: the email is missing",
    ]);
    for (const { tone, text } of tones) {
      expect(within(example("Tones")).getByText(text)).toHaveClass(
        typographyStyles[`tone-${tone}`] ?? "",
      );
    }

    const [capped, uncapped] = within(example("Measure")).getAllByText(/measure:/);
    expect(capped).toHaveClass(typographyStyles.measure ?? "");
    expect(uncapped).not.toHaveClass(typographyStyles.measure ?? "");
    expect(capped?.textContent.replace("With measure: ", "")).toBe(
      uncapped?.textContent.replace("Without measure: ", ""),
    );

    const inline = example("Inline text");
    for (const [text, tag] of [
      ["Tab", "KBD"],
      ["main", "CODE"],
      ["WCAG", "ABBR"],
      ["5 October 2023", "TIME"],
      ["without loss of information or functionality", "Q"],
    ] as const) {
      expect(within(inline).getByText(text).tagName).toBe(tag);
    }
    expect(within(inline).getByText("WCAG")).toHaveAttribute(
      "title",
      "Web Content Accessibility Guidelines",
    );
    expect(within(inline).getByText("5 October 2023")).toHaveAttribute("datetime", "2023-10-05");
    expect(within(inline).getByText(/Press/)).toHaveTextContent(
      "Web Content Accessibility Guidelines (WCAG) 2.2 was published on 5 October 2023.",
    );

    const custom = example("Customized with component tokens");
    expect(within(custom).getByText("Custom label")).toHaveClass(
      typographyStyles.label ?? "",
      showcaseStyles.customLabel ?? "",
    );
    expect([...custom.querySelectorAll("pre code")].map((code) => code.textContent)).toEqual([
      customLabelCss,
    ]);
    expect(readFileSync(join(import.meta.dirname, "Showcase.module.css"), "utf8")).toContain(
      customLabelCss,
    );

    const typography = showcases.find((s) => s.id === "typography");
    expect(Object.keys(typography?.props[0]?.docs ?? {})).toEqual([
      "as",
      "variant",
      "tone",
      "measure",
    ]);
    expect(typography?.props[0]?.docs.as?.default).toBe('"p"');
    expect(typography?.props[0]?.docs.measure?.default).toBe("false");
    expect(typography?.propsNote).toMatch(
      /h1–h6 take the variant of the same name; code, kbd and samp take code; small takes small; span, strong, em, mark, s, abbr, cite, q and time take inherit; every other element takes body.+explicit variant wins.+level, and so the role, comes only from as.+inherit and code set no size/,
    );
    for (const note of [
      /level comes from as and the look from variant, so keep the page outline logical/,
      /wording must state the status on its own/,
      /On glass, use only the default or muted tone/,
      /Don't set tone on text inside a Link, or on mark/,
      /uppercase is CSS only, so write the source text in normal case/,
      /abbr's title isn't reliably announced.+spell the abbreviation out on first use/,
      /Sizes are in rem/,
      /Long words break instead of overflowing in block layout.+min-inline-size: 0/,
    ]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }
  });

  it("shows the Stack examples, the labelled lab-pages list and the legend-named fieldset (refinement R6.7)", async () => {
    renderPage();
    const section = await screen.findByRole("region", { name: "Stack" });
    const example = (title: string) => {
      const element = within(section).getByText(title, { selector: "p" }).parentElement;
      if (element === null) throw new Error(`no ${title} example`);
      return element;
    };

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
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

  it("shows the Grid examples, the column options and the legend-named fieldset (refinement R7.6)", async () => {
    renderPage();
    const section = await screen.findByRole("region", { name: "Grid" });
    const example = (title: string) => {
      const element = within(section).getByText(title, { selector: "p" }).parentElement;
      if (element === null) throw new Error(`no ${title} example`);
      return element;
    };

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "min sm",
      "min md",
      "min lg",
      "Narrow container",
      "Row and column gaps",
      "Few items, stretched (default)",
      "Few items, stretch={false}",
      "At most two columns",
      "Semantics",
    ]);

    const list = (title: string) => within(example(title)).getByRole("list");
    for (const min of ["sm", "md", "lg"]) {
      expect(list(`min ${min}`)).toHaveClass(gridStyles[`min-${min}`] ?? "");
    }
    expect(list("Narrow container")).toHaveClass(
      showcaseStyles.narrow ?? "",
      gridStyles["min-md"] ?? "",
    );
    expect(list("Row and column gaps")).toHaveClass(
      layoutStyles["row-gap-xs"] ?? "",
      layoutStyles["column-gap-xl"] ?? "",
    );
    expect(within(list("Few items, stretched (default)")).getAllByRole("listitem")).toHaveLength(2);
    expect(list("Few items, stretched (default)")).not.toHaveClass(gridStyles.fill ?? "");
    expect(within(list("Few items, stretch={false}")).getAllByRole("listitem")).toHaveLength(2);
    expect(list("Few items, stretch={false}")).toHaveClass(gridStyles.fill ?? "");
    expect(within(list("At most two columns")).getAllByRole("listitem")).toHaveLength(4);
    expect(list("At most two columns")).toHaveClass(gridStyles["max-2"] ?? "");

    const group = within(example("Semantics")).getByRole("group", { name: "Projects to show" });
    expect(within(group).getByRole("checkbox", { name: "Personal site" })).toBeChecked();
    expect(within(group).getAllByRole("checkbox")).toHaveLength(4);

    expect(within(section).getByText(/maxColumns is a ceiling, not a count/)).toBeInTheDocument();
    for (const note of [/Grid never reorders items/, /the legend still names the group/]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }
  });

  it("shows the Card examples, variants, parts and the customized CSS it applies (refinement R8.14)", async () => {
    renderPage();
    const section = await screen.findByRole("region", { name: "Card" });
    const example = (title: string) => within(section).getByRole("group", { name: title });

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "Variants",
      "Parts",
      "Linked, with a nested control",
      "Footers line up",
      "Subgrid",
      "Any heading level",
      "Heading look",
      "Customized with component tokens",
    ]);

    const variants = within(example("Variants")).getAllByRole("article");
    expect(variants.map((card) => within(card).getByRole("link").textContent)).toEqual([
      "Raised",
      "Outlined",
      "Flat",
      "Glass",
    ]);
    variants.forEach((card, index) => {
      const variant = ["raised", "outlined", "flat", "glass"][index] ?? "";
      expect(card).toHaveClass(cardStyles[variant] ?? "");
      expect(within(card).getByRole("link")).toHaveAttribute("href", "/lab/tokens");
      expect(within(card).getByRole("heading", { level: 4 })).toBeInTheDocument();
    });
    expect(variants[0]?.closest(`.${showcaseStyles.glassBackdrop ?? ""}`)).not.toBeNull();

    const parts = within(example("Parts")).getByRole("article");
    expect(within(parts).getByRole("heading", { level: 4, name: "Static hosting" })).toBeVisible();
    expect(parts).toHaveTextContent("S3 and CloudFront, deployed from GitHub Actions.");
    expect(parts.lastElementChild).toHaveClass(cardStyles.footer ?? "");
    const services = within(parts.lastElementChild as HTMLElement).getByRole("list", {
      name: "Services",
    });
    expect(
      within(services)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["S3", "CloudFront"]);

    const linked = example("Linked, with a nested control");
    expect(within(linked).getByRole("link", { name: "Design tokens" })).toHaveAttribute(
      "href",
      "/lab/tokens",
    );
    const github = within(linked).getByRole("link", {
      name: "Source on GitHub, opens in new tab",
    });
    const githubCard = github.closest("article");
    expect(githubCard?.lastElementChild).toHaveClass(cardStyles.footer ?? "");
    expect(
      within(githubCard?.lastElementChild as HTMLElement).getByRole("button", {
        name: "Star (example)",
      }),
    ).toBeInTheDocument();

    for (const [title, subgrid] of [
      ["Footers line up", false],
      ["Subgrid", true],
    ] as const) {
      const items = within(within(example(title)).getByRole("list")).getAllByRole("listitem");
      expect(items).toHaveLength(3);
      for (const item of items) {
        expect(item.lastElementChild).toHaveClass(cardStyles.footer ?? "");
        if (subgrid) expect(item).toHaveClass(cardStyles.subgrid ?? "", cardStyles["rows-3"] ?? "");
        else expect(item).not.toHaveClass(cardStyles.subgrid ?? "");
      }
    }

    const levels = example("Any heading level");
    for (const [level, name] of [
      [4, "Project notes"],
      [5, "Release notes"],
    ] as const) {
      const heading = within(levels).getByRole("heading", { level, name });
      expect(heading).toHaveClass(cardStyles.heading ?? "");
      expect(heading.closest("article")).toHaveTextContent(
        `Announced as: “${name}, heading level ${String(level)}”`,
      );
    }

    const looks = example("Heading look");
    for (const [name, look] of [
      ["Featured project", "h3"],
      ["Case study", "label"],
    ] as const) {
      const heading = within(looks).getByRole("heading", { level: 4, name });
      expect(heading).toHaveClass(cardStyles.heading ?? "", typographyStyles[look] ?? "");
    }

    const custom = example("Customized with component tokens");
    expect(within(custom).getByRole("article")).toHaveClass(showcaseStyles.accentCard ?? "");
    expect([...custom.querySelectorAll("pre code")].map((code) => code.textContent)).toEqual([
      accentCardCss,
    ]);
    expect(readFileSync(join(import.meta.dirname, "Showcase.module.css"), "utf8")).toContain(
      accentCardCss,
    );

    const card = showcases.find((s) => s.id === "card");
    expect(Object.keys(card?.props[0]?.docs ?? {})).toEqual(
      expect.arrayContaining(["variant", "footer", "subgrid", "headingVariant"]),
    );
    expect(card?.props[0]?.docs.headingVariant).toMatchObject({ default: '"h4"' });
    expect(card?.propsNote).toMatch(
      /subgrid works only when the Card is a direct child of a Grid.+horizontal Stack.+varied backdrop.+aria-current goes to its heading link/,
    );
    for (const note of [
      /never marked aria-current automatically/,
      /look comes from headingVariant and is the same at every level \(except with inherit or code\), so choose headingLevel by the page outline/,
      /can't be selected, because the link's overlay covers it/,
      /hover look shows only where a click follows the link/,
      /Glass turns opaque when reduced transparency is requested/,
      /Outlined is transparent, so use it only on surface.base, raised or sunken/,
      /keep link cards of every variant off action.background/,
    ]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }
  });

  it("shows the Badge examples, variants, icons and the customized CSS it applies (refinement R9.10)", async () => {
    renderPage();
    const section = await screen.findByRole("region", { name: "Badge" });
    const example = (title: string) => within(section).getByRole("group", { name: title });

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "Variants",
      "Sizes",
      "With an icon",
      "A tech stack, as a list",
      "In running text, with inline markup",
      "Wraps instead of overflowing",
      "Customized with component tokens",
    ]);

    for (const [variant, text] of [
      ["neutral", "Neutral"],
      ["accent", "Accent"],
      ["accent-2", "Accent 2"],
      ["success", "Live"],
      ["warning", "Beta"],
      ["error", "Deprecated"],
    ] as const) {
      expect(within(example("Variants")).getByText(text)).toHaveClass(badgeStyles[variant] ?? "");
    }
    expect(within(example("Sizes")).getByText("Small")).toHaveClass(badgeStyles.sm ?? "");
    expect(within(example("Sizes")).getByText("Medium")).toHaveClass(badgeStyles.md ?? "");

    for (const text of ["Live", "Open source"]) {
      const icon = within(example("With an icon")).getByText(text).querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon).toHaveClass(badgeStyles.icon ?? "");
    }

    const stack = within(example("A tech stack, as a list")).getByRole("list", {
      name: "Tech stack",
    });
    expect(
      within(stack)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["React", "TypeScript", "AWS"]);

    const inline = example("In running text, with inline markup");
    expect(inline.querySelector(`p:not(.${typographyStyles.label ?? ""})`)).toHaveTextContent(
      "This site is Live and Built with Vite.",
    );
    expect(within(inline).getByText("Vite").tagName).toBe("EM");

    const wraps = within(example("Wraps instead of overflowing")).getByText(
      "Infrastructure as code",
    );
    expect(wraps.parentElement).toHaveClass(showcaseStyles.narrow ?? "");
    expect(
      within(example("Wraps instead of overflowing")).getByText("Internationalization")
        .parentElement,
    ).toHaveClass(showcaseStyles.narrow ?? "");

    const custom = example("Customized with component tokens");
    expect(within(custom).getByText("Custom")).toHaveClass(showcaseStyles.customBadge ?? "");
    expect([...custom.querySelectorAll("pre code")].map((code) => code.textContent)).toEqual([
      customBadgeCss,
    ]);
    expect(readFileSync(join(import.meta.dirname, "Showcase.module.css"), "utf8")).toContain(
      customBadgeCss,
    );

    const badge = showcases.find((s) => s.id === "badge");
    expect(Object.keys(badge?.props[0]?.docs ?? {})).toEqual(
      expect.arrayContaining(["variant", "icon"]),
    );
    expect(badge?.props[0]?.docs.variant?.type).toBe(
      '"neutral" | "accent" | "accent-2" | "success" | "warning" | "error"',
    );
    expect(badge?.propsNote).toMatch(
      /wording must state the status on its own.+as="li".+Icon's registry.+matches Typography's label look: the same family and tracking tokens/,
    );
    for (const note of [
      /not focusable, no pointer cursor, no hover state/,
      /success, warning and error carry meaning, so the wording must state the status/,
      /icon is decorative and hidden from screen readers/,
      /uppercase is CSS only, so write the source text in normal case/,
      /Badges wrap rather than overflow/,
    ]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }
  });

  it("shows the Accordion examples, its props, keyboard rows, notes and the customized CSS it applies (refinement R13.13)", async () => {
    const user = userEvent.setup();
    renderPage();
    const section = await screen.findByRole("region", { name: "Accordion" });
    const example = (title: string) => within(section).getByRole("group", { name: title });
    const buttons = (title: string) =>
      within(example(title))
        .getAllByRole("button")
        .filter((button) => button.hasAttribute("aria-expanded"));

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "Independent items",
      "Exclusive",
      "Controlled",
      "Rich heading",
      "Find in page",
      "Regions",
      "Heading look",
      "Customized with component tokens",
    ]);

    const questions = ["What is this site?", "How is it built?", "Can I reuse the components?"];
    for (const title of ["Independent items", "Exclusive", "Heading look"]) {
      expect(buttons(title).map((button) => button.textContent)).toEqual(questions);
      for (const button of buttons(title)) {
        expect(button.closest("h4")).not.toBeNull();
      }
    }
    expect(buttons("Independent items").map((b) => b.getAttribute("aria-expanded"))).toEqual([
      "true",
      "false",
      "false",
    ]);
    for (const heading of within(example("Heading look")).getAllByRole("heading", { level: 4 })) {
      expect(heading).toHaveClass(typographyStyles.body ?? "");
    }

    const [first, second] = buttons("Exclusive");
    if (!first || !second) throw new Error("Missing exclusive items");
    await user.click(first);
    await user.click(second);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "true");

    const controlled = example("Controlled");
    expect(within(controlled).getByText("The item is closed.")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    await user.click(within(controlled).getByRole("button", { name: "Open" }));
    expect(within(controlled).getByRole("button", { name: "Shipping details" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(within(controlled).getByText("The item is open.")).toBeInTheDocument();
    await user.click(within(controlled).getByRole("button", { name: "Shipping details" }));
    expect(within(controlled).getByRole("button", { name: "Open" })).toBeInTheDocument();

    const rich = example("Rich heading");
    const collapsed = richHeadingAnnounced(false);
    const richButton = within(rich).getByRole("button", { name: collapsed.name });
    expect(richButton.closest("h4")).not.toBeNull();
    expect(within(richButton).getByText("Live")).toHaveClass(badgeStyles.success ?? "");
    expect(rich).toHaveTextContent(`Announced as: “${collapsed.name}, ${collapsed.role}”`);
    await user.click(richButton);
    const expanded = richHeadingAnnounced(true);
    expect(expanded.role).toBe("heading level 4, button, expanded");
    expect(rich).toHaveTextContent(`Announced as: “${expanded.name}, ${expanded.role}”`);

    const find = example("Find in page");
    expect(within(find).getByText(findCaption).tagName).toBe("P");
    expect(findCaption).not.toContain(findWord);
    const word = section.querySelector("#accordion-find-word");
    expect(word).toHaveTextContent(findWord);
    expect(word?.closest("[hidden]")).toHaveAttribute("hidden", "until-found");
    // The answer appears once on the whole page, so find-in-page's first match is the hidden one.
    const pageText = document.body.textContent;
    expect(pageText.toLowerCase().split(findWord).length - 1).toBe(1);

    for (const button of buttons("Regions")) await user.click(button);
    expect(
      within(example("Regions"))
        .getAllByRole("region")
        .map((r) => r.id),
    ).toHaveLength(2);
    expect(within(example("Regions")).getByRole("region", { name: "Delivery" })).toBeVisible();

    const custom = example("Customized with component tokens");
    expect(custom.querySelector(`.${showcaseStyles.customAccordion ?? ""}`)).not.toBeNull();
    expect([...custom.querySelectorAll("pre code")].map((code) => code.textContent)).toEqual([
      customAccordionCss,
    ]);
    expect(readFileSync(join(import.meta.dirname, "Showcase.module.css"), "utf8")).toContain(
      customAccordionCss,
    );

    const accordion = showcases.find((s) => s.id === "accordion");
    expect(accordion?.props.map(({ part, docs }) => [part, Object.keys(docs)])).toEqual([
      ["Accordion", ["headingLevel", "headingVariant", "exclusive", "region"]],
      ["AccordionItem", ["heading", "open", "defaultOpen", "onOpenChange"]],
    ]);
    expect(accordion?.propsNote).toMatch(
      /heading must not hold links or buttons.+works alone.+exclusive, items opened together on first render stay open.+region only for six or fewer panels/,
    );
    expect(accordion?.keyboard).toEqual(accordionKeyboard);
    expect(accordionKeyboard.map((row) => row.keys)).toEqual([
      "Tab / Shift+Tab",
      "Enter / Space",
      "Arrow keys",
    ]);
    for (const note of [
      /headings stay in the page outline: choose headingLevel/,
      /announces whether it's expanded/,
      /out of the Tab order and the accessibility tree, yet find-in-page and links/,
      /No arrow keys move between headings/,
      /More than about six regions clutter the landmarks list/,
      /chevron animate over component.accordion.transition-duration, 0ms under reduced motion/,
      /In forced colors/,
    ]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }
  });

  it("shows the ThemeSwitcher examples, its props, its own keyboard table and a live caption (refinement R10.4, R10.5)", async () => {
    onTestFinished(() => {
      localStorage.clear();
      document.documentElement.removeAttribute("data-theme");
    });
    const user = userEvent.setup();
    renderPage();
    const section = await screen.findByRole("region", { name: "ThemeSwitcher" });
    const example = (title: string) => within(section).getByRole("group", { name: title });

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "Looks (each changes the whole site, not this panel)",
      "Label (changes the whole site, not this panel)",
      "Placement (changes the whole site, not this panel)",
    ]);

    const looks = within(example("Looks (each changes the whole site, not this panel)"));
    expect(looks.getAllByRole("button", { name: "Theme: Light" })).toHaveLength(3);

    const label = example("Label (changes the whole site, not this panel)");
    const [auto, always, never] = within(label).getAllByRole("button", { name: "Theme: Light" });
    expect(within(auto ?? label).getByText("Theme", { exact: true })).toHaveClass(
      switcherStyles.auto ?? "",
    );
    expect(within(always ?? label).getByText("Theme", { exact: true })).not.toHaveAttribute(
      "class",
    );
    expect(within(never ?? label).queryByText("Theme", { exact: true })).toBeNull();
    expect(
      within(label).getByText("Announced as: “Theme: Light, menu button, collapsed”"),
    ).toBeInTheDocument();

    const placement = example("Placement (changes the whole site, not this panel)");
    expect(
      [...placement.querySelectorAll('[role="menu"]')].map((popup) =>
        popup.getAttribute("data-align"),
      ),
    ).toEqual(["start", "end"]);

    const showcase = showcases.find((s) => s.id === "theme-switcher");
    const docs = showcase?.props[0]?.docs ?? {};
    expect(Object.keys(docs)).toEqual([
      "variant",
      "size",
      "showLabel",
      "nameTooltip",
      "side",
      "align",
    ]);
    expect(docs.nameTooltip?.default).toBe("true");
    expect(docs.showLabel?.default).toBe("auto: from 30em up");
    expect(docs.align?.default).toBe('"end"');
    expect(docs.side?.default).toBe('"bottom"');

    await openReference(section);
    const keyboard = within(section).getByRole("table", { name: "ThemeSwitcher keyboard" });
    const row = within(keyboard).getByRole("row", { name: /^Enter \/ Space In the menu:/ });
    expect(row).toHaveTextContent(
      "In the menu: applies the theme, closes, and returns focus to the trigger.",
    );
    expect(within(keyboard).queryByRole("row", { name: /keeps the menu open/ })).toBeNull();
    // Menu's other rows are reused as they are, so they can't drift.
    expect(showcase?.keyboard).toHaveLength(menuKeyboard.length - 1);
    expect(showcase?.keyboard).toEqual(
      expect.arrayContaining(menuKeyboard.filter((r) => r.keys !== "Enter" && r.keys !== "Space")),
    );

    for (const note of [
      /chevron shows sighted users that the trigger opens a menu\. Screen readers announce a menu button with its state/,
      /visible "Theme" label is the start of the accessible name/,
      /Hide the label \(showLabel=\{false\}\) only where the icons make the purpose clear/,
      /then shows as a tooltip on hover and keyboard focus, but voice control users still have to discover/,
      /caption gives the trigger's accessible name, role and state\. Exact wording varies/,
      /Space applies a theme and closes the menu/,
      /report the site's theme, even inside a preview panel/,
    ]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }

    await user.click(auto ?? label);
    const popup = document.getElementById(auto?.getAttribute("aria-controls") ?? "");
    await user.click(within(popup ?? label).getByRole("menuitemradio", { name: "Dark" }));

    expect(
      within(label).getByText("Announced as: “Theme: Dark, menu button, collapsed”"),
    ).toBeInTheDocument();
  });

  it("shows the Tooltip examples, its props, keyboard rows, notes and the customized CSS it applies (refinement R14.14)", async () => {
    const user = userEvent.setup();
    renderPage();
    const section = await screen.findByRole("region", { name: "Tooltip" });
    const example = (title: string) => within(section).getByRole("group", { name: title });
    /** The tooltip popup right after a trigger. */
    const popupAfter = (trigger: HTMLElement) => {
      const popup = trigger.nextElementSibling;
      return popup instanceof HTMLSpanElement && popup.hasAttribute("popover") ? popup : null;
    };

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "Description",
      "Icon-only names",
      "Sides",
      "Disabled reason",
      "In running text",
      "Controlled",
      "Customized with component tokens",
    ]);

    const description = example("Description");
    expect(
      within(description).getByRole("button", { name: describedButton.label }),
    ).toHaveAccessibleDescription(describedButton.tooltip);
    expect(description).toHaveTextContent(
      `Announced as: “${describedButton.label}, button, ${describedButton.tooltip}”`,
    );

    const names = example("Icon-only names");
    for (const name of ["Mark as done", "Next"]) {
      expect(popupAfter(within(names).getByRole("button", { name }))).toHaveTextContent(name);
    }
    expect(popupAfter(within(names).getByRole("button", { name: "Show more" }))).toBeNull();
    expect(within(names).getByText("No tooltip on the last: nameTooltip={false}.")).toBeVisible();

    const sides = example("Sides");
    expect(
      ["Top", "Bottom", "Start", "End"].map((name) =>
        popupAfter(within(sides).getByRole("button", { name }))?.getAttribute("data-side"),
      ),
    ).toEqual(["top", "bottom", "start", "end"]);

    const disabled = example("Disabled reason");
    const publish = within(disabled).getByRole("button", { name: "Publish" });
    expect(publish).toHaveAttribute("aria-disabled", "true");
    expect(publish).toHaveClass(buttonStyles.primary ?? "");
    expect(publish).toHaveAccessibleDescription("Add a title first");
    expect(within(disabled).getByText("Press or tap it to see why it's disabled.")).toBeVisible();

    const text = example("In running text");
    const link = within(text).getByRole("link", { name: "the token gallery" });
    expect(link).toHaveAttribute("href", "/lab/tokens");
    expect(link).toHaveAccessibleDescription("Every color, type and space token");
    expect(link.closest("p")).toContainElement(popupAfter(link));

    const controlled = example("Controlled");
    const pinned = within(controlled).getByRole("button", { name: "Pinned" });
    expect(within(controlled).getByText("The tooltip is hidden.")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    await user.click(within(controlled).getByRole("button", { name: "Show" }));
    expect(popupAfter(pinned)).toBeVisible();
    expect(within(controlled).getByText("The tooltip is shown.")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(popupAfter(pinned)).not.toBeVisible();
    expect(within(controlled).getByRole("button", { name: "Show" })).toBeInTheDocument();

    const custom = example("Customized with component tokens");
    expect(popupAfter(within(custom).getByRole("button", { name: "Custom" }))).toHaveClass(
      showcaseStyles.customTooltip ?? "",
    );
    expect([...custom.querySelectorAll("pre code")].map((code) => code.textContent)).toEqual([
      customTooltipCss,
    ]);
    expect(readFileSync(join(import.meta.dirname, "Showcase.module.css"), "utf8")).toContain(
      customTooltipCss,
    );

    const tooltip = showcases.find((s) => s.id === "tooltip");
    expect(tooltip?.props.map(({ part, docs }) => [part, Object.keys(docs)])).toEqual([
      ["Tooltip", ["content", "kind", "side", "open", "defaultOpen", "onOpenChange"]],
    ]);
    expect(tooltip?.propsNote).toMatch(
      /one child is the trigger: a focusable element that takes a ref.+no links, buttons or other interactive content.+kind="name" only when content repeats.+className and other native props go to the tooltip popup/,
    );
    expect(tooltip?.keyboard).toEqual(tooltipKeyboard);
    expect(tooltipKeyboard.map((row) => row.keys)).toEqual(["Tab", "Escape"]);
    await openReference(section);
    for (const note of [
      /role="tooltip" and becomes the trigger's accessible description.+hidden from assistive technology/,
      /in the page from the start, so the description is there before JavaScript loads/,
      /300ms hover.+Keyboard focus shows it at once.+focus from a mouse press doesn't/,
      /stays until dismissed.+never hides on a timer \(WCAG 1\.4\.13\)/,
      /Touch shows no tooltips, except a disabled Button's reason/,
      /Never put essential information only in a tooltip/,
      /fades over component\.tooltip\.transition-duration, 0ms under reduced motion/,
      /In forced colors, the bubble and its arrow are outlined/,
    ]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }
  });

  it("documents the tooltip props on Button, Link, MenuTrigger and ThemeSwitcher (refinement R14.14)", async () => {
    renderPage();
    const docsOf = (id: string, part: string) =>
      showcases.find((s) => s.id === id)?.props.find((p) => p.part === part)?.docs ?? {};

    expect(Object.keys(docsOf("button", "Button"))).toEqual(
      expect.arrayContaining(["disabledReason", "nameTooltip"]),
    );
    expect(Object.keys(docsOf("menu", "MenuTrigger (same as Button)"))).toEqual(
      expect.arrayContaining(["disabledReason", "nameTooltip"]),
    );
    expect(Object.keys(docsOf("link", "Link"))).toContain("nameTooltip");
    expect(Object.keys(docsOf("link", "Link"))).not.toContain("disabledReason");
    expect(Object.keys(docsOf("theme-switcher", "ThemeSwitcher"))).toContain("nameTooltip");

    const button = await screen.findByRole("region", { name: "Button" });
    const disabled = within(
      within(button).getByRole("group", { name: "Disabled (still focusable)" }),
    )
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-describedby") !== null);
    expect(disabled).toEqual([true, false, false]);
    await openReference(button);
    expect(
      within(button).getByText(/disabledReason is the disabled button's accessible description/),
    ).toBeInTheDocument();
    expect(
      within(button).getByText(/Icon-only buttons show their name as a tooltip/),
    ).toBeInTheDocument();
  });

  it("has no axe violations (R3.9)", async () => {
    const { container } = renderPage();
    await screen.findByRole("list", { name: "On this page" });

    await expectNoAxeViolations(container);
  }, 30_000);
});
