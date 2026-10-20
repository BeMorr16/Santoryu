import { StrictMode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, Meta, Outlet, createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { resize } from "../../test/resize-observer.ts";
import stackStyles from "../components/Stack/Stack.module.css";
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
          Component: () => (
            <>
              <h1>Home page</h1>
              <Link to="/plain">Plain page</Link>
            </>
          ),
          meta: () => [{ title: "Home title" }],
        },
        {
          path: "lab",
          Component: () => <h1>Lab page</h1>,
          meta: () => [{ title: "Lab title" }],
        },
        { path: "lab/tokens", Component: () => <h1>Tokens page</h1> },
        { path: "lab/components", Component: () => <h1>Components page</h1> },
        { path: "plain", Component: () => <p>No heading here</p> },
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

  it("never marks the site name as current, while Home marks the home page (refinement R11.8)", () => {
    renderAt("/");

    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("link", { name: "Ben" })).toHaveAttribute(
      "aria-current",
      "false",
    );
    expect(within(banner).getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("lays out the header and the nav list as horizontal Stacks (refinement R11.8)", () => {
    renderAt("/");

    const horizontal = [
      stackStyles.stack ?? "",
      stackStyles.horizontal ?? "",
      stackStyles.wrap ?? "",
    ];
    expect(screen.getByRole("banner")).toHaveClass(...horizontal);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("list")).toHaveClass(...horizontal);
    expect(screen.getByRole("main")).toHaveClass(
      stackStyles.stack ?? "",
      stackStyles.vertical ?? "",
    );
  });

  it("sets the measured header height on the root, and removes it on unmount (refinement R11.3)", () => {
    const { unmount } = renderAt("/");
    const root = document.documentElement;

    resize(screen.getByRole("banner"), 120);
    expect(root.style.getPropertyValue("--shell-header-block-size")).toBe("120px");

    unmount();
    expect(root.style.getPropertyValue("--shell-header-block-size")).toBe("");
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

  it("navigates client-side to Lab, updating content and title, and focuses its h1 (refinement R11.1)", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const main = screen.getByRole("main");
    expect(await screen.findByRole("heading", { level: 1, name: "Home page" })).toBeVisible();

    await user.click(screen.getByRole("link", { name: "Lab" }));

    const heading = await screen.findByRole("heading", { level: 1, name: "Lab page" });
    expect(heading).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Home page" })).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toBe(main);
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(document.title).toBe("Lab title");
  });

  it("focuses the new page's h1 after keyboard navigation from the nav (refinement R11.1)", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const lab = screen.getByRole("link", { name: "Lab" });

    lab.focus();
    await user.keyboard("{Enter}");

    const heading = await screen.findByRole("heading", { level: 1, name: "Lab page" });
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute("tabindex", "-1");
  });

  it("focuses main when the new page has no h1 (refinement R11.1)", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.click(await screen.findByRole("link", { name: "Plain page" }));

    expect(await screen.findByText("No heading here")).toBeVisible();
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
