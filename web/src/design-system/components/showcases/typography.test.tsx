import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import typographyStyles from "../../../components/Typography/Typography.module.css";
import showcaseStyles from "../Showcase.module.css";
import { customLabelCss, scale, tones } from "./typography.tsx";
import {
  describeComponentPage,
  exampleTitle,
  expectCustomCss,
  renderComponentPage,
  showcases,
} from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/typography.tsx";

const renderPage = () => renderComponentPage(route, "typography");

describeComponentPage(route, "typography");

describe("Typography page examples", () => {
  it("shows the Typography examples, the scale, tones, measure, inline text and the customized CSS it applies (refinement R12.13)", async () => {
    await renderPage();
    const section = screen.getByRole("main");
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

    // Past the group's own h3 title, the scale renders no headings.
    const scaleExample = example("Type scale").lastElementChild;
    if (!(scaleExample instanceof HTMLElement)) throw new Error("no Type scale content");
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
    expect(readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8")).toContain(
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

  it("shows Typography's customized CSS in a CodeBlock labelled CSS, as Showcase.module.css applies it (refinement R15.11)", async () => {
    const { page } = await renderPage();

    expectCustomCss(
      page,
      customLabelCss,
      readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8"),
    );
  });
});
