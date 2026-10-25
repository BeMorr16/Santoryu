import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import showcaseStyles from "../Showcase.module.css";
import figureStyles from "../../../components/Figure/Figure.module.css";
import { missingImageSrc } from "./figure-photos.ts";
import { customFigureCss, elk, falls } from "./figure.tsx";
import {
  describeComponentPage,
  exampleTitle,
  renderComponentPage,
  showcases,
} from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/figure.tsx";

const renderPage = () => renderComponentPage(route, "figure");

describeComponentPage(route, "figure");

describe("Figure page examples", () => {
  it("shows the Figure examples, its props, notes and the customized CSS it applies (refinement R18.10)", async () => {
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => within(section).getByRole("group", { name: title });
    const figureIn = (element: HTMLElement) => element.querySelector("figure");

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "Informative with a caption",
      "Tall image",
      "Failed to load",
      "Decorative",
      "Customized with component tokens",
    ]);

    const informative = example("Informative with a caption");
    const elkImage = within(informative).getByRole("img", { name: elk.alt });
    expect(elkImage).toHaveAttribute("srcset", elk.srcSet);
    expect(elkImage).toHaveAttribute("sizes", elk.sizes);
    expect(elkImage).toHaveAttribute("width", String(elk.width));
    expect(elkImage).toHaveAttribute("height", String(elk.height));
    expect(elk.srcSet.split(", ")).toHaveLength(3);
    expect(figureIn(informative)?.querySelector("figcaption")).toHaveTextContent(elk.caption);
    expect(informative).toHaveTextContent(/The figure is named by its caption/);

    const tall = example("Tall image");
    const fallsImage = within(tall).getByRole("img", { name: falls.alt });
    expect(fallsImage).toHaveAttribute("srcset", falls.srcSet);
    expect(falls.height).toBeGreaterThan(falls.width);
    expect(figureIn(tall)?.querySelector("figcaption")).toHaveTextContent(falls.caption);
    expect(tall).toHaveTextContent(/Capped at 80% of the window's height/);

    const failed = example("Failed to load");
    const missing = within(failed).getByRole("img", { name: elk.alt });
    expect(missing).toHaveAttribute("src", missingImageSrc);
    expect(missing).not.toHaveAttribute("srcset");
    expect(figureIn(failed)?.querySelector("figcaption")).toHaveTextContent(
      "This file is missing.",
    );
    expect(failed).toHaveTextContent(
      /screen readers still read its alt text, and browsers show it where it fits/,
    );

    const decorative = example("Decorative");
    expect(within(decorative).queryByRole("img")).toBeNull();
    expect(figureIn(decorative)?.querySelector("img")).toHaveAttribute("alt", "");
    expect(figureIn(decorative)?.querySelector("figcaption")).toBeNull();
    expect(figureIn(decorative)).toHaveAttribute("role", "none");
    expect(within(decorative).queryByRole("figure")).toBeNull();
    expect(figureIn(decorative)?.previousElementSibling?.tagName).toBe("P");
    expect(decorative).toHaveTextContent(
      /so the image is decorative: it has alt="", and screen readers skip it/,
    );

    const custom = example("Customized with component tokens");
    expect(figureIn(custom)).toHaveClass(
      showcaseStyles.customFigure ?? "",
      figureStyles.figure ?? "",
    );
    expect(custom.querySelector("pre code")?.textContent).toBe(customFigureCss);
    expect(readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8")).toContain(
      customFigureCss,
    );

    const figure = showcases.find((s) => s.id === "figure");
    expect(figure?.props.map(({ part, docs }) => [part, Object.keys(docs)])).toEqual([
      [
        "Figure",
        [
          "alt",
          "decorative",
          "caption",
          "src",
          "srcSet",
          "sizes",
          "width",
          "height",
          "loading",
          "decoding",
          "fetchPriority",
          "crossOrigin",
          "referrerPolicy",
        ],
      ],
    ]);
    // In the Content group, after Table and before Separator (ds-components R2.2).
    const ids = showcases.map((s) => s.id);
    const at = ids.indexOf("figure");
    expect(ids.slice(at - 1, at + 2)).toEqual(["table", "figure", "separator"]);
    expect(figure?.propsNote).toMatch(
      /There are no children.+exactly one of alt or decorative, and a literal alt="" is a type error.+width and height are required and are the image's intrinsic pixel size.+className, other native props and ref reach the figure.+no margin, so the parent's gap spaces it/,
    );
    expect(figure?.keyboard).toBeUndefined();
    expect(within(section).queryByRole("table", { name: "Figure keyboard" })).toBeNull();
    for (const note of [
      /Alt text says what the image shows or does.+don't repeat the caption/,
      /Use decorative where nearby text already says everything the image shows.+with no caption the figure itself is hidden \(role="none"\)/,
      /A caption names the figure/,
      /A chart, diagram or screenshot with detail needs a full description/,
      /If an image fails to load, screen readers still read its alt text/,
      /Tall images are capped at 80% of the window's height/,
      /loading="eager" and fetchPriority="high"/,
    ]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }
  });
});
