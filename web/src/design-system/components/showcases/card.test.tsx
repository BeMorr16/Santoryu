import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import typographyStyles from "../../../components/Typography/Typography.module.css";
import showcaseStyles from "../Showcase.module.css";
import cardStyles from "../../../components/Card/Card.module.css";
import { accentCardCss } from "./card.tsx";
import {
  describeComponentPage,
  exampleTitle,
  expectCustomCss,
  renderComponentPage,
  showcases,
} from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/card.tsx";

const renderPage = () => renderComponentPage(route, "card");

describeComponentPage(route, "card");

describe("Card page examples", () => {
  it("shows the Card examples, variants, parts and the customized CSS it applies (refinement R8.14)", async () => {
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => within(section).getByRole("group", { name: title });

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "Variants",
      "Parts",
      "With media",
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
      expect(within(card).getByRole("link")).toHaveAttribute("href", "/design-system/tokens");
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

    const media = example("With media");
    const mediaCards = within(media).getAllByRole("article");
    expect(mediaCards).toHaveLength(2);
    const [decorative, image] = mediaCards.map(
      (card) => card.querySelector(`.${cardStyles.media ?? ""}`)?.firstElementChild,
    );
    expect(within(media).getByRole("link", { name: "Color tokens" })).toHaveAttribute(
      "href",
      "/design-system/tokens",
    );
    expect(decorative).toHaveAttribute("aria-hidden", "true");
    expect(decorative).toHaveClass(showcaseStyles.mediaSwatches ?? "");
    expect(image?.tagName).toBe("IMG");
    expect(image).toHaveAccessibleName(/^A tall waterfall/);
    expect(image).toHaveAttribute("width", "480");
    expect(image).toHaveAttribute("height", "720");

    const linked = example("Linked, with a nested control");
    expect(within(linked).getByRole("link", { name: "Design tokens" })).toHaveAttribute(
      "href",
      "/design-system/tokens",
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
    expect(readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8")).toContain(
      accentCardCss,
    );

    const card = showcases.find((s) => s.id === "card");
    expect(Object.keys(card?.props[0]?.docs ?? {})).toEqual(
      expect.arrayContaining(["variant", "footer", "subgrid", "headingVariant", "media"]),
    );
    expect(card?.props[0]?.docs.headingVariant).toMatchObject({ default: '"h4"' });
    expect(card?.propsNote).toMatch(
      /subgrid works only when the Card is a direct child of a Grid.+horizontal Stack.+varied backdrop.+aria-current goes to its heading link.+Media is shown first but comes after the heading in the DOM/,
    );
    for (const note of [
      /never marked aria-current automatically/,
      /look comes from headingVariant and is the same at every level \(except with inherit or code\), so choose headingLevel by the page outline/,
      /can't be selected, because the link's overlay covers it/,
      /hover look shows only where a click follows the link/,
      /Media is shown above the heading but read after it, so the heading always comes first/,
      /Card doesn't hide media: mark decorative media aria-hidden, and make a decorative preview of controls inert too. Give a meaningful image alt text/,
      /A control in media is shown above the heading but focused after the heading link. Keep it inset from the media's edges by the focus ring's width plus offset, or its ring is clipped/,
      /Glass turns opaque when reduced transparency is requested/,
      /Outlined is transparent, so use it only on surface.base, raised or sunken/,
      /keep link cards of every variant off action.background/,
    ]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }
  });

  it("shows Card's customized CSS in a CodeBlock labelled CSS, as Showcase.module.css applies it (refinement R15.11)", async () => {
    const { page } = await renderPage();

    expectCustomCss(
      page,
      accentCardCss,
      readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8"),
    );
  });
});
