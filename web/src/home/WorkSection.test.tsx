import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { homeContent, workCards } from "../content/home.ts";
import { WorkSection } from "./WorkSection.tsx";

function renderSection() {
  render(
    <MemoryRouter>
      <WorkSection />
    </MemoryRouter>,
  );
  return screen.getByRole("region", { name: homeContent.workHeading });
}

describe("WorkSection (home R3)", () => {
  it("lists the work cards in order, one h3 per card (R3.1, R3.2)", () => {
    const section = renderSection();

    const items = within(within(section).getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(workCards.length);
    expect(
      within(section)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(workCards.map((card) => card.title));
  });

  it("links the Design System card, named by its title alone (R3.3)", () => {
    const section = renderSection();

    const link = within(section).getByRole("link", { name: "Design System" });
    expect(link).toHaveAttribute("href", "/design-system");
    expect(within(section).getByText(workCards[1].description)).toBeVisible();
  });

  it("links the Experience card to /experience, with no Coming soon badge (resume R2.4)", () => {
    const section = renderSection();

    const link = within(section).getByRole("link", { name: "Experience" });
    expect(link).toHaveAttribute("href", "/experience");
    expect(within(section).getByText(workCards[0].description)).toBeVisible();
    expect(within(section).queryByText("Coming soon")).toBeNull();
  });

  it("stops Tab once per card, in order (R3.5)", async () => {
    const user = userEvent.setup();
    const section = renderSection();

    await user.tab();
    expect(within(section).getByRole("link", { name: "Experience" })).toHaveFocus();
    await user.tab();
    expect(within(section).getByRole("link", { name: "Design System" })).toHaveFocus();
    await user.tab();
    expect(section).not.toContainElement(document.activeElement as HTMLElement);
  });
});
