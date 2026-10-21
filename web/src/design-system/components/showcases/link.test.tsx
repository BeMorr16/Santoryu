import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import linkStyles from "../../../components/Link/Link.module.css";
import buttonStyles from "../../../components/shared/button-styles.module.css";
import showcaseStyles from "../Showcase.module.css";
import { quietLinksCss } from "./link.tsx";
import {
  describeComponentPage,
  exampleTitle,
  expectCustomCss,
  renderComponentPage,
} from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/link.tsx";

const renderPage = () => renderComponentPage(route, "link");

describeComponentPage(route, "link");

describe("Link page examples", () => {
  it("shows Link's current-page, underline-on-hover, visited, new-tab, icon-only and customized examples (refinement R4.11, R11.12)", async () => {
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => {
      const element = within(section).getByText(title, { selector: "h3" }).parentElement;
      if (element === null) throw new Error(`no ${title} example`);
      return element;
    };

    const current = example("Current page");
    const expected = [
      ["This page", "page", "Announced as: “This page, link, current page”"],
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
      name: "Design System pages",
    });
    const hoverLinks = within(hoverPages).getAllByRole("link");
    expect(hoverLinks.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Design System", "/design-system"],
      ["Tokens", "/design-system/tokens"],
      ["Link", "/design-system/components/link"],
    ]);
    for (const link of hoverLinks) expect(link).toHaveClass(linkStyles.underlineHover ?? "");
    expect(within(hoverPages).getByRole("link", { name: "Link" })).toHaveAttribute(
      "aria-current",
      "page",
    );
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

  it("shows Link's customized CSS in a CodeBlock labelled CSS, as Showcase.module.css applies it (refinement R15.11)", async () => {
    const { page } = await renderPage();

    expectCustomCss(
      page,
      quietLinksCss,
      readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8"),
    );
  });
});
