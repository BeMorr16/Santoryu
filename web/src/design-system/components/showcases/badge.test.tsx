import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import typographyStyles from "../../../components/Typography/Typography.module.css";
import showcaseStyles from "../Showcase.module.css";
import badgeStyles from "../../../components/Badge/Badge.module.css";
import { customBadgeCss } from "./badge.tsx";
import {
  describeComponentPage,
  exampleTitle,
  expectCustomCss,
  renderComponentPage,
  showcases,
} from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/badge.tsx";

const renderPage = () => renderComponentPage(route, "badge");

describeComponentPage(route, "badge");

describe("Badge page examples", () => {
  it("shows the Badge examples, variants, icons and the customized CSS it applies (refinement R9.10)", async () => {
    await renderPage();
    const section = screen.getByRole("main");
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
    expect(readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8")).toContain(
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

  it("shows Badge's customized CSS in a CodeBlock labelled CSS, as Showcase.module.css applies it (refinement R15.11)", async () => {
    const { page } = await renderPage();

    expectCustomCss(
      page,
      customBadgeCss,
      readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8"),
    );
  });
});
