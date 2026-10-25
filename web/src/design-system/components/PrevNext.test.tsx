import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { componentPages, componentPath, componentsPath } from "./pages.ts";
import { PrevNext } from "./PrevNext.tsx";

function renderAt(current: string) {
  return render(
    <MemoryRouter initialEntries={[current]}>
      <PrevNext current={current} />
    </MemoryRouter>,
  );
}

const list = () => screen.getByRole("list", { name: "Previous and next" });

describe("PrevNext (ds-components R4.9)", () => {
  it('is a list labelled "Previous and next", not a landmark', () => {
    renderAt(componentPath("link"));

    expect(list()).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("restates the list role, which Safari drops from unmarked lists", () => {
    renderAt(componentPath("link"));

    expect(list()).toHaveAttribute("role", "list");
  });

  it("links the pages before and after, named for which is which", () => {
    renderAt(componentPath("link"));

    const links = within(list()).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toHaveLength(2);
    expect(within(list()).getByRole("link", { name: "Previous: Button" })).toHaveAttribute(
      "href",
      componentPath("button"),
    );
    expect(within(list()).getByRole("link", { name: "Next: Menu" })).toHaveAttribute(
      "href",
      componentPath("menu"),
    );
  });

  it("keeps the visible words apart in the text, so the name contains the visible label", () => {
    renderAt(componentPath("link"));

    expect(
      within(list())
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Previous Button", "Next Menu"]);
  });

  it("goes from the overview to the first component, with no previous link", () => {
    renderAt(componentsPath);

    expect(within(list()).getAllByRole("link")).toHaveLength(1);
    expect(within(list()).getByRole("link", { name: "Next: Button" })).toHaveAttribute(
      "href",
      componentPath("button"),
    );
  });

  it("goes back to the overview from the first component", () => {
    renderAt(componentPath("button"));

    expect(within(list()).getByRole("link", { name: "Previous: Overview" })).toHaveAttribute(
      "href",
      componentsPath,
    );
  });

  it("has no next link on the last component", () => {
    const last = componentPages.at(-1);
    const before = componentPages.at(-2);
    if (!last || !before) throw new Error("no pages");
    renderAt(componentPath(last.id));

    expect(within(list()).getAllByRole("link")).toHaveLength(1);
    expect(
      within(list()).getByRole("link", { name: `Previous: ${before.name}` }),
    ).toBeInTheDocument();
  });

  it("shows decorative arrows", () => {
    renderAt(componentPath("link"));

    for (const svg of list().querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
    expect(list().querySelectorAll("svg")).toHaveLength(2);
  });

  it("has no axe violations", async () => {
    const { container } = renderAt(componentPath("link"));

    await expectNoAxeViolations(container);
  });
});
