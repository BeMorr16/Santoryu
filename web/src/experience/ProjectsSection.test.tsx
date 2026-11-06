import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../test/axe.ts";
import { experienceContent, type Project } from "../content/experience.ts";
import { emptySelection } from "./model.ts";
import { ProjectsSection } from "./ProjectsSection.tsx";

// Neutral made-up projects, tagged with real skill ids.
function project(id: string, name: string): Project {
  return {
    id,
    name,
    start: "2026-01",
    about: `About ${name}.`,
    links: [{ label: `${name} source`, href: "https://example.test", icon: "github" }],
    highlights: [
      {
        id: `${id}-highlight`,
        title: `${name} piece`,
        summary: "Built a piece.",
        details: ["One.", "Two."],
        skills: ["react"],
      },
    ],
  };
}

const two = [project("first", "First project"), project("second", "Second project")];

function renderSection(list: readonly Project[]) {
  const { container } = render(
    <MemoryRouter>
      <ProjectsSection selection={emptySelection} list={list} />
    </MemoryRouter>,
  );
  return {
    container,
    section: screen.getByRole("region", { name: experienceContent.projectsHeading }),
  };
}

const separators = (section: HTMLElement) => section.querySelectorAll('[aria-hidden="true"]:empty');

describe("ProjectsSection (experience-skills R1.3, R1.5, R2.1)", () => {
  it("is a region named by its h2, Projects (R1.3)", () => {
    const { section } = renderSection(two);

    expect(within(section).getByRole("heading", { level: 2 })).toHaveTextContent(
      experienceContent.projectsHeading,
    );
  });

  it("shows one h3 per project, in authored order (R2.1)", () => {
    const { section } = renderSection(two);

    expect(
      within(section)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["First project", "Second project"]);
  });

  it("puts one decorative separator between two projects, and draws no hr (R1.5)", () => {
    const { section } = renderSection(two);

    expect(separators(section)).toHaveLength(1);
    expect(within(section).queryAllByRole("separator")).toEqual([]);
  });

  it("draws no separator for one project", () => {
    const { section } = renderSection(two.slice(0, 1));

    expect(separators(section)).toHaveLength(0);
  });

  it("has no axe violations", async () => {
    const { container } = renderSection(two);

    await expectNoAxeViolations(container);
  });
});
