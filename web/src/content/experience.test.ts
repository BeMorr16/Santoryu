import { describe, expect, it } from "vitest";
import {
  education,
  entries,
  experienceContent,
  positions,
  projects,
  skillCategories,
  skills,
  type Highlight,
  type Position,
  type Project,
  type Skill,
} from "./experience.ts";

const skillList: readonly Skill[] = skills;
const positionList: readonly Position[] = positions;
const projectList: readonly Project[] = projects;
// Positions' and projects' highlights alike (experience-skills R5.3).
const highlights: readonly Highlight[] = entries.flatMap((entry) => entry.highlights);

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

describe("skills from this site (experience-skills R4.1–R4.3)", () => {
  const ids = (category: Skill["category"]) =>
    skillList.filter((skill) => skill.category === category).map((skill) => skill.id);
  const byId = (id: string) => skillList.find((skill) => skill.id === id);

  it("puts Java right after Python in Languages (R4.1)", () => {
    const languages = ids("languages");
    expect(languages[languages.indexOf("python") + 1]).toBe("java");
    expect(byId("java")?.label).toBe("Java");
  });

  it("puts AWS CDK right after AWS in DevOps & tooling, with its aliases (R4.2)", () => {
    const devops = ids("devops");
    expect(devops[devops.indexOf("aws") + 1]).toBe("aws-cdk");
    expect(byId("aws-cdk")).toMatchObject({
      label: "AWS CDK",
      aliases: ["IaC", "Infrastructure as code"],
    });
  });

  it("adds Lambda, CloudFront, S3 and SES to AWS's aliases, keeping its others (R4.3)", () => {
    expect(byId("aws")?.aliases).toEqual([
      "Amazon Web Services",
      "EKS",
      "Lambda",
      "CloudFront",
      "S3",
      "SES",
    ]);
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

  it("gives every entry and highlight a unique id, across positions and projects (experience-skills R5.4)", () => {
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
    expect(new Set(highlights.map((highlight) => highlight.id)).size).toBe(highlights.length);
  });
});

describe("contact details (resume R11.4)", () => {
  const all = strings({ experienceContent, positions, projects, education, skills }, "content");

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

  it("never ends a project before it starts (experience-skills R5.5)", () => {
    for (const project of projectList) {
      if (project.end === undefined) continue;
      expect(project.end >= project.start, project.id).toBe(true);
    }
  });

  it("keeps the meta description within 160 characters", () => {
    expect(experienceContent.description.length).toBeLessThanOrEqual(160);
  });

  it("has a label for every category", () => {
    expect(Object.keys(experienceContent.categories)).toEqual([...skillCategories]);
  });
});

describe("project links (experience-skills R5.6)", () => {
  it("points every link at a site path or an https:// URL", () => {
    for (const project of projectList) {
      for (const link of project.links) {
        expect(link.href, `${project.id}: ${link.label}`).toMatch(/^(\/(?!\/)|https:\/\/)/);
      }
    }
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
