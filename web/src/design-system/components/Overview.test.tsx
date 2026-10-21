import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { Overview, stylingCode, usageCode } from "./Overview.tsx";
import { componentPages } from "./pages.ts";

function renderOverview() {
  return render(
    <MemoryRouter initialEntries={["/design-system/components"]}>
      <main>
        <Overview />
      </main>
    </MemoryRouter>,
  );
}

const section = (name: string) => {
  const heading = screen.getByRole("heading", { level: 2, name });
  const element = heading.parentElement;
  if (!element) throw new Error(`no ${name} section`);
  return element;
};

describe("Overview (ds-components R3)", () => {
  it("has an h1 of Components and a lead stating the number of components (R3.1)", () => {
    renderOverview();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Components");
    expect(
      screen.getByText(`A library of ${String(componentPages.length)} React components`, {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(componentPages).toHaveLength(18);
  });

  it("lists its h2 sections in On this page, linking their ids (R3.1)", () => {
    renderOverview();

    const toc = screen.getByRole("list", { name: "On this page" });
    const links = within(toc).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Principles",
      "Usage",
      "How it's tested",
      "Source",
    ]);
    for (const link of links) {
      const heading = document.getElementById(link.getAttribute("href")?.slice(1) ?? "");
      expect(heading?.tagName).toBe("H2");
      expect(heading).toHaveTextContent(link.textContent);
    }
  });

  it("states the five principles (R3.2)", () => {
    renderOverview();

    const items = within(section("Principles")).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items.map((item) => item.textContent).join(" ")).toMatch(
      /design token.+WCAG\) 2\.2 AA.+automatic by default.+overridden.+Native props go through to the root element.+own tokens/,
    );
  });

  it("shows how to import a component, through the main examples' alias, and how to restyle it (R3.3)", () => {
    renderOverview();

    const usage = section("Usage");
    const blocks = [...usage.querySelectorAll("pre code")].map((code) => code.textContent);
    expect(blocks).toEqual([usageCode, stylingCode]);
    const specifier = /from "([^"]+)"/.exec(usageCode)?.[1];
    expect(specifier).toMatch(/^@\/components\/[A-Za-z]+$/);
    expect(stylingCode).toMatch(/--component-button-[\w-]+: var\(--[\w-]+\);/);
  });

  it("lists the five kinds of tests (R3.4)", () => {
    renderOverview();

    const items = within(section("How it's tested")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent).join(" ")).toMatch(
      /keyboard.+accessible names.+axe.+unit tests and in the browser.+Chromium and WebKit.+type checker.+registry test/,
    );
    expect(items).toHaveLength(5);
  });

  it("links the library's source folder on GitHub (R3.5)", () => {
    renderOverview();

    expect(
      within(section("Source")).getByRole("link", { name: "library's source on GitHub" }),
    ).toHaveAttribute("href", "https://github.com/BeMorr16/Santoryu/tree/main/web/src/components");
  });

  it('ends with "Next: Button" and no previous link (R4.9)', () => {
    renderOverview();

    const prevNext = screen.getByRole("list", { name: "Previous and next" });
    expect(within(prevNext).getAllByRole("link")).toHaveLength(1);
    expect(within(prevNext).getByRole("link", { name: "Next: Button" })).toHaveAttribute(
      "href",
      "/design-system/components/button",
    );
  });

  it("has no skipped heading levels and no axe violations", async () => {
    const { container } = renderOverview();

    const levels = [...container.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) =>
      Number(h.tagName.slice(1)),
    );
    levels.forEach((level, index) => {
      expect(level).toBeLessThanOrEqual((levels[index - 1] ?? 0) + 1);
    });
    await expectNoAxeViolations(container);
  });
});
