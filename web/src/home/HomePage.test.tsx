import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { homeContent } from "../content/home.ts";
import { HomePage } from "./HomePage.tsx";

function renderPage() {
  const { container } = render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
  return container;
}

describe("HomePage (home R1)", () => {
  it("shows the hero, then What I build, then How I develop, and nothing after (R1.1)", () => {
    const container = renderPage();

    const [hero, work, principles, ...rest] = [...container.children];
    expect(hero).toContainElement(screen.getByRole("heading", { level: 1 }));
    expect(work).toBe(screen.getByRole("region", { name: homeContent.workHeading }));
    expect(principles).toBe(screen.getByRole("region", { name: homeContent.principlesHeading }));
    expect(rest).toEqual([]);
  });

  it("has one h1, two h2s and an h3 per card (R1.2)", () => {
    renderPage();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      homeContent.workHeading,
      homeContent.principlesHeading,
    ]);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(5);
  });

  it("labels each section by its h2 (R1.3)", () => {
    renderPage();

    for (const heading of screen.getAllByRole("heading", { level: 2 })) {
      const section = heading.closest("section");
      expect(section).toHaveAttribute("aria-labelledby", heading.id);
      expect(section).toHaveAccessibleName(heading.textContent);
    }
  });
});
