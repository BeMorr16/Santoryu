import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { experienceContent, type Highlight, type SkillId } from "../content/experience.ts";
import { EntryHighlights } from "./EntryHighlights.tsx";
import { emptySelection, type Selection } from "./model.ts";

// Neutral made-up highlights, tagged with real skill ids.
const highlights: readonly Highlight[] = [
  {
    id: "first",
    title: "First piece",
    summary: "Built the first piece.",
    details: ["One.", "Two."],
    skills: ["react"],
  },
  {
    id: "second",
    title: "Second piece",
    summary: "Built the second piece.",
    details: ["One.", "Two."],
    skills: ["css"],
  },
];

function renderList(list: readonly Highlight[], selection: Selection = emptySelection) {
  return render(<EntryHighlights highlights={list} selection={selection} />).container;
}

const h4s = () => screen.queryAllByRole("heading", { level: 4 }).map((h) => h.textContent);

describe("EntryHighlights (resume R4.4, R7.3; experience-skills R3.2, R3.3)", () => {
  it("shows every highlight while nothing is selected", () => {
    renderList(highlights);

    expect(h4s()).toEqual(["First piece", "Second piece"]);
    expect(screen.queryByText(experienceContent.noMatch)).toBeNull();
  });

  it("shows the highlights that use any selected skill (OR)", () => {
    renderList(highlights, new Set<SkillId>(["css"]));
    expect(h4s()).toEqual(["Second piece"]);
  });

  it("shows both when each matches one of the selected skills", () => {
    renderList(highlights, new Set<SkillId>(["react", "css"]));
    expect(h4s()).toEqual(["First piece", "Second piece"]);
  });

  it("shows the no-match line, and no list, when none matches", () => {
    renderList(highlights, new Set<SkillId>(["python"]));

    expect(h4s()).toEqual([]);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByText(experienceContent.noMatch)).toBeVisible();
  });

  it("renders nothing for an empty list, even while filtering", () => {
    expect(renderList([], new Set<SkillId>(["python"]))).toBeEmptyDOMElement();
  });
});
