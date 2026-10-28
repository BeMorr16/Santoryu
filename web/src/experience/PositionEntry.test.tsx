import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../test/axe.ts";
import { experienceContent, type Position, type SkillId } from "../content/experience.ts";
import { emptySelection, type Selection } from "./model.ts";
import { PositionEntry } from "./PositionEntry.tsx";

// Neutral made-up positions, tagged with real skill ids.
const current: Position = {
  id: "current",
  title: "Sample Engineer",
  company: "Example Co",
  start: "2025-04",
  highlights: [
    {
      id: "first",
      title: "First project",
      summary: "Built the first project.",
      details: ["One.", "Two."],
      skills: ["react"],
    },
    {
      id: "second",
      title: "Second project",
      summary: "Built the second project.",
      details: ["One.", "Two."],
      skills: ["css"],
    },
  ],
};

const past: Position = {
  id: "past",
  title: "Sample Developer",
  company: "Another Co",
  start: "2023-01",
  end: "2024-12",
  type: "part-time",
  location: "Remote",
  about: "A made-up company.",
  highlights: [],
};

function renderEntry(position: Position, selection: Selection = emptySelection) {
  return render(<PositionEntry position={position} selection={selection} />).container;
}

describe("PositionEntry (resume R4, R7.3)", () => {
  it("names the h3 by its title and company (R3.2, R4.2)", () => {
    renderEntry(current);

    expect(screen.getByRole("heading", { level: 3 })).toHaveAccessibleName(
      "Sample Engineer, Example Co",
    );
  });

  it("shows the start in a <time>, then Present when there's no end (R4.2)", () => {
    const container = renderEntry(current);

    const times = [...container.querySelectorAll("time")];
    expect(times.map((time) => time.getAttribute("datetime"))).toEqual(["2025-04"]);
    expect(times[0]).toHaveTextContent("Apr 2025");
    expect(times[0]?.parentElement).toHaveTextContent(`Apr 2025 – ${experienceContent.present}`);
  });

  it("shows both dates in yyyy-mm <time>s, then the location and type (R4.2)", () => {
    const container = renderEntry(past);

    const times = [...container.querySelectorAll("time")];
    expect(times.map((time) => time.getAttribute("datetime"))).toEqual(["2023-01", "2024-12"]);
    for (const time of times) {
      expect(time.getAttribute("datetime")).toMatch(/^\d{4}-\d{2}$/);
    }
    expect(times[0]?.parentElement).toHaveTextContent(
      `Jan 2023 – Dec 2024 · Remote · ${experienceContent.types["part-time"]}`,
    );
  });

  it("shows the about line where set (R4.3)", () => {
    renderEntry(past);

    expect(screen.getByText("A made-up company.")).toBeVisible();
  });

  it("shows every highlight while nothing is selected", () => {
    renderEntry(current);

    expect(screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual([
      "First project",
      "Second project",
    ]);
  });

  it("shows only the matching highlights while skills are selected (R7.3)", () => {
    renderEntry(current, new Set<SkillId>(["css"]));

    expect(screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual([
      "Second project",
    ]);
    expect(screen.queryByText(experienceContent.noMatch)).toBeNull();
  });

  it("keeps the header and shows the no-match line when no highlight matches (R7.3)", () => {
    renderEntry(current, new Set<SkillId>(["python"]));

    expect(screen.getByRole("heading", { level: 3 })).toBeVisible();
    expect(screen.queryByRole("heading", { level: 4 })).toBeNull();
    expect(screen.getByText(experienceContent.noMatch)).toBeVisible();
  });

  it("shows only the header for a position with no highlights, even while filtering (R4.4)", () => {
    renderEntry(past, new Set<SkillId>(["python"]));

    expect(screen.getByRole("heading", { level: 3 })).toBeVisible();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByText(experienceContent.noMatch)).toBeNull();
  });

  it("has no axe violations", async () => {
    await expectNoAxeViolations(renderEntry(current));
    await expectNoAxeViolations(renderEntry(past));
  });
});
