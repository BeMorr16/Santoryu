import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { Link, MemoryRouter, Outlet, createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../test/axe.ts";
import { linkedinUrl } from "../site.config.ts";
import { contactHref, navLinks } from "./nav.ts";
import { SiteHeader } from "./SiteHeader.tsx";

function renderAt(path: string) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <>
          <SiteHeader />
          <main>
            <Outlet />
          </main>
        </>
      ),
      children: [
        { index: true, Component: () => <Link to="/design-system/tokens">Tokens</Link> },
        { path: "design-system", Component: () => <h1>Design System</h1> },
        { path: "design-system/tokens", Component: () => <h1>Tokens</h1> },
      ],
    },
  ]);
  return render(<Stub initialEntries={[path]} />);
}

const banner = () => screen.getByRole("banner");
const menuButton = () => within(banner()).getByRole("button", { name: "Menu" });

/** The panel the menu button controls. */
function panel(): HTMLElement {
  const element = document.getElementById(menuButton().getAttribute("aria-controls") ?? "");
  if (!element) throw new Error("no panel");
  return element;
}

const isOpen = (element: HTMLElement) => element.matches(":popover-open");

/** jsdom has no popovertarget; the shim's showPopover fires toggle, as a browser does. */
function openPanel(): HTMLElement {
  const element = panel();
  act(() => {
    element.showPopover();
  });
  return element;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SiteHeader: content (site-refresh R6, R7)", () => {
  it("is the banner landmark: BM, Menu, then the panel with the Primary nav and the utilities (R9.1)", () => {
    renderAt("/");
    const header = banner();
    const element = openPanel();

    const sequence = [
      within(header).getByRole("link", { name: "BM, Ben Morrison, home" }),
      menuButton(),
      within(element).getByRole("navigation", { name: "Primary" }),
      within(element).getByRole("button", { name: "Theme: Light" }),
      within(element).getByRole("link", { name: "LinkedIn" }),
      within(element).getByRole("link", { name: "Contact" }),
    ];
    sequence.slice(1).forEach((later, index) => {
      const earlier = sequence[index];
      expect(earlier?.compareDocumentPosition(later)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(header.contains(element)).toBe(true);
    expect(within(header).getAllByRole("navigation")).toHaveLength(1);
  });

  it("follows the visual order with Tab while the panel is open (R9.2)", async () => {
    const user = userEvent.setup();
    renderAt("/");
    openPanel();

    const order = [
      screen.getByRole("link", { name: "BM, Ben Morrison, home" }),
      menuButton(),
      screen.getByRole("link", { name: "Design System" }),
      screen.getByRole("button", { name: "Theme: Light" }),
      screen.getByRole("link", { name: "LinkedIn" }),
      screen.getByRole("link", { name: "Contact" }),
    ];
    for (const element of order) {
      await user.tab();
      expect(element).toHaveFocus();
    }
  });

  it.each([
    ["/", "page"],
    ["/design-system", null],
  ])("links BM home, named after its text, current only on / (on %s: %s)", (path, current) => {
    renderAt(path);

    const home = within(banner()).getByRole("link", { name: "BM, Ben Morrison, home" });
    expect(home).toHaveTextContent(/^BM$/);
    expect(home).toHaveAttribute("href", "/");
    if (current) expect(home).toHaveAttribute("aria-current", current);
    else expect(home).not.toHaveAttribute("aria-current");
  });

  it("lists navLinks in the Primary nav, and no Home link (R6.5, R7.2)", () => {
    renderAt("/");
    const nav = within(openPanel()).getByRole("navigation", { name: "Primary" });

    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual(navLinks.map(({ label, href }) => [label, href]));
    expect(within(banner()).queryByRole("link", { name: "Home" })).toBeNull();
  });

  it.each([
    ["/", null],
    ["/design-system", "page"],
    ["/design-system/tokens", "true"],
  ])("marks Design System current on %s as %s (ds-components R1.6)", (path, current) => {
    renderAt(path);

    const link = within(openPanel()).getByRole("link", { name: "Design System" });
    if (current) expect(link).toHaveAttribute("aria-current", current);
    else expect(link).not.toHaveAttribute("aria-current");
  });

  it("links LinkedIn in the same tab (R7.3, as amended in the owner's review)", () => {
    renderAt("/");

    const linkedin = within(openPanel()).getByRole("link", { name: "LinkedIn" });
    expect(linkedin).toHaveAttribute("href", linkedinUrl);
    expect(linkedin).not.toHaveAttribute("target");
  });

  it("links Contact to contactHref, never marked current, even on / (R7.4)", () => {
    renderAt("/");

    const contact = within(openPanel()).getByRole("link", { name: "Contact" });
    expect(contact).toHaveAttribute("href", contactHref);
    expect(contact).not.toHaveAttribute("aria-current");
  });

  it("holds the theme switcher, icon-only (R6.1)", () => {
    renderAt("/");

    expect(within(openPanel()).getByRole("button", { name: "Theme: Light" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
  });
});

describe("SiteHeader: the menu button and panel (site-refresh R8)", () => {
  it("is a disclosure button named Menu that targets the panel, closed at first (R8.2)", () => {
    renderAt("/");

    const button = menuButton();
    const element = panel();
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("popovertarget", element.id);
    expect(button).not.toHaveAttribute("aria-haspopup");
    expect(element).toHaveAttribute("popover", "auto");
    expect(isOpen(element)).toBe(false);
  });

  it("mirrors the panel's toggle in aria-expanded", () => {
    renderAt("/");
    const element = openPanel();

    expect(menuButton()).toHaveAttribute("aria-expanded", "true");

    act(() => {
      element.hidePopover();
    });
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when a link in it is followed, the current page's included (R8.3)", async () => {
    const user = userEvent.setup();
    renderAt("/design-system");
    const element = openPanel();

    await user.click(within(element).getByRole("link", { name: "Design System" }));

    expect(isOpen(element)).toBe(false);
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when focus leaves it and its button, and stays open while focus is on either (R8.3)", () => {
    renderAt("/");
    const element = openPanel();
    const contact = within(element).getByRole("link", { name: "Contact" });

    act(() => {
      contact.focus();
      menuButton().focus();
    });
    expect(isOpen(element)).toBe(true);

    act(() => {
      contact.focus();
      within(element).getByRole("link", { name: "Design System" }).focus();
    });
    expect(isOpen(element)).toBe(true);

    act(() => {
      screen.getByRole("link", { name: "BM, Ben Morrison, home" }).focus();
    });
    expect(isOpen(element)).toBe(false);
  });

  it("closes when the page changes from elsewhere", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const element = openPanel();

    await user.click(within(screen.getByRole("main")).getByRole("link", { name: "Tokens" }));

    expect(await screen.findByRole("heading", { name: "Tokens" })).toBeInTheDocument();
    expect(isOpen(element)).toBe(false);
  });

  it("closes when the viewport crosses size.breakpoint.md (R8.4)", () => {
    let onChange: (() => void) | undefined;
    const matchMedia = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((query) =>
      query === "(min-width: 48em)"
        ? ({
            matches: false,
            media: query,
            addEventListener: (_type: string, listener: () => void) => {
              onChange = listener;
            },
            removeEventListener: () => undefined,
          } as unknown as MediaQueryList)
        : matchMedia(query),
    );
    renderAt("/");
    const element = openPanel();

    act(() => {
      onChange?.();
    });

    expect(isOpen(element)).toBe(false);
  });
});

describe("SiteHeader: accessibility and hydration", () => {
  it("has no axe violations, closed and open", async () => {
    const { container } = renderAt("/design-system");
    await expectNoAxeViolations(container);

    openPanel();
    await expectNoAxeViolations(container);
  });

  // As in ThemeSwitcher's test: after hydration, the icon-only buttons' name tooltips set their
  // anchor-name (an effect), so the HTML rightly differs from the prerender's.
  it("hydrates with no mismatch (R8.5)", () => {
    const ui = (
      <MemoryRouter initialEntries={["/design-system"]}>
        <SiteHeader />
      </MemoryRouter>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(ui);
    document.body.append(container);
    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(ui, { container, hydrate: true, onRecoverableError });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  });
});
