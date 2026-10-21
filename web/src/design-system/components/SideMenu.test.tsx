import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import linkStyles from "../../components/Link/Link.module.css";
import { componentGroups, componentPages, componentPath } from "./pages.ts";
import { ComponentsSideMenu } from "./SideMenu.tsx";
import styles from "./SideMenu.module.css";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ComponentsSideMenu />
    </MemoryRouter>,
  );
}

const nav = () => screen.getByRole("navigation", { name: "Components" });
const toggle = () => within(nav()).getByRole("button", { name: /^Components/ });

describe("ComponentsSideMenu (ds-components R2)", () => {
  it('is a navigation landmark named "Components"', () => {
    renderAt("/design-system/components");

    expect(nav()).toBeInTheDocument();
  });

  it("links Overview first, then one list per group, labelled by its visible name, in order (R2.2)", () => {
    renderAt("/design-system/components");

    const links = within(nav()).getAllByRole("link");
    expect(links[0]).toHaveTextContent("Overview");
    expect(links[0]).toHaveAttribute("href", "/design-system/components");
    const lists = within(nav()).getAllByRole("list");
    expect(lists).toHaveLength(componentGroups.length);
    componentGroups.forEach((group, index) => {
      const list = within(nav()).getByRole("list", { name: group });
      expect(list).toBe(lists[index]);
      expect(screen.getByText(group, { selector: "p" })).toBeVisible();
      expect(
        within(list)
          .getAllByRole("link")
          .map((link) => [link.textContent, link.getAttribute("href")]),
      ).toEqual(
        componentPages
          .filter((page) => page.group === group)
          .map((page) => [page.name, componentPath(page.id)]),
      );
    });
  });

  it("marks only the current page's link, with Link's current look (R2.3)", () => {
    renderAt("/design-system/components/menu");

    const current = within(nav()).getByRole("link", { name: "Menu" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveClass(linkStyles.link ?? "");
    const marked = within(nav())
      .getAllByRole("link")
      .filter((link) => link.hasAttribute("aria-current"));
    expect(marked).toEqual([current]);
  });

  it("marks Overview on the overview page only (R2.3)", () => {
    renderAt("/design-system/components");

    expect(within(nav()).getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("has a collapsed disclosure button controlling the lists (R2.5)", () => {
    renderAt("/design-system/components");

    expect(toggle()).toHaveTextContent("Components");
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    const lists = document.getElementById(toggle().getAttribute("aria-controls") ?? "");
    expect(lists).toContainElement(within(nav()).getByRole("link", { name: "Overview" }));
    expect(lists).not.toHaveAttribute("data-open");
    expect(lists).toHaveClass(styles.lists ?? "");
    expect(toggle()).toHaveClass(styles.toggle ?? "");
  });

  it.each([
    ["a click", async (user: ReturnType<typeof userEvent.setup>) => user.click(toggle())],
    [
      "Enter",
      async (user: ReturnType<typeof userEvent.setup>) => {
        toggle().focus();
        await user.keyboard("{Enter}");
      },
    ],
    [
      "Space",
      async (user: ReturnType<typeof userEvent.setup>) => {
        toggle().focus();
        await user.keyboard(" ");
      },
    ],
  ])("opens and closes with %s (R2.5)", async (_how, activate) => {
    const user = userEvent.setup();
    renderAt("/design-system/components");
    const lists = () => document.getElementById(toggle().getAttribute("aria-controls") ?? "");

    await activate(user);
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(lists()).toHaveAttribute("data-open");

    await activate(user);
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(lists()).not.toHaveAttribute("data-open");
  });

  it("starts collapsed again when remounted, as the shell does on navigation (R2.5)", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MemoryRouter initialEntries={["/design-system/components"]}>
        <ComponentsSideMenu key="/design-system/components" />
      </MemoryRouter>,
    );
    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "true");

    rerender(
      <MemoryRouter initialEntries={["/design-system/components"]}>
        <ComponentsSideMenu key="/design-system/components/button" />
      </MemoryRouter>,
    );

    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it.each([false, true])("has no axe violations (open: %s)", async (open) => {
    const user = userEvent.setup();
    const { container } = renderAt("/design-system/components/button");
    if (open) await user.click(toggle());

    await expectNoAxeViolations(container);
  });
});
