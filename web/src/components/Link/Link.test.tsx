import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode } from "react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import { Icon } from "../Icon/Icon.tsx";
import buttonStyles from "../shared/button-styles.module.css";
import { Link } from "./Link.tsx";
import styles from "./Link.module.css";

function renderInRouter(ui: ReactNode) {
  const Stub = createRoutesStub([
    { path: "/", Component: () => <main>{ui}</main> },
    { path: "/projects", Component: () => <h1>Projects page</h1> },
  ]);
  return render(<Stub initialEntries={["/"]} />);
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
    expect(link).toHaveAccessibleName("GitHub (opens in new tab)");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    const icon = link.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon?.innerHTML).toBe(
      render(<Icon name="external-link" />).container.querySelector("svg")?.innerHTML,
    );
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

  it("has no axe violations, inline, current, new-tab and as a button (R3.9)", async () => {
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
      </>,
    );
    await screen.findByRole("link", { name: "Home" });

    await expectNoAxeViolations(container);
  });
});
