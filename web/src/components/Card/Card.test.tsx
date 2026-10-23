import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode } from "react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import typography from "../Typography/Typography.module.css";
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

  it.each([2, 3, 4, 5, 6] as const)(
    "gives its heading the h4 look at level %s by default (refinement R12.9)",
    (level) => {
      render(<Card heading="Title" headingLevel={level} />);

      const heading = screen.getByRole("heading", { level, name: "Title" });
      expect(heading).toHaveClass(typography.h4 ?? "", styles.heading ?? "");
      if (level !== 4) expect(heading).not.toHaveClass(typography[`h${String(level)}`] ?? "");
    },
  );

  it.each([2, 3, 4, 5, 6] as const)(
    "gives its heading headingVariant's look at level %s (refinement R12.9)",
    (level) => {
      render(<Card heading="Title" headingLevel={level} headingVariant="label" />);

      const heading = screen.getByRole("heading", { level, name: "Title" });
      expect(heading).toHaveClass(typography.label ?? "");
      expect(heading).not.toHaveClass(typography.h4 ?? "");
    },
  );

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

    it("follows the link from the keyboard: Tab to the heading link, then Enter", async () => {
      const user = userEvent.setup();
      renderInRouter(<Card heading="Personal site" href="/projects/site" />);
      await screen.findByRole("link");

      await user.tab();
      expect(screen.getByRole("link", { name: "Personal site" })).toHaveFocus();
      await user.keyboard("{Enter}");

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

    it("never marks its link as the current page automatically (refinement R8.11)", async () => {
      renderInRouter(<Card heading="Home" href="/" />);

      const link = await screen.findByRole("link", { name: "Home" });
      expect(link).not.toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("article")).not.toHaveAttribute("aria-current");
    });

    it("puts a caller's aria-current on the link, not the root (refinement R8.11)", async () => {
      renderInRouter(<Card heading="Personal site" href="/projects/site" aria-current="page" />);

      expect(await screen.findByRole("link", { name: "Personal site" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(screen.getByRole("article")).not.toHaveAttribute("aria-current");
    });

    it("says when the card link opens a new tab", () => {
      render(<Card heading="GitHub profile" href="https://github.com/" newTab />);

      expect(screen.getByRole("link")).toHaveAccessibleName("GitHub profile, opens in new tab");
    });
  });

  describe("parts (refinement R8.1)", () => {
    it("renders the heading, body and footer in order, the body and footer as divs", () => {
      render(
        <Card heading="Title" footer="Footer text">
          Body text
        </Card>,
      );

      const article = screen.getByRole("article");
      expect([...article.children].map((child) => [child.tagName, child.textContent])).toEqual([
        ["H3", "Title"],
        ["DIV", "Body text"],
        ["DIV", "Footer text"],
      ]);
      expect(article.children[1]).toHaveClass(styles.body ?? "");
      expect(article.children[2]).toHaveClass(styles.footer ?? "");
    });

    it("never renders a footer element, so the footer is no contentinfo landmark", () => {
      const { container } = render(
        <Card as="div" heading="Title" footer="Footer text">
          Body
        </Card>,
      );

      expect(container.querySelector("footer")).toBeNull();
      expect(screen.queryByRole("contentinfo")).toBeNull();
    });

    it.each([undefined, null, false] as const)(
      "renders no body or footer wrapper for %s",
      (empty) => {
        render(
          <Card heading="Title" footer={empty}>
            {empty}
          </Card>,
        );

        expect(screen.getByRole("article").children).toHaveLength(1);
      },
    );
  });

  describe("media (R4)", () => {
    it("comes after the heading and before the body and footer in the DOM (R4.2)", () => {
      render(
        <Card heading="Title" media={<span>Picture</span>} footer="Footer text">
          Body text
        </Card>,
      );

      const article = screen.getByRole("article");
      expect([...article.children].map((child) => [child.tagName, child.textContent])).toEqual([
        ["H3", "Title"],
        ["DIV", "Picture"],
        ["DIV", "Body text"],
        ["DIV", "Footer text"],
      ]);
      expect(article.children[1]).toHaveClass(styles.media ?? "");
    });

    it.each([undefined, null, false] as const)(
      "renders no media wrapper for %s (R4.1)",
      (empty) => {
        render(<Card heading="Title" media={empty} />);

        const article = screen.getByRole("article");
        expect(article.children).toHaveLength(1);
        expect(article.querySelector(`.${styles.media ?? ""}`)).toBeNull();
      },
    );

    it("renders media without href and without a heading", () => {
      render(<Card media={<img src="/a.jpg" alt="A waterfall" />}>Body</Card>);

      const article = screen.getByRole("article");
      expect(article).not.toHaveClass(styles.interactive ?? "");
      expect(article.children[0]).toHaveClass(styles.media ?? "");
      expect(screen.getByRole("img", { name: "A waterfall" })).toBeInTheDocument();
    });

    it.each([
      [
        4,
        <Card key="4" heading="Title" media="Picture" subgrid footer="Footer">
          Body
        </Card>,
      ],
      [
        3,
        <Card key="3" heading="Title" media="Picture" subgrid>
          Body
        </Card>,
      ],
    ])("counts media as a row: spans %s rows with subgrid (R4.3)", (rows, card) => {
      render(card);

      expect(screen.getByRole("article")).toHaveClass(
        styles.subgrid ?? "",
        styles[`rows-${String(rows)}`] ?? "",
      );
    });

    it("keeps the link named by the heading alone (R4.4)", async () => {
      renderInRouter(
        <Card
          heading="Personal site"
          href="/projects/site"
          media={<img src="/a.jpg" alt="A screenshot" />}
        >
          Body
        </Card>,
      );

      expect(await screen.findByRole("link")).toHaveAccessibleName("Personal site");
    });

    // jsdom and user-event don't implement inert, so browsers' skipping of it is checked in e2e.
    it("keeps the link first, and inert, hidden media adds no controls to the accessibility tree (R4.4, R4.5)", async () => {
      const user = userEvent.setup();
      renderInRouter(
        <Card
          heading="Personal site"
          href="/projects/site"
          media={
            <div aria-hidden="true" inert>
              <button type="button">Preview</button>
            </div>
          }
        />,
      );
      await screen.findByRole("link");

      await user.tab();
      expect(screen.getByRole("link", { name: "Personal site" })).toHaveFocus();
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("gives a non-inert control in media its own Tab stop, after the link (R4.4)", async () => {
      const user = userEvent.setup();
      renderInRouter(
        <Card
          heading="Personal site"
          href="/projects/site"
          media={<button type="button">Play</button>}
        />,
      );
      await screen.findByRole("link");

      await user.tab();
      expect(screen.getByRole("link", { name: "Personal site" })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "Play" })).toHaveFocus();
    });
  });

  describe("variant (refinement R8.5)", () => {
    it("is raised by default", () => {
      render(<Card heading="Title" />);

      expect(screen.getByRole("article")).toHaveClass(styles.raised ?? "");
    });

    it.each(["raised", "outlined", "flat", "glass"] as const)("adds the %s class", (variant) => {
      render(<Card heading="Title" variant={variant} />);

      const article = screen.getByRole("article");
      expect(article).toHaveClass(styles[variant] ?? "");
      const others = ["raised", "outlined", "flat", "glass"].filter((v) => v !== variant);
      for (const other of others) expect(article).not.toHaveClass(styles[other] ?? "");
    });
  });

  describe("subgrid (refinement R8.3)", () => {
    it("adds no subgrid or row classes by default", () => {
      render(
        <Card heading="Title" footer="Footer">
          Body
        </Card>,
      );

      const article = screen.getByRole("article");
      expect(article).not.toHaveClass(styles.subgrid ?? "");
      expect(article.className).not.toMatch(/rows-/);
    });

    it.each([
      [1, <Card key="1" heading="Title" subgrid />],
      [
        2,
        <Card key="2" heading="Title" subgrid>
          Body
        </Card>,
      ],
      [
        2,
        <Card key="2f" subgrid footer="Footer">
          Body
        </Card>,
      ],
      [
        3,
        <Card key="3" heading="Title" subgrid footer="Footer">
          Body
        </Card>,
      ],
    ])("spans %s rows for its rendered parts", (rows, card) => {
      render(card);

      const article = screen.getByRole("article");
      expect(article).toHaveClass(styles.subgrid ?? "", styles[`rows-${String(rows)}`] ?? "");
    });

    it("adds no row class when there are no parts", () => {
      render(<Card subgrid />);

      expect(screen.getByRole("article").className).not.toMatch(/rows-/);
    });
  });

  it("is not interactive without href", () => {
    render(<Card heading="Title">Body</Card>);

    expect(screen.getByRole("article")).not.toHaveClass(styles.interactive ?? "");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("keeps aria-current on the root without href (refinement R8.11)", () => {
    render(<Card heading="Title" aria-current="true" />);

    expect(screen.getByRole("article")).toHaveAttribute("aria-current", "true");
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
        <Card
          heading="Linked"
          href="/projects/site"
          variant="outlined"
          footer={<button type="button">Copy link</button>}
        >
          <p>Body</p>
        </Card>
      </>,
    );
    await screen.findByRole("link", { name: "Linked" });

    await expectNoAxeViolations(container);
  });
});
