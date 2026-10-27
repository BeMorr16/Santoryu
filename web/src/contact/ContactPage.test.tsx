import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../test/axe.ts";
import { expectHydratesCleanly } from "../../test/component.tsx";
import { Icon } from "../components/Icon/Icon.tsx";
import buttonStyles from "../components/shared/button-styles.module.css";
import typographyStyles from "../components/Typography/Typography.module.css";
import { contactContent } from "../content/contact.ts";
import { githubUrl, linkedinUrl } from "../site.config.ts";
import { ContactPage } from "./ContactPage.tsx";

const iconMarkup = (name: "linkedin" | "github") =>
  render(<Icon name={name} />).container.querySelector("svg")?.innerHTML;

const page = (
  <MemoryRouter>
    <ContactPage />
  </MemoryRouter>
);

function renderPage() {
  return render(page).container;
}

describe("ContactPage (contact R2)", () => {
  it("shows the h1, then the location, then the invitation, then the links, and nothing after (R2.1)", () => {
    const container = renderPage();

    const [column, ...rest] = [...container.children];
    expect(rest).toEqual([]);
    const [h1, location, invitation, links, ...after] = [...(column?.children ?? [])];
    expect(h1).toBe(screen.getByRole("heading", { level: 1, name: contactContent.heading }));
    expect(h1).toHaveClass(typographyStyles.display ?? "");
    expect(location).toHaveTextContent(contactContent.location);
    expect(location?.tagName).toBe("P");
    expect(invitation).toHaveTextContent(contactContent.invitation);
    expect(invitation).toHaveClass(
      typographyStyles.lead ?? "",
      typographyStyles["tone-muted"] ?? "",
    );
    expect([...(links?.children ?? [])]).toEqual(screen.getAllByRole("link"));
    expect(after).toEqual([]);
  });

  it("has exactly one heading, the h1 (R2.2)", () => {
    renderPage();

    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it.each([
    { label: contactContent.linkedinLabel, href: linkedinUrl, icon: "linkedin" as const },
    { label: contactContent.githubLabel, href: githubUrl, icon: "github" as const },
  ])(
    "links $label as a secondary button in the same tab, named by its label (R2.3–R2.5, R5.4)",
    ({ label, href, icon }) => {
      renderPage();

      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveAccessibleName(label);
      expect(link).toHaveAttribute("href", href);
      expect(link).not.toHaveAttribute("target");
      expect(link).toHaveClass(buttonStyles.button ?? "", buttonStyles.secondary ?? "");
      const svg = link.firstElementChild;
      expect(svg?.innerHTML).toBe(iconMarkup(icon));
      expect(svg).toHaveAttribute("aria-hidden", "true");
    },
  );

  it("has no mailto: link (R2.7)", () => {
    const container = renderPage();

    expect(container.innerHTML).not.toContain("mailto:");
  });

  it("tabs LinkedIn, then GitHub (R5.3)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.tab();
    expect(screen.getByRole("link", { name: contactContent.linkedinLabel })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: contactContent.githubLabel })).toHaveFocus();
  });

  it("has no axe violations", async () => {
    await expectNoAxeViolations(renderPage());
  });

  it("hydrates cleanly", () => {
    expectHydratesCleanly(page);
  });
});
