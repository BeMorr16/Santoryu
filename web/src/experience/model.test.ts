import { describe, expect, it } from "vitest";
import type { Highlight, Position, SkillId } from "../content/experience.ts";
import {
  categorySkills,
  countHighlights,
  emptySelection,
  formatYearMonth,
  matchesQuery,
  matchesSelection,
  selectedCount,
  toggleSkill,
  toggleSkills,
  usedSkillIds,
  type ListedSkill,
  type Selection,
} from "./model.ts";

// Neutral made-up fixtures; the ids aren't the content's, so they're cast.
const id = (value: string) => value as SkillId;
const alpha = id("alpha");
const beta = id("beta");
const gamma = id("gamma");
const delta = id("delta");

const fixtureSkills: readonly ListedSkill[] = [
  { id: alpha, label: "Alpha", category: "languages", aliases: ["First letter"] },
  { id: beta, label: "Beta", category: "languages" },
  { id: gamma, label: "Gamma", category: "frontend" },
  { id: delta, label: "Delta", category: "languages" },
];

function highlight(name: string, skillIds: readonly SkillId[]): Highlight {
  return {
    id: name,
    title: name,
    summary: "Summary.",
    details: ["One.", "Two."],
    skills: skillIds,
  };
}

const first = highlight("first", [alpha, beta]);
const second = highlight("second", [gamma]);
const third = highlight("third", [beta]);

const fixturePositions: readonly Position[] = [
  {
    id: "one",
    title: "Role",
    company: "Company",
    start: "2020-01",
    highlights: [first, second],
  },
  { id: "two", title: "Role", company: "Company", start: "2019-01", highlights: [third] },
  { id: "three", title: "Role", company: "Company", start: "2018-01", highlights: [] },
];

const select = (...ids: SkillId[]): Selection => new Set(ids);

describe("usedSkillIds (resume R6.3)", () => {
  it("is every skill a highlight lists, and only those", () => {
    expect(usedSkillIds(fixturePositions)).toEqual(new Set([alpha, beta, gamma]));
  });

  it("turns a skill into a used one when a highlight lists it", () => {
    expect(usedSkillIds(fixturePositions).has(delta)).toBe(false);
    const withDelta: readonly Position[] = [
      ...fixturePositions,
      {
        id: "four",
        title: "Role",
        company: "Company",
        start: "2017-01",
        highlights: [highlight("fourth", [delta])],
      },
    ];
    expect(usedSkillIds(withDelta).has(delta)).toBe(true);
  });
});

describe("categorySkills (resume R6.2, R6.4)", () => {
  it("keeps authored order and splits used from other", () => {
    const { used, other } = categorySkills("languages", select(alpha, delta), fixtureSkills);
    expect(used.map((skill) => skill.id)).toEqual([alpha, delta]);
    expect(other.map((skill) => skill.id)).toEqual([beta]);
  });

  it("is empty for a category with no skills", () => {
    expect(categorySkills("devops", select(alpha), fixtureSkills)).toEqual({
      used: [],
      other: [],
    });
  });
});

describe("matchesSelection (resume R7.1, R7.2)", () => {
  it("matches every highlight while nothing is selected", () => {
    expect([first, second, third].every((h) => matchesSelection(h, emptySelection))).toBe(true);
  });

  it("matches a highlight that lists any selected skill (OR)", () => {
    const selection = select(alpha, gamma);
    expect(matchesSelection(first, selection)).toBe(true);
    expect(matchesSelection(second, selection)).toBe(true);
    expect(matchesSelection(third, selection)).toBe(false);
  });
});

describe("countHighlights (resume R7.7)", () => {
  it("counts every highlight as shown while nothing is selected", () => {
    expect(countHighlights(fixturePositions, emptySelection)).toEqual({ shown: 3, total: 3 });
  });

  it("counts the matching highlights out of the total", () => {
    expect(countHighlights(fixturePositions, select(beta))).toEqual({ shown: 2, total: 3 });
    expect(countHighlights(fixturePositions, select(delta))).toEqual({ shown: 0, total: 3 });
  });
});

describe("toggleSkill (resume R7.2)", () => {
  it("adds an unselected skill, then removes it", () => {
    const added = toggleSkill(emptySelection, alpha);
    expect(added).toEqual(new Set([alpha]));
    expect(toggleSkill(added, alpha)).toEqual(new Set());
  });
});

describe("toggleSkills (resume R7.4)", () => {
  it("selects them all when none are selected", () => {
    expect(toggleSkills(emptySelection, [alpha, beta])).toEqual(new Set([alpha, beta]));
  });

  it("selects them all when some are unselected, keeping other skills", () => {
    expect(toggleSkills(select(alpha, gamma), [alpha, beta])).toEqual(
      new Set([alpha, beta, gamma]),
    );
  });

  it("clears them all when all are selected, keeping other skills", () => {
    expect(toggleSkills(select(alpha, beta, gamma), [alpha, beta])).toEqual(new Set([gamma]));
  });
});

describe("selectedCount (resume R7.5)", () => {
  it("counts the selected skills among the ids", () => {
    expect(selectedCount(select(alpha, gamma), [alpha, beta])).toBe(1);
    expect(selectedCount(emptySelection, [alpha, beta])).toBe(0);
  });
});

describe("matchesQuery (resume R8.1)", () => {
  const [alphaSkill, betaSkill] = fixtureSkills as [ListedSkill, ListedSkill];

  it("matches part of the label, ignoring case and surrounding spaces", () => {
    expect(matchesQuery(alphaSkill, "lph")).toBe(true);
    expect(matchesQuery(alphaSkill, "  ALPHA ")).toBe(true);
    expect(matchesQuery(betaSkill, "alpha")).toBe(false);
  });

  it("matches an alias", () => {
    expect(matchesQuery(alphaSkill, "first")).toBe(true);
    expect(matchesQuery(betaSkill, "first")).toBe(false);
  });

  it("matches everything for an empty or blank query", () => {
    expect(matchesQuery(betaSkill, "")).toBe(true);
    expect(matchesQuery(betaSkill, "   ")).toBe(true);
  });
});

describe("formatYearMonth (resume R4.2)", () => {
  it.each([
    ["2025-04", "Apr 2025"],
    ["2024-01", "Jan 2024"],
    ["2023-12", "Dec 2023"],
  ] as const)("formats %s as %s", (value, expected) => {
    expect(formatYearMonth(value)).toBe(expected);
  });
});

describe("purity", () => {
  it("never mutates its inputs, and returns a new Set", () => {
    const selection = select(alpha);
    const ids = [alpha, beta];
    const before = { selection: [...selection], ids: [...ids] };

    const toggled = toggleSkill(selection, beta);
    const grouped = toggleSkills(selection, ids);
    usedSkillIds(fixturePositions);
    categorySkills("languages", selection, fixtureSkills);
    countHighlights(fixturePositions, selection);

    expect([...selection]).toEqual(before.selection);
    expect(ids).toEqual(before.ids);
    expect(toggled).not.toBe(selection);
    expect(grouped).not.toBe(selection);
    expect(first.skills).toEqual([alpha, beta]);
  });
});
