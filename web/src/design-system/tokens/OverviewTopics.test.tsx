import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { Overview } from "../components/Overview.tsx";
import { semanticUsageCode, stylingCode } from "../snippets.ts";
import { OverviewTopics } from "./OverviewTopics.tsx";
import { namingExamples, pairingCount, reducedCount, themedCount, tierRules } from "./stats.ts";

function section(name: string) {
  const heading = screen.getByRole("heading", { level: 2, name });
  const container = heading.parentElement;
  if (!container) throw new Error(`No section for ${name}`);
  return container;
}

/** The code text of each CodeBlock in `container`. */
const codeBlocks = (container: HTMLElement) =>
  [...container.querySelectorAll("pre code")].map((code) => code.textContent);

describe("OverviewTopics (ds-tokens R3)", () => {
  it("has Naming, Theming, Usage and Accessibility h2s with stable ids", () => {
    render(<OverviewTopics />);

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => [h.id, h.textContent])).toEqual([
      ["naming", "Naming"],
      ["theming", "Theming"],
      ["usage", "Usage"],
      ["accessibility", "Accessibility"],
    ]);
  });

  it("names a real token of each tier, linked to its row, and the tier rules (R3.1)", () => {
    render(<OverviewTopics />);
    const naming = section("Naming");

    for (const token of namingExamples) {
      expect(within(naming).getByRole("link", { name: token.name })).toHaveAttribute(
        "href",
        `#${token.name.replaceAll(".", "-")}`,
      );
      if (token.tier !== "primitive") expect(naming).toHaveTextContent(token.cssVar);
    }
    expect(naming).toHaveTextContent("color.gold.600, no custom property");
    const semantic = namingExamples.find((token) => token.tier === "semantic");
    if (semantic?.tier !== "semantic") throw new Error("expected a semantic example");
    expect(naming).toHaveTextContent(
      `as in ${semantic.name}. Semantic and component tokens are CSS custom properties named by the same path, with each dot as a dash: ${semantic.cssVar}.`,
    );
    for (const rule of Object.values(tierRules)) expect(naming).toHaveTextContent(rule);
  });

  it("gives the themed and reduced-motion counts from metadata (R3.2)", () => {
    render(<OverviewTopics />);

    expect(section("Theming")).toHaveTextContent(
      `${String(themedCount)} of them have a light and a dark value`,
    );
    expect(section("Theming")).toHaveTextContent(
      `the ${String(reducedCount)} motion.duration tokens`,
    );
  });

  it("shows the semantic snippet and the Components overview's styling snippet (R3.3)", () => {
    render(<OverviewTopics />);
    expect(codeBlocks(section("Usage"))).toEqual([semanticUsageCode, stylingCode]);

    const { container } = render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>,
    );
    expect(codeBlocks(container)).toContain(stylingCode);
  });

  it("gives the pairing count and the three minimums (R3.4)", () => {
    render(<OverviewTopics />);
    const accessibility = section("Accessibility");

    expect(accessibility).toHaveTextContent(`all ${String(pairingCount)} declared pairings`);
    expect(accessibility).toHaveTextContent("4.5:1 for text, 3:1 for large text and 3:1");
  });
});
