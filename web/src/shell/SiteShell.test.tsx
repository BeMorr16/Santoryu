import { StrictMode, useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, Meta, Outlet, createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { resize } from "../../test/resize-observer.ts";
import stackStyles from "../components/Stack/Stack.module.css";
import backdropStyles from "./backdrop/Backdrop.module.css";
import { SiteShell } from "./SiteShell.tsx";

/** A stateful aside, so a test can tell a remount (state reset) from a re-render. */
function TestAside() {
  const [open, setOpen] = useState(false);
  return (
    <nav aria-label="Aside">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
      >
        Toggle
      </button>
      <Link to="/with-aside/other">Other page</Link>
    </nav>
  );
}

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
              <Link to="/design-system">Go to Design System</Link>
            </>
          ),
          meta: () => [{ title: "Home title" }],
        },
        {
          path: "design-system",
          Component: () => (
            <>
              <h1>Design System page</h1>
              <Link to="/design-system">This page</Link>
            </>
          ),
          meta: () => [{ title: "Design System title" }],
        },
        { path: "design-system/tokens", Component: () => <h1>Tokens page</h1> },
        { path: "design-system/components", Component: () => <h1>Components page</h1> },
        { path: "plain", Component: () => <p>No heading here</p> },
        {
          path: "with-aside",
          handle: { Aside: TestAside },
          Component: () => <h1>Aside page</h1>,
        },
        {
          path: "no-back-to-top",
          handle: { backToTop: false },
          Component: () => <h1>No Back to top</h1>,
        },
        {
          path: "with-aside/other",
          handle: { Aside: TestAside },
          Component: () => <h1>Other aside page</h1>,
        },
        {
          path: "striking",
          handle: { backdrop: "striking" },
          Component: () => (
            <>
              <h1>Striking page</h1>
              <Link to="/design-system">Go to Design System</Link>
            </>
          ),
        },
      ],
    },
  ]);
  const stub = <Stub initialEntries={[path]} />;
  return render(strict ? <StrictMode>{stub}</StrictMode> : stub);
}

describe("SiteShell", () => {
  it("renders exactly one of each landmark, with the site header as the banner", () => {
    renderAt("/");

    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(
      within(screen.getByRole("banner")).getByRole("link", { name: "BM, Ben Morrison, home" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
  });

  it("lays out main as a vertical Stack", () => {
    renderAt("/");

    expect(screen.getByRole("main")).toHaveClass(
      stackStyles.stack ?? "",
      stackStyles.vertical ?? "",
    );
  });

  it("sets the space the bar takes, its measured height plus its top inset, on the root, and removes it on unmount (refinement R11.3, site-refresh design §4.6)", () => {
    const { unmount } = renderAt("/");
    const root = document.documentElement;

    // jsdom loads no CSS modules, so the bar's top margin (its inset) is set here.
    const banner = screen.getByRole("banner");
    banner.style.marginTop = "8px";
    resize(banner, 120);
    expect(root.style.getPropertyValue("--shell-header-block-size")).toBe("128px");

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

  it("navigates client-side to Design System, updating content and title, and focuses its h1 (refinement R11.1)", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const main = screen.getByRole("main");
    expect(await screen.findByRole("heading", { level: 1, name: "Home page" })).toBeVisible();

    await user.click(screen.getByRole("link", { name: "Go to Design System" }));

    const heading = await screen.findByRole("heading", { level: 1, name: "Design System page" });
    expect(heading).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Home page" })).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toBe(main);
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(document.title).toBe("Design System title");
  });

  it("focuses the new page's h1 after keyboard navigation from a link (refinement R11.1)", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const designSystem = screen.getByRole("link", { name: "Go to Design System" });

    designSystem.focus();
    await user.keyboard("{Enter}");

    const heading = await screen.findByRole("heading", { level: 1, name: "Design System page" });
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
    renderAt("/design-system");
    const thisPage = await screen.findByRole("link", { name: "This page" });

    await user.click(thisPage);

    expect(thisPage).toHaveFocus();
  });

  it("renders no aside when the route's handle has none", () => {
    renderAt("/");

    expect(screen.queryByRole("navigation", { name: "Aside" })).not.toBeInTheDocument();
  });

  it("renders the route handle's aside outside main and before it (ds-components R2.1)", async () => {
    renderAt("/with-aside");

    const aside = await screen.findByRole("navigation", { name: "Aside" });
    const main = screen.getByRole("main");
    expect(main).not.toContainElement(aside);
    expect(aside.compareDocumentPosition(main)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByRole("banner").compareDocumentPosition(aside)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("remounts the aside after a navigation, resetting its state (ds-components R2.5)", async () => {
    const user = userEvent.setup();
    renderAt("/with-aside");
    const toggle = await screen.findByRole("button", { name: "Toggle" });

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("link", { name: "Other page" }));

    expect(await screen.findByRole("heading", { name: "Other aside page" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Toggle" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("renders one Back to top button after the footer by default (ds-components R5.2)", async () => {
    renderAt("/");

    const backToTop = await screen.findByRole("button", { name: "Back to top", hidden: true });
    expect(screen.getAllByRole("button", { name: "Back to top", hidden: true })).toHaveLength(1);
    expect(screen.getByRole("contentinfo").compareDocumentPosition(backToTop)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("leaves Back to top out on a route whose handle turns it off (ds-components R5.8)", async () => {
    renderAt("/no-back-to-top");

    expect(await screen.findByRole("heading", { name: "No Back to top" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to top", hidden: true })).toBeNull();
  });

  it("renders the quiet backdrop by default (site-backdrop R1.1)", () => {
    const { container } = renderAt("/");

    expect(container.getElementsByClassName(backdropStyles.quiet ?? "")).toHaveLength(1);
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("renders the striking backdrop for a route whose handle asks for it (site-backdrop R1.1)", async () => {
    const { container } = renderAt("/striking");

    expect(await screen.findByRole("heading", { name: "Striking page" })).toBeInTheDocument();
    expect(container.querySelectorAll("canvas")).toHaveLength(1);
    expect(container.getElementsByClassName(backdropStyles.quiet ?? "")).toHaveLength(0);
  });

  it("offers the sphere's pause toggle on striking pages only (site-backdrop R6.7)", async () => {
    const user = userEvent.setup();
    renderAt("/striking");
    await screen.findByRole("heading", { name: "Striking page" });
    const pause = () =>
      within(screen.getByRole("banner")).queryByRole("button", {
        name: "Pause background animation",
        hidden: true,
      });
    expect(pause()).not.toBeNull();

    await user.click(screen.getByRole("link", { name: "Go to Design System" }));

    expect(await screen.findByRole("heading", { name: "Design System page" })).toBeInTheDocument();
    expect(pause()).toBeNull();
  });

  it("swaps the sphere for the frame glow on navigating to a quiet page (site-backdrop R1.4)", async () => {
    const user = userEvent.setup();
    const { container } = renderAt("/striking");
    await screen.findByRole("heading", { name: "Striking page" });

    await user.click(screen.getByRole("link", { name: "Go to Design System" }));

    expect(await screen.findByRole("heading", { name: "Design System page" })).toBeInTheDocument();
    expect(container.querySelector("canvas")).toBeNull();
    expect(container.getElementsByClassName(backdropStyles.quiet ?? "")).toHaveLength(1);
  });
});
