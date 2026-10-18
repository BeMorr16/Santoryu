import { StrictMode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Meta, Outlet, createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { SiteShell } from "./SiteShell.tsx";

function renderAt(path: string, { strict = false } = {}) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <>
          <Meta />
          <SiteShell>
            <Outlet />
          </SiteShell>
        </>
      ),
      children: [
        {
          index: true,
          Component: () => <h1>Home page</h1>,
          meta: () => [{ title: "Home title" }],
        },
        {
          path: "lab",
          Component: () => <h1>Lab page</h1>,
          meta: () => [{ title: "Lab title" }],
        },
        { path: "lab/tokens", Component: () => <h1>Tokens page</h1> },
        { path: "lab/components", Component: () => <h1>Components page</h1> },
      ],
    },
  ]);
  const stub = <Stub initialEntries={[path]} />;
  return render(strict ? <StrictMode>{stub}</StrictMode> : stub);
}

describe("SiteShell", () => {
  it("renders exactly one of each landmark, with the nav named Primary", () => {
    renderAt("/");

    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
  });

  it("puts the theme switcher in the header (R13.1)", () => {
    renderAt("/");

    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("button", { name: "Theme: Light" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
  });

  it("puts the site name link to / in the header", () => {
    renderAt("/lab");

    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("link", { name: "Ben" })).toHaveAttribute("href", "/");
  });

  it.each([false, true])("does not move focus on initial render (StrictMode: %s)", (strict) => {
    renderAt("/", { strict });

    expect(document.body).toHaveFocus();
  });

  it("focuses the skip link on the first Tab", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.tab();

    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveFocus();
  });

  it("moves focus to main when the skip link is activated", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.tab();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("links Home and Lab in the primary nav", () => {
    renderAt("/");

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "Lab" })).toHaveAttribute("href", "/lab");
  });

  it.each([
    ["/", "Home", "Lab"],
    ["/lab", "Lab", "Home"],
  ])("on %s marks only %s as the current page", (path, current, other) => {
    renderAt(path);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: current })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: other })).not.toHaveAttribute("aria-current");
  });

  it.each(["/lab/tokens", "/lab/components"])(
    "on %s marks no primary nav link as current (R14.5)",
    async (path) => {
      renderAt(path);

      const nav = await screen.findByRole("navigation", { name: "Primary" });
      for (const link of within(nav).getAllByRole("link")) {
        expect(link).not.toHaveAttribute("aria-current");
      }
    },
  );

  it("navigates client-side to Lab, updating content and title, and focuses main", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const main = screen.getByRole("main");
    expect(await screen.findByRole("heading", { level: 1, name: "Home page" })).toBeVisible();

    await user.click(screen.getByRole("link", { name: "Lab" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Lab page" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Home page" })).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toBe(main);
    expect(main).toHaveFocus();
    expect(document.title).toBe("Lab title");
  });

  it("focuses main after keyboard navigation from the nav", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const lab = screen.getByRole("link", { name: "Lab" });

    lab.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("heading", { level: 1, name: "Lab page" })).toBeVisible();
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("leaves focus on the link when activating the current page's link", async () => {
    const user = userEvent.setup();
    renderAt("/lab");
    const lab = await screen.findByRole("link", { name: "Lab" });

    await user.click(lab);

    expect(lab).toHaveFocus();
  });
});
