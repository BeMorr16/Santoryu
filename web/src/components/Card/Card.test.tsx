import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode } from "react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import { Card } from "./Card.tsx";
import styles from "./Card.module.css";

function renderInRouter(ui: ReactNode) {
  const Stub = createRoutesStub([
    { path: "/", Component: () => <main>{ui}</main> },
    { path: "/projects/site", Component: () => <h1>Site project</h1> },
  ]);
  return render(<Stub initialEntries={["/"]} />);
}

describe("Card", () => {
  it("is an article with an h3 heading by default (R10.1, R10.2)", () => {
    render(<Card heading="Personal site">Built with React.</Card>);

    const article = screen.getByRole("article");
    expect(article).toHaveClass(styles.card ?? "");
    expect(screen.getByRole("heading", { level: 3, name: "Personal site" })).toBeInTheDocument();
    expect(article).toHaveTextContent("Built with React.");
  });

  it.each([2, 3, 4, 5, 6] as const)("renders its heading at level %s (R10.2)", (level) => {
    render(<Card heading="Title" headingLevel={level} />);

    expect(screen.getByRole("heading", { level, name: "Title" })).toBeInTheDocument();
  });

  it("renders without a heading", () => {
    render(<Card>Just content.</Card>);

    expect(screen.queryByRole("heading")).toBeNull();
  });

  it.each(["section", "div", "li"] as const)("renders as %s (R10.1)", (as) => {
    const { container } = render(
      <Card as={as} heading="Title">
        Body
      </Card>,
    );

    expect(container.firstElementChild?.tagName).toBe(as.toUpperCase());
  });

  describe("link card (R10.3–R10.5)", () => {
    it("has exactly one link, named by the heading text alone, inside the heading", async () => {
      renderInRouter(
        <Card heading="Personal site" href="/projects/site">
          A static React site with a component library.
        </Card>,
      );

      const links = await screen.findAllByRole("link");
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAccessibleName("Personal site");
      expect(screen.getByRole("heading", { name: "Personal site" })).toContainElement(
        links[0] ?? null,
      );
      expect(screen.getByRole("article")).toHaveClass(styles.interactive ?? "");
    });

    it("follows the link, routing client-side, when the heading link is activated", async () => {
      const user = userEvent.setup();
      renderInRouter(<Card heading="Personal site" href="/projects/site" />);

      await user.click(await screen.findByRole("link", { name: "Personal site" }));

      expect(await screen.findByRole("heading", { name: "Site project" })).toBeInTheDocument();
    });

    it("keeps a nested button independently focusable and clickable, without navigating", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      renderInRouter(
        <Card heading="Personal site" href="/projects/site">
          <button type="button" onClick={onClick}>
            Copy link
          </button>
        </Card>,
      );
      await screen.findByRole("link");

      await user.tab();
      expect(screen.getByRole("link", { name: "Personal site" })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "Copy link" })).toHaveFocus();
      await user.click(screen.getByRole("button", { name: "Copy link" }));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("heading", { name: "Site project" })).toBeNull();
    });

    it("says when the card link opens a new tab", () => {
      render(<Card heading="GitHub profile" href="https://github.com/" newTab />);

      expect(screen.getByRole("link")).toHaveAccessibleName("GitHub profile, opens in new tab");
    });
  });

  it("is not interactive without href", () => {
    render(<Card heading="Title">Body</Card>);

    expect(screen.getByRole("article")).not.toHaveClass(styles.interactive ?? "");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("puts ref, rest props and className on the root (R3.2, R3.3)", () => {
    const ref = createRef<HTMLElement>();
    render(<Card ref={ref} heading="Title" id="c" data-kind="project" className="extra" />);

    const root = screen.getByRole("article");
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("id", "c");
    expect(root).toHaveAttribute("data-kind", "project");
    expect(root).toHaveClass("extra", styles.card ?? "");
  });

  it("renders no style attribute (R3.5)", () => {
    const { container } = render(<Card heading="Title" href="https://example.com/" newTab />);

    expect(container.querySelector("[style]")).toBeNull();
  });

  it("hydrates prerendered markup with no mismatch (R3.6)", () => {
    expectHydratesCleanly(
      <Card heading="Title" href="https://example.com/">
        Body
      </Card>,
    );
  });

  it("has no axe violations, plain and as a link card with a nested control (R3.9)", async () => {
    const { container } = renderInRouter(
      <>
        <Card heading="Plain">Body</Card>
        <Card heading="Linked" href="/projects/site">
          <p>Body</p>
          <button type="button">Copy link</button>
        </Card>
      </>,
    );
    await screen.findByRole("link", { name: "Linked" });

    await expectNoAxeViolations(container);
  });
});
