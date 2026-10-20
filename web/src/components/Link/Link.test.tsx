import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode } from "react";
import { createRoutesStub, MemoryRouter, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import { Icon } from "../Icon/Icon.tsx";
import buttonStyles from "../shared/button-styles.module.css";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx";
import { Link } from "./Link.tsx";
import styles from "./Link.module.css";

const css = readFileSync(join(import.meta.dirname, "Link.module.css"), "utf8");

function renderInRouter(ui: ReactNode) {
  const Stub = createRoutesStub([
    { path: "/", Component: () => <main>{ui}</main> },
    { path: "/projects", Component: () => <h1>Projects page</h1> },
  ]);
  return render(<Stub initialEntries={["/"]} />);
}

/** Renders `ui` on every path, starting at `path`. */
function renderAt(path: string, ui: ReactNode) {
  const Stub = createRoutesStub([{ path: "*", Component: () => <main>{ui}</main> }]);
  return render(<Stub initialEntries={[path]} />);
}

describe("Link", () => {
  it("routes a same-origin path client-side (R5.2)", async () => {
    const user = userEvent.setup();
    renderInRouter(<Link href="/projects">Projects</Link>);

    const link = await screen.findByRole("link", { name: "Projects" });
    expect(link).toHaveAttribute("href", "/projects");
    await user.click(link);

    expect(await screen.findByRole("heading", { name: "Projects page" })).toBeInTheDocument();
  });

  it.each([
    ["protocol-relative URL", "//example.com/x"],
    ["absolute URL", "https://example.com/"],
    ["mailto: URL", "mailto:ben@example.com"],
    ["tel: URL", "tel:+15555550123"],
    ["in-page hash", "#contact"],
  ])("renders a %s as a plain <a>, needing no router (R5.3)", (_kind, href) => {
    // Rendered outside any router: a router link would throw here.
    render(<Link href={href}>Somewhere</Link>);

    expect(screen.getByRole("link", { name: "Somewhere" })).toHaveAttribute("href", href);
  });

  it.each([
    ["a routed", "/projects"],
    ["a plain", "https://github.com/"],
  ])("with newTab, opens %s link in a new tab and says so (R5.4)", async (_kind, href) => {
    renderInRouter(
      <Link href={href} newTab>
        GitHub
      </Link>,
    );

    const link = await screen.findByRole("link", { name: /^GitHub/ });
    expect(link).toHaveAccessibleName("GitHub, opens in new tab");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    const icon = link.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon?.innerHTML).toBe(
      render(<Icon name="external-link" />).container.querySelector("svg")?.innerHTML,
    );
  });

  it("keeps an inline new-tab icon on the last word's line, with nothing after it (refinement R4.2, R4.3)", () => {
    render(
      <Link href="https://github.com/" newTab>
        GitHub
      </Link>,
    );

    const link = screen.getByRole("link");
    const icon = link.querySelector("svg");
    const wrapper = icon?.parentElement;
    expect(wrapper).toHaveClass(styles.newTab ?? "");
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(wrapper?.firstChild?.textContent).toBe("\u2060");
    expect(icon).toHaveClass(styles.newTabIcon ?? "");
    expect(wrapper?.nextSibling).toBe(link.lastChild);
    expect(link.lastChild?.textContent).toBe(", opens in new tab");
  });

  it("spaces a button-styled new-tab icon with Button's gap alone (refinement R4.3)", () => {
    render(
      <Link href="https://github.com/" newTab appearance="button">
        GitHub
      </Link>,
    );

    const link = screen.getByRole("link", { name: "GitHub, opens in new tab" });
    const icon = link.querySelector("svg");
    expect(icon).not.toHaveClass(styles.newTabIcon ?? "");
    expect(link.textContent).not.toContain("\u2060");
  });

  it.each([
    ["alone", "me", false, "me"],
    ["with newTab", "me", true, "me noopener noreferrer"],
    ["with newTab, without duplicates", "noopener  me", true, "noopener me noreferrer"],
  ])("takes rel %s (refinement R4.6)", (_kind, rel, newTab, expected) => {
    render(
      <Link href="https://github.com/" rel={rel} newTab={newTab}>
        GitHub
      </Link>,
    );

    expect(screen.getByRole("link", { name: /^GitHub/ })).toHaveAttribute("rel", expected);
  });

  it("passes React Router's options to a routed link (refinement R4.7)", async () => {
    const user = userEvent.setup();
    function Destination() {
      const { state } = useLocation() as { state: unknown };
      return <h1>{String(state)}</h1>;
    }
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => (
          <Link href="/projects" state="from home" prefetch="none">
            Projects
          </Link>
        ),
      },
      { path: "/projects", Component: Destination },
    ]);
    render(<Stub initialEntries={["/"]} />);

    await user.click(await screen.findByRole("link", { name: "Projects" }));

    expect(await screen.findByRole("heading", { name: "from home" })).toBeInTheDocument();
  });

  it("drops React Router's options on a plain link (refinement R4.7)", () => {
    render(
      <Link href="https://github.com/" prefetch="intent" state="x" discover="none" replace>
        GitHub
      </Link>,
    );

    const link = screen.getByRole("link");
    for (const name of ["prefetch", "state", "discover", "replace"]) {
      expect(link).not.toHaveAttribute(name);
    }
  });

  it("without newTab, sets no target or rel", () => {
    render(<Link href="https://github.com/">GitHub</Link>);

    const link = screen.getByRole("link", { name: "GitHub" });
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });

  it("is an inline, underlined link by default (R5.5, R5.7)", () => {
    render(<Link href="#x">Read more</Link>);

    const link = screen.getByRole("link");
    expect(link).toHaveClass(styles.link ?? "");
    expect(link).not.toHaveClass(buttonStyles.button ?? "");
  });

  it("with appearance=button, uses Button's classes, variant, size and icons (R5.5)", () => {
    render(
      <Link href="#x" appearance="button" variant="primary" size="sm" iconEnd="arrow-right">
        Get in touch
      </Link>,
    );

    const link = screen.getByRole("link", { name: "Get in touch" });
    expect(link).toHaveClass(
      buttonStyles.button ?? "",
      buttonStyles.primary ?? "",
      buttonStyles.sm ?? "",
    );
    expect(link).not.toHaveClass(styles.link ?? "");
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("with appearance=button, one icon and only VisuallyHidden, is square (refinement R3.5)", () => {
    render(
      <>
        <Link href="#x" appearance="button" iconStart="github">
          <VisuallyHidden>GitHub</VisuallyHidden>
        </Link>
        <Link href="#y" appearance="button" iconStart="mail">
          Email me
        </Link>
        <Link href="https://github.com/" appearance="button" iconStart="github" newTab>
          <VisuallyHidden>GitHub profile</VisuallyHidden>
        </Link>
      </>,
    );

    expect(screen.getByRole("link", { name: "GitHub" })).toHaveClass(buttonStyles.iconOnly ?? "");
    expect(screen.getByRole("link", { name: "Email me" })).not.toHaveClass(
      buttonStyles.iconOnly ?? "",
    );
    // The new-tab icon is a second visible icon, so it isn't square.
    expect(screen.getByRole("link", { name: /^GitHub profile/ })).not.toHaveClass(
      buttonStyles.iconOnly ?? "",
    );
  });

  it.each([
    ["an exact match", "/lab/tokens", "/lab/tokens", undefined, "page"],
    ["a trailing slash", "/lab/tokens/", "/lab/tokens", undefined, "page"],
    ["a different case", "/Lab/Tokens", "/lab/tokens", undefined, "page"],
    ["a query and hash", "/lab/tokens", "/lab/tokens?view=all#color", undefined, "page"],
    ["a child page with section", "/lab/tokens", "/lab", "section", "true"],
    ["the same page with section", "/lab", "/lab", "section", "page"],
  ] as const)("marks %s as current (refinement R4.8)", async (_kind, at, href, match, expected) => {
    renderAt(
      at,
      <Link href={href} currentMatch={match}>
        Here
      </Link>,
    );

    expect(await screen.findByRole("link", { name: "Here" })).toHaveAttribute(
      "aria-current",
      expected,
    );
  });

  it.each([
    ["a child page without section", "/lab/tokens", "/lab", undefined],
    ["a child page of / with section", "/lab", "/", "section"],
    ["a sibling sharing a prefix", "/labs", "/lab", "section"],
  ] as const)("doesn't mark %s (refinement R4.8)", async (_kind, at, href, match) => {
    renderAt(
      at,
      <Link href={href} currentMatch={match}>
        Here
      </Link>,
    );

    expect(await screen.findByRole("link", { name: "Here" })).not.toHaveAttribute("aria-current");
  });

  it("never marks a plain link (refinement R4.8)", async () => {
    renderAt(
      "/lab",
      <>
        <Link href="#lab">Hash</Link>
        <Link href="https://example.com/lab">Absolute</Link>
      </>,
    );

    for (const name of ["Hash", "Absolute"]) {
      expect(await screen.findByRole("link", { name })).not.toHaveAttribute("aria-current");
    }
  });

  it.each([
    [false, "false"],
    ["step", "step"],
  ] as const)(
    "lets the caller's aria-current=%s win (refinement R4.8)",
    async (value, expected) => {
      renderAt(
        "/lab",
        <Link href="/lab" aria-current={value}>
          Lab
        </Link>,
      );

      expect(await screen.findByRole("link", { name: "Lab" })).toHaveAttribute(
        "aria-current",
        expected,
      );
    },
  );

  it("doesn't mark a button-styled link by itself, but keeps the caller's aria-current (refinement R4.8)", async () => {
    renderAt(
      "/lab",
      <>
        <Link href="/lab" appearance="button">
          Lab
        </Link>
        <Link href="/lab" appearance="button" aria-current="page">
          Marked
        </Link>
      </>,
    );

    expect(await screen.findByRole("link", { name: "Lab" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Marked" })).toHaveAttribute("aria-current", "page");
  });

  it("adds the new-tab text to an aria-label (refinement R4.2)", () => {
    render(
      <Link
        href="mailto:hello@example.com"
        appearance="button"
        iconStart="mail"
        aria-label="Email me"
        newTab
      />,
    );

    expect(screen.getByRole("link")).toHaveAccessibleName("Email me, opens in new tab");
  });

  it("adds the new-tab text to aria-labelledby (refinement R4.2)", () => {
    render(
      <>
        <span id="profile-label">GitHub profile</span>
        <Link
          href="https://github.com/"
          appearance="button"
          iconStart="github"
          aria-labelledby="profile-label"
          newTab
        />
      </>,
    );

    expect(screen.getByRole("link")).toHaveAccessibleName(/^GitHub profile ?, opens in new tab$/);
  });

  it("leaves aria-label alone without newTab (refinement R4.2)", () => {
    render(<Link href="#x" appearance="button" iconStart="check" aria-label="Done" />);

    expect(screen.getByRole("link")).toHaveAccessibleName("Done");
  });

  it("follows a routed link by keyboard, moving the mark (R5.2, refinement R4.8)", async () => {
    const user = userEvent.setup();
    renderAt(
      "/lab",
      <>
        <Link href="/lab">Lab</Link>
        <Link href="/lab/tokens">Tokens</Link>
      </>,
    );
    await screen.findByRole("link", { name: "Lab" });

    await user.tab();
    await user.tab();
    expect(screen.getByRole("link", { name: "Tokens" })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("link", { name: "Tokens" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Lab" })).not.toHaveAttribute("aria-current");
  });

  it("moves the mark after client-side navigation (refinement R4.8)", async () => {
    const user = userEvent.setup();
    renderAt(
      "/lab",
      <>
        <Link href="/lab">Lab</Link>
        <Link href="/lab/tokens">Tokens</Link>
      </>,
    );

    await user.click(await screen.findByRole("link", { name: "Tokens" }));

    expect(screen.getByRole("link", { name: "Tokens" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Lab" })).not.toHaveAttribute("aria-current");
  });

  it("adds the visited class only with showVisited (refinement R4.9)", () => {
    render(
      <>
        <Link href="#a" showVisited>
          Tracked
        </Link>
        <Link href="#b">Untracked</Link>
      </>,
    );

    expect(screen.getByRole("link", { name: "Tracked" })).toHaveClass(styles.showVisited ?? "");
    expect(screen.getByRole("link", { name: "Untracked" })).not.toHaveClass(
      styles.showVisited ?? "",
    );
  });

  it('adds the hover-underline class only with underline="hover" (refinement R11.7)', () => {
    render(
      <>
        <Link href="#a" underline="hover">
          Nav
        </Link>
        <Link href="#b" underline="always">
          Always
        </Link>
        <Link href="#c">Default</Link>
      </>,
    );

    expect(screen.getByRole("link", { name: "Nav" })).toHaveClass(
      styles.link ?? "",
      styles.underlineHover ?? "",
    );
    for (const name of ["Always", "Default"]) {
      expect(screen.getByRole("link", { name })).not.toHaveClass(styles.underlineHover ?? "");
    }
  });

  it("underlines a hover-underline link only on hover, where the device hovers, or when current (refinement R11.7)", () => {
    expect(css).toMatch(/^\.underlineHover \{\s*text-decoration-line: none;/m);
    expect(css).toMatch(
      /@media \(hover: hover\) \{\s*\.underlineHover:hover \{\s*text-decoration-line: underline;/,
    );
    expect(css).toMatch(
      /^\.underlineHover\[aria-current\]:not\(\[aria-current="false"\]\) \{\s*text-decoration-line: underline;/m,
    );
  });

  it("passes aria-current through, as the current-state styling hook (R5.8)", async () => {
    renderInRouter(
      <Link href="/" aria-current="page">
        Home
      </Link>,
    );

    expect(await screen.findByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("puts ref, rest props and className on the anchor, keeping its own classes (R3.2, R3.3)", async () => {
    const ref = createRef<HTMLAnchorElement>();
    renderInRouter(
      <Link href="/projects" ref={ref} id="cta" data-kind="nav" className="extra">
        Projects
      </Link>,
    );

    const link = await screen.findByRole("link", { name: "Projects" });
    expect(ref.current).toBe(link);
    expect(link).toHaveAttribute("id", "cta");
    expect(link).toHaveAttribute("data-kind", "nav");
    expect(link).toHaveClass("extra", styles.link ?? "");
  });

  it("renders no style attribute (R3.5)", () => {
    const { container } = render(
      <Link href="https://github.com/" newTab appearance="button" iconStart="github">
        GitHub
      </Link>,
    );

    expect(container.querySelector("[style]")).toBeNull();
  });

  it("hydrates prerendered markup with no mismatch (R3.6)", () => {
    expectHydratesCleanly(
      <Link href="https://github.com/" newTab>
        GitHub
      </Link>,
    );
  });

  it("hydrates a current routed link with no mismatch (R3.6, refinement R4.8)", () => {
    expectHydratesCleanly(
      <MemoryRouter initialEntries={["/lab/tokens"]}>
        <Link href="/lab/tokens">Tokens</Link>
        <Link href="/lab" currentMatch="section">
          Lab
        </Link>
      </MemoryRouter>,
    );
  });

  it("has no axe violations, inline, current, new-tab, visited, hover-underline, rel and as buttons (R3.9)", async () => {
    const { container } = renderInRouter(
      <>
        <p>
          Read the <Link href="/projects">projects</Link>.
        </p>
        <Link href="/" aria-current="page">
          Home
        </Link>
        <Link href="https://github.com/" newTab>
          GitHub
        </Link>
        <Link href="#contact" appearance="button" variant="primary">
          Contact
        </Link>
        <Link href="/projects" currentMatch="section">
          Projects
        </Link>
        <Link href="#visited" showVisited>
          Visited
        </Link>
        <Link href="/projects" underline="hover">
          Hover underline
        </Link>
        <Link href="https://github.com/" rel="me" newTab>
          Profile
        </Link>
        <Link
          href="mailto:hello@example.com"
          appearance="button"
          iconStart="mail"
          aria-label="Email me"
        />
      </>,
    );
    await screen.findByRole("link", { name: "Home" });

    await expectNoAxeViolations(container);
  });
});
