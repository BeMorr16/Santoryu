import { describe, expect, it } from "vitest";
import {
  education,
  experienceContent,
  positions,
  skillCategories,
  skills,
  type Highlight,
  type Position,
  type Skill,
} from "./experience.ts";

const skillList: readonly Skill[] = skills;
const positionList: readonly Position[] = positions;
const highlights: readonly Highlight[] = positionList.flatMap((position) => position.highlights);

/** Every string in a value, walked recursively; functions are called with sample arguments. */
function strings(value: unknown, path: string): { path: string; text: string }[] {
  if (typeof value === "string") return [{ path, text: value }];
  if (typeof value === "function") {
    const template = value as (...args: unknown[]) => unknown;
    return strings(template(3, 13), `${path}(3, 13)`).concat(
      strings(template(13, 13), `${path}(13, 13)`),
      strings(template("query"), `${path}("query")`),
    );
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, child]) => strings(child, `${path}.${key}`));
  }
  return [];
}

describe("skills (resume R11.3)", () => {
  it("gives every skill a unique id and a unique label", () => {
    expect(new Set(skillList.map((skill) => skill.id)).size).toBe(skillList.length);
    expect(new Set(skillList.map((skill) => skill.label.toLowerCase())).size).toBe(
      skillList.length,
    );
  });

  it("never repeats an alias within a skill, or uses another skill's label as one", () => {
    const labels = new Map(skillList.map((skill) => [skill.label.toLowerCase(), skill.id]));
    for (const skill of skillList) {
      const aliases = (skill.aliases ?? []).map((alias) => alias.toLowerCase());
      expect(new Set(aliases).size, skill.id).toBe(aliases.length);
      for (const alias of aliases) {
        const owner = labels.get(alias);
        expect(owner === undefined || owner === skill.id, `${skill.id}: ${alias}`).toBe(true);
      }
    }
  });

  it("puts every skill in one of the six categories", () => {
    for (const skill of skillList) {
      expect(skillCategories, skill.id).toContain(skill.category);
    }
  });

  it("has at least one skill in every category", () => {
    for (const category of skillCategories) {
      expect(
        skillList.some((skill) => skill.category === category),
        category,
      ).toBe(true);
    }
  });
});

describe("highlights (resume R11.3)", () => {
  it("lists one or more skills per highlight, with no duplicates", () => {
    for (const highlight of highlights) {
      expect(highlight.skills.length, highlight.id).toBeGreaterThan(0);
      expect(new Set(highlight.skills).size, highlight.id).toBe(highlight.skills.length);
    }
  });

  it("has 2–4 details per highlight", () => {
    for (const highlight of highlights) {
      expect(highlight.details.length, highlight.id).toBeGreaterThanOrEqual(2);
      expect(highlight.details.length, highlight.id).toBeLessThanOrEqual(4);
    }
  });

  it("gives every position and highlight a unique id", () => {
    expect(new Set(positionList.map((position) => position.id)).size).toBe(positionList.length);
    expect(new Set(highlights.map((highlight) => highlight.id)).size).toBe(highlights.length);
  });
});

describe("contact details (resume R11.4)", () => {
  const all = strings({ experienceContent, positions, education, skills }, "content");

  it("walks every string, templates included", () => {
    expect(all.some(({ path }) => path.endsWith(".count(3, 13)"))).toBe(true);
    expect(all.some(({ path }) => path.endsWith('.noSkillsMatch("query")'))).toBe(true);
    expect(all.some(({ path }) => path.includes(".details."))).toBe(true);
  });

  it("publishes no email address, mailto: link or phone number", () => {
    for (const { path, text } of all) {
      expect(text, path).not.toContain("@");
      expect(text, path).not.toContain("mailto:");
      expect(text, path).not.toMatch(/\+?\d[\d\s().-]{7,}\d/);
    }
  });
});

describe("dates and metadata (resume R11.5)", () => {
  it("never ends a position before it starts", () => {
    for (const position of positionList) {
      if (position.end === undefined) continue;
      expect(position.end >= position.start, position.id).toBe(true);
    }
  });

  it("keeps the meta description within 160 characters", () => {
    expect(experienceContent.description.length).toBeLessThanOrEqual(160);
  });

  it("has a label for every category", () => {
    expect(Object.keys(experienceContent.categories)).toEqual([...skillCategories]);
  });
});

describe("education (resume R9)", () => {
  it("gives every entry a unique id and a four-digit year", () => {
    expect(new Set(education.map((entry) => entry.id)).size).toBe(education.length);
    for (const entry of education) {
      expect(String(entry.year), entry.id).toMatch(/^\d{4}$/);
    }
  });
});
