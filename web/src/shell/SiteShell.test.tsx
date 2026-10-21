import { StrictMode, useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, Meta, Outlet, createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { resize } from "../../test/resize-observer.ts";
import stackStyles from "../components/Stack/Stack.module.css";
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
            </>
          ),
          meta: () => [{ title: "Home title" }],
        },
        {
          path: "design-system",
          Component: () => <h1>Design System page</h1>,
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
    renderAt("/design-system");

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

  it("links Home and Design System in the primary nav (R1.6)", () => {
    renderAt("/");

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "Design System" })).toHaveAttribute(
      "href",
      "/design-system",
    );
  });

  it.each([
    ["/", "Home", "Design System"],
    ["/design-system", "Design System", "Home"],
  ])("on %s marks only %s as the current page", (path, current, other) => {
    renderAt(path);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: current })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: other })).not.toHaveAttribute("aria-current");
  });

  it.each(["/design-system/tokens", "/design-system/components"])(
    "on %s marks Design System as current with aria-current=true, and not Home (R1.6)",
    async (path) => {
      renderAt(path);

      const nav = await screen.findByRole("navigation", { name: "Primary" });
      expect(within(nav).getByRole("link", { name: "Design System" })).toHaveAttribute(
        "aria-current",
        "true",
      );
      expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
    },
  );

  it("navigates client-side to Design System, updating content and title, and focuses its h1 (refinement R11.1)", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const main = screen.getByRole("main");
    expect(await screen.findByRole("heading", { level: 1, name: "Home page" })).toBeVisible();

    await user.click(screen.getByRole("link", { name: "Design System" }));

    const heading = await screen.findByRole("heading", { level: 1, name: "Design System page" });
    expect(heading).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Home page" })).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toBe(main);
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(document.title).toBe("Design System title");
  });

  it("focuses the new page's h1 after keyboard navigation from the nav (refinement R11.1)", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const designSystem = screen.getByRole("link", { name: "Design System" });

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
    const designSystem = await screen.findByRole("link", { name: "Design System" });

    await user.click(designSystem);

    expect(designSystem).toHaveFocus();
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
});
