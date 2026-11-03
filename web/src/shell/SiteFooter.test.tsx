import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { footerContent } from "../content/footer.ts";
import { componentPath } from "../design-system/components/pages.ts";
import { githubUrl, linkedinUrl, resumePdfPath } from "../site.config.ts";
import { navLinks } from "./nav.ts";
import { SiteFooter } from "./SiteFooter.tsx";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <button type="button">Before the footer</button>
      <SiteFooter />
    </MemoryRouter>,
  );
}

const footer = () => screen.getByRole("contentinfo");
const footerNav = () => within(footer()).getByRole("navigation", { name: "Footer" });
const nameLink = () => within(footer()).getByRole("link", { name: "Ben Morrison, home" });
const navLink = (name: string) => within(footerNav()).getByRole("link", { name });
const navLabels = ["Home", ...navLinks.map((link) => link.label), "Résumé (PDF)"];

function expectInOrder(elements: Element[]) {
  elements.slice(1).forEach((later, index) => {
    expect(elements[index]?.compareDocumentPosition(later)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
}

describe("SiteFooter: personal column (site-footer R2)", () => {
  it("is the one contentinfo, showing the name link, role, location, LinkedIn then GitHub (R1.1, R2.1)", () => {
    renderAt("/");

    expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
    const scope = within(footer());
    expectInOrder([
      nameLink(),
      scope.getByText("Full Stack Software Engineer"),
      scope.getByText("Based in Boston, MA · Open to remote, hybrid or on-site"),
      scope.getByRole("link", { name: "LinkedIn" }),
      scope.getByRole("link", { name: "GitHub" }),
      footerNav(),
    ]);
  });

  it("links the name home, named with its visible text first, current only on / (R2.2, R6.2)", () => {
    const { unmount } = renderAt("/");

    expect(nameLink()).toHaveTextContent(/^Ben Morrison$/);
    expect(nameLink()).toHaveAttribute("href", "/");
    expect(nameLink()).toHaveAttribute("aria-current", "page");
    unmount();

    renderAt("/contact");
    expect(nameLink()).not.toHaveAttribute("aria-current");
  });

  it("links LinkedIn and GitHub by name, in the same tab (R2.4)", () => {
    renderAt("/");
    const scope = within(footer());

    const linkedin = scope.getByRole("link", { name: "LinkedIn" });
    const github = scope.getByRole("link", { name: "GitHub" });
    expect(linkedin).toHaveAttribute("href", linkedinUrl);
    expect(github).toHaveAttribute("href", githubUrl);
    expect(linkedin).not.toHaveAttribute("target");
    expect(github).not.toHaveAttribute("target");
  });
});

describe("SiteFooter: navigation (site-footer R3)", () => {
  it("is a nav named Footer with a level-2 Navigation heading, then Home, the bar's pages and Résumé (R3.1, R3.2)", () => {
    renderAt("/");
    const nav = within(footerNav());

    const heading = nav.getByRole("heading", { level: 2, name: "Navigation" });
    const list = nav.getByRole("list");
    expectInOrder([heading, list]);
    expect(
      within(list)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(navLabels);
    expect(navLink("Home")).toHaveAttribute("href", "/");
    for (const link of navLinks) {
      expect(navLink(link.label)).toHaveAttribute("href", link.href);
    }
  });

  it.each<{ path: string; current: Partial<Record<string, "page" | "true">> }>([
    { path: "/", current: { Home: "page" } },
    { path: "/experience", current: { Experience: "page" } },
    { path: "/contact", current: { Contact: "page" } },
    { path: "/design-system", current: { "Design System": "page" } },
    { path: componentPath("button"), current: { "Design System": "true" } },
    { path: "/nope", current: {} },
  ])("marks the current page's link on $path (R3.3)", ({ path, current }) => {
    renderAt(path);

    for (const label of navLabels) {
      const value = current[label];
      if (value === undefined) expect(navLink(label), label).not.toHaveAttribute("aria-current");
      else expect(navLink(label), label).toHaveAttribute("aria-current", value);
    }
  });

  it("downloads the résumé with a full page load, named by its text alone (R3.4)", () => {
    renderAt("/");

    const resume = navLink("Résumé (PDF)");
    expect(resume).toHaveAccessibleName("Résumé (PDF)");
    expect(resume).toHaveAttribute("href", resumePdfPath);
    expect(resume).toHaveAttribute("download");
    expect(resume.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    // Not routed client-side: the browser handles the click, so the file loads rather than the 404.
    expect(fireEvent.click(resume)).toBe(true);
  });
});

describe("SiteFooter: built-with note and keyboard (site-footer R4, R6)", () => {
  it("ends with the built-with note, after the navigation, as plain text (R4.3, R4.4)", () => {
    renderAt("/");

    const builtWith = within(footer()).getByText(footerContent.builtWith);
    expectInOrder([footerNav(), builtWith]);
    expect(builtWith.closest("a")).toBeNull();
    expect(footer().lastElementChild).toBe(builtWith);
  });

  it("tabs through name, LinkedIn, GitHub, then the navigation's links in order (R6.1)", async () => {
    const user = userEvent.setup();
    renderAt("/experience");
    screen.getByRole("button", { name: "Before the footer" }).focus();

    const expected = [
      nameLink(),
      within(footer()).getByRole("link", { name: "LinkedIn" }),
      within(footer()).getByRole("link", { name: "GitHub" }),
      ...navLabels.map(navLink),
    ];
    for (const link of expected) {
      await user.tab();
      expect(link).toHaveFocus();
    }
  });
});
