import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { Icon } from "../components/Icon/Icon.tsx";
import buttonStyles from "../components/shared/button-styles.module.css";
import typographyStyles from "../components/Typography/Typography.module.css";
import { homeContent } from "../content/home.ts";
import { Hero } from "./Hero.tsx";

const iconMarkup = (name: "arrow-right") =>
  render(<Icon name={name} />).container.querySelector("svg")?.innerHTML;

function renderHero() {
  render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  );
}

describe("Hero (home R2)", () => {
  it("shows the name as the h1, then the role as a paragraph (R2.1)", () => {
    renderHero();

    const h1 = screen.getByRole("heading", { level: 1, name: homeContent.name });
    expect(h1).toHaveClass(typographyStyles.display ?? "");
    const role = screen.getByText(homeContent.role);
    expect(role.tagName).toBe("P");
    expect(h1.nextElementSibling).toBe(role);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it("shows the intro after the role as a muted lead (R2.2)", () => {
    renderHero();

    const intro = screen.getByText(homeContent.intro);
    expect(screen.getByText(homeContent.role).nextElementSibling).toBe(intro);
    expect(intro).toHaveClass(typographyStyles.lead ?? "", typographyStyles["tone-muted"] ?? "");
  });

  it("lists the focus areas after the intro, as muted lead items", () => {
    renderHero();

    const list = screen.getByRole("list");
    expect(screen.getByText(homeContent.intro).nextElementSibling).toBe(list);
    const items = within(list).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([...homeContent.focusAreas]);
    for (const item of items) {
      expect(item).toHaveClass(typographyStyles.lead ?? "", typographyStyles["tone-muted"] ?? "");
    }
  });

  it("has one call to action: a primary link to /contact, with an arrow (R2.4; contact R4.1)", () => {
    renderHero();

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([homeContent.contactLabel]);
    const [contact] = links;
    expect(contact).toHaveAccessibleName(homeContent.contactLabel);
    expect(contact).toHaveAttribute("href", "/contact");
    expect(contact).toHaveClass(buttonStyles.button ?? "", buttonStyles.primary ?? "");
    expect(contact?.lastElementChild?.innerHTML).toBe(iconMarkup("arrow-right"));
  });
});
