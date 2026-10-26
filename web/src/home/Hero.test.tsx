import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Icon } from "../components/Icon/Icon.tsx";
import buttonStyles from "../components/shared/button-styles.module.css";
import typographyStyles from "../components/Typography/Typography.module.css";
import { homeContent } from "../content/home.ts";
import { linkedinUrl } from "../site.config.ts";
import { Hero } from "./Hero.tsx";

const iconMarkup = (name: "linkedin" | "arrow-right") =>
  render(<Icon name={name} />).container.querySelector("svg")?.innerHTML;

function renderHero(Component = Hero) {
  render(
    <MemoryRouter>
      <Component />
    </MemoryRouter>,
  );
}

describe("Hero (home R2)", () => {
  afterEach(() => {
    vi.doUnmock("../shell/nav.ts");
  });

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

  it("links LinkedIn in the same tab, named by its text, with its icon (R2.3)", () => {
    renderHero();

    const linkedin = screen.getByRole("link", { name: homeContent.linkedinLabel });
    expect(linkedin).toHaveAccessibleName("LinkedIn");
    expect(linkedin).toHaveAttribute("href", linkedinUrl);
    expect(linkedin).not.toHaveAttribute("target");
    expect(linkedin).toHaveClass(buttonStyles.button ?? "", buttonStyles.secondary ?? "");
    expect(linkedin.firstElementChild?.innerHTML).toBe(iconMarkup("linkedin"));
  });

  it("has no contact link while contactHref is / (R2.5)", () => {
    renderHero();

    expect(screen.queryByRole("link", { name: homeContent.contactLabel })).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("puts a primary contact link first, with an arrow, once contactHref isn't / (R2.4)", async () => {
    vi.resetModules();
    vi.doMock("../shell/nav.ts", () => ({ contactHref: "/about#contact" }));
    const { Hero: Fresh } = await import("./Hero.tsx");
    const freshButtonStyles = (await import("../components/shared/button-styles.module.css"))
      .default;
    renderHero(Fresh);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      homeContent.contactLabel,
      homeContent.linkedinLabel,
    ]);
    const [contact, linkedin] = links;
    expect(contact).toHaveAttribute("href", "/about#contact");
    expect(contact).toHaveClass(freshButtonStyles.primary ?? "");
    expect(contact?.lastElementChild?.innerHTML).toBe(iconMarkup("arrow-right"));
    expect(linkedin).toHaveClass(freshButtonStyles.secondary ?? "");
    expect(linkedin).not.toHaveClass(freshButtonStyles.primary ?? "");
  });
});
