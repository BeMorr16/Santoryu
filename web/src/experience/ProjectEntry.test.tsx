import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../test/axe.ts";
import buttonStyles from "../components/shared/button-styles.module.css";
import { experienceContent, type Project, type SkillId } from "../content/experience.ts";
import { emptySelection, type Selection } from "./model.ts";
import { ProjectEntry } from "./ProjectEntry.tsx";

// A neutral made-up project, tagged with real skill ids.
const project: Project = {
  id: "sample",
  name: "sample.example",
  start: "2026-01",
  about: "A made-up project for tests.",
  links: [
    { label: "Sample source", href: "https://example.test/source", icon: "github" },
    { label: "Sample docs", href: "/sample-docs", icon: "palette" },
  ],
  highlights: [
    {
      id: "sample-first",
      title: "First piece",
      summary: "Built the first piece.",
      details: ["One.", "Two."],
      skills: ["react"],
    },
    {
      id: "sample-second",
      title: "Second piece",
      summary: "Built the second piece.",
      details: ["One.", "Two."],
      skills: ["css"],
    },
  ],
};

function renderEntry(selection: Selection = emptySelection) {
  const { container } = render(
    <MemoryRouter>
      <button type="button">Before</button>
      <ProjectEntry project={project} selection={selection} />
    </MemoryRouter>,
  );
  return { container, user: userEvent.setup() };
}

const linkList = () => screen.getByRole("list", { name: experienceContent.projectLinksLabel });
const h4s = () => screen.queryAllByRole("heading", { level: 4 }).map((h) => h.textContent);

/** The header, about line and links all show. */
function expectFrame() {
  expect(screen.getByRole("heading", { level: 3 })).toBeVisible();
  expect(screen.getByText(project.about)).toBeVisible();
  expect(within(linkList()).getAllByRole("link")).toHaveLength(2);
}

describe("ProjectEntry (experience-skills R2, R3)", () => {
  it("names the h3 by the project's name (R1.2)", () => {
    renderEntry();

    expect(screen.getByRole("heading", { level: 3 })).toHaveAccessibleName("sample.example");
  });

  it("shows the start in a <time>, Present, then the kind label (R2.2)", () => {
    const { container } = renderEntry();

    const time = container.querySelector("time");
    expect(time).toHaveAttribute("datetime", "2026-01");
    expect(time?.parentElement).toHaveTextContent(
      `Jan 2026 – ${experienceContent.present} · ${experienceContent.projectKind}`,
    );
  });

  it("shows the about line (R2.3)", () => {
    renderEntry();

    expect(screen.getByText(project.about)).toBeVisible();
  });

  it("lists the links in authored order, named by their text, as small secondary link-buttons (R2.4–R2.6, R6.4)", () => {
    renderEntry();

    const links = within(linkList()).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://example.test/source",
      "/sample-docs",
    ]);
    project.links.forEach((data, index) => {
      const link = links[index];
      expect(link).toHaveAccessibleName(data.label);
      expect(link).not.toHaveAttribute("target");
      expect(link).toHaveClass(
        buttonStyles.button ?? "",
        buttonStyles.secondary ?? "",
        buttonStyles.sm ?? "",
      );
      expect(link?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("shows every highlight while nothing is selected (R3.2)", () => {
    renderEntry();

    expect(h4s()).toEqual(["First piece", "Second piece"]);
  });

  it("shows only the matching highlight while skills are selected (R3.2)", () => {
    renderEntry(new Set<SkillId>(["css"]));

    expectFrame();
    expect(h4s()).toEqual(["Second piece"]);
    expect(screen.queryByText(experienceContent.noMatch)).toBeNull();
  });

  it("keeps the header, about line and links, with the no-match line, when none matches (R3.3)", () => {
    renderEntry(new Set<SkillId>(["python"]));

    expectFrame();
    expect(h4s()).toEqual([]);
    expect(screen.getByText(experienceContent.noMatch)).toBeVisible();
  });

  it("reaches both links with Tab, in order", async () => {
    const { user } = renderEntry();

    screen.getByRole("button", { name: "Before" }).focus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Sample source" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Sample docs" })).toHaveFocus();
  });

  it("has no axe violations, with and without a match", async () => {
    const { container } = renderEntry();
    await expectNoAxeViolations(container);

    const filtered = renderEntry(new Set<SkillId>(["python"]));
    await expectNoAxeViolations(filtered.container);
  });
});
