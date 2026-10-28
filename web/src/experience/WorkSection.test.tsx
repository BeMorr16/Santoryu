import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../test/axe.ts";
import { experienceContent, positions } from "../content/experience.ts";
import { emptySelection } from "./model.ts";
import { WorkSection } from "./WorkSection.tsx";

function renderSection() {
  const { container } = render(<WorkSection selection={emptySelection} />);
  return {
    container,
    section: screen.getByRole("region", { name: experienceContent.workHeading }),
  };
}

describe("WorkSection (resume R3.2, R3.4, R4.1)", () => {
  it("is a region named by its h2, Work (R12.4)", () => {
    const { section } = renderSection();

    expect(within(section).getByRole("heading", { level: 2 })).toHaveTextContent(
      experienceContent.workHeading,
    );
  });

  it("shows every position's h3 in authored order (R4.1)", () => {
    const { section } = renderSection();

    expect(
      within(section)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(positions.map((position) => `${position.title}, ${position.company}`));
  });

  it("puts one decorative separator between consecutive positions, and draws no hr (R3.4)", () => {
    const { section } = renderSection();

    expect(section.querySelectorAll('[aria-hidden="true"]:empty')).toHaveLength(
      positions.length - 1,
    );
    expect(within(section).queryAllByRole("separator")).toEqual([]);
  });

  it("has no axe violations", async () => {
    const { container } = renderSection();

    await expectNoAxeViolations(container);
  });
});
