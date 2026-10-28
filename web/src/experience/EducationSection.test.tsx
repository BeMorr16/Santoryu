import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../test/axe.ts";
import { education, experienceContent } from "../content/experience.ts";
import { EducationSection } from "./EducationSection.tsx";

function renderSection() {
  const { container } = render(<EducationSection />);
  const heading = screen.getByRole("heading", {
    level: 2,
    name: experienceContent.educationHeading,
  });
  return { container, section: heading.closest("section") as HTMLElement };
}

describe("EducationSection (resume R9)", () => {
  it("lists the entries in order: credential, school and year (R9.1)", () => {
    const { section } = renderSection();

    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(education.length);
    education.forEach((entry, index) => {
      const item = items[index] as HTMLElement;
      expect(item).toHaveTextContent(entry.credential);
      expect(item).toHaveTextContent(`${entry.school} · ${String(entry.year)}`);
      expect(item.querySelector("time")).toHaveAttribute("datetime", String(entry.year));
    });
  });

  it("shows each note where set", () => {
    const { section } = renderSection();

    for (const entry of education) {
      if ("note" in entry) expect(within(section).getByText(entry.note)).toBeVisible();
    }
  });

  it("shows no GPA and no headings below the h2 (R9.2, R3.2)", () => {
    const { section } = renderSection();

    expect(section).not.toHaveTextContent(/GPA/i);
    expect(within(section).getAllByRole("heading")).toHaveLength(1);
  });

  it("has no axe violations", async () => {
    const { container } = renderSection();

    await expectNoAxeViolations(container);
  });
});
