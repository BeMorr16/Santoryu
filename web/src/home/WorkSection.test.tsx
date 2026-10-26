import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { homeContent, workCards } from "../content/home.ts";
import { WorkSection } from "./WorkSection.tsx";

const focusable = "a[href], button, input, select, textarea, [tabindex]";

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
    expect(within(section).getByText(workCards[0].description)).toBeVisible();
  });

  it("shows the Experience placeholder with a Coming soon badge, no link and nothing focusable (R3.4)", () => {
    const section = renderSection();

    const heading = within(section).getByRole("heading", { level: 3, name: "Experience" });
    const card = heading.closest("li");
    if (!card) throw new Error("the placeholder is not a list item");
    expect(within(card).getByText(homeContent.placeholderBadge)).toBeVisible();
    expect(within(card).getByText(workCards[1].description)).toBeVisible();
    expect(within(card).queryByRole("link")).toBeNull();
    expect(card.querySelectorAll(focusable)).toHaveLength(0);
  });

  it("stops Tab once, on the Design System card (R3.5)", async () => {
    const user = userEvent.setup();
    const section = renderSection();

    await user.tab();
    expect(within(section).getByRole("link", { name: "Design System" })).toHaveFocus();
    await user.tab();
    expect(section).not.toContainElement(document.activeElement as HTMLElement);
  });
});
