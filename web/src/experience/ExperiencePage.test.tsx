import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../test/axe.ts";
import { expectHydratesCleanly } from "../../test/component.tsx";
import buttonStyles from "../components/shared/button-styles.module.css";
import { experienceContent, positions, type Highlight } from "../content/experience.ts";
import { resumePdfPath } from "../site.config.ts";
import { ExperiencePage } from "./ExperiencePage.tsx";

const page = (
  <MemoryRouter>
    <main>
      <ExperiencePage />
    </main>
  </MemoryRouter>
);

const highlights = positions.flatMap<Highlight>((position) => position.highlights);

function renderPage() {
  return { user: userEvent.setup(), container: render(page).container };
}

const pdfLink = () => screen.getByRole("link", { name: experienceContent.pdfLabel });
const h4s = () => screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);

describe("ExperiencePage structure (resume R3.1, R3.2, R12.4)", () => {
  it("shows the h1, the PDF link, the Skills region, the Work region, then Education", () => {
    renderPage();

    const order = [
      screen.getByRole("heading", { level: 1, name: experienceContent.heading }),
      pdfLink(),
      screen.getByRole("region", { name: experienceContent.skillsHeading }),
      screen.getByRole("region", { name: experienceContent.workHeading }),
      screen.getByRole("heading", { level: 2, name: experienceContent.educationHeading }),
    ];
    for (let index = 1; index < order.length; index++) {
      const before = order[index - 1] as HTMLElement;
      const after = order[index] as HTMLElement;
      expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("has one h1, the h2s Skills, Work and Education, and skips no level", () => {
    renderPage();

    const headings = screen.getAllByRole("heading");
    const levels = headings.map((h) => Number(h.tagName.slice(1)));
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    levels.forEach((level, index) => {
      if (index > 0) expect(level).toBeLessThanOrEqual((levels[index - 1] ?? 0) + 1);
    });
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      experienceContent.skillsHeading,
      experienceContent.workHeading,
      experienceContent.educationHeading,
    ]);
  });
});

describe("PDF link (resume R10.2)", () => {
  it("is a secondary link-button that downloads the PDF in the same tab, with a hidden icon", () => {
    renderPage();

    const link = pdfLink();
    expect(link).toHaveAttribute("href", resumePdfPath);
    expect(link).toHaveAttribute("download");
    expect(link).not.toHaveAttribute("target");
    expect(link).toHaveClass(buttonStyles.button ?? "", buttonStyles.secondary ?? "");
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("filtering (resume R7.1, R7.3)", () => {
  it("shows every highlight while nothing is selected", () => {
    renderPage();

    expect(h4s()).toEqual(highlights.map((highlight) => highlight.title));
  });

  it("shows only the matching highlights after a skill is pressed, keeping every position", async () => {
    const { user } = renderPage();
    const work = screen.getByRole("region", { name: experienceContent.workHeading });
    const positionHeadings = within(work)
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);

    await user.click(screen.getByRole("button", { name: "Python" }));

    expect(h4s()).toEqual(
      highlights
        .filter((highlight) => highlight.skills.some((id) => id === "python"))
        .map((highlight) => highlight.title),
    );
    expect(
      within(work)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(positionHeadings);
    expect(within(work).getAllByText(experienceContent.noMatch).length).toBeGreaterThan(0);
  });
});

describe("rendering (resume R7.10, R12.1)", () => {
  it("hydrates cleanly with nothing selected", () => {
    expectHydratesCleanly(page);
  });

  it("has no axe violations, with and without a selection", async () => {
    const { user, container } = renderPage();

    await expectNoAxeViolations(container);
    await user.click(screen.getByRole("button", { name: "React" }));
    await expectNoAxeViolations(container);
  });
});
