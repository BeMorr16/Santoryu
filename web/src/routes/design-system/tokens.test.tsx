import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { siteUrl } from "../../site.config.ts";
import Tokens, { links, meta } from "./tokens.tsx";

async function renderPage() {
  const Stub = createRoutesStub([{ path: "/design-system/tokens", Component: Tokens }]);
  render(<Stub initialEntries={["/design-system/tokens"]} />);
  return screen.findByRole("heading", { level: 1 });
}

const h2s = [
  "Naming",
  "Theming",
  "Usage",
  "Accessibility",
  "Find a token",
  "Primitives",
  "Semantic",
  "Component",
];

/** Whether `next` comes after `element` in the document. */
const follows = (element: Element, next: Element) =>
  (element.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe("design system tokens route (ds-tokens R1)", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  });

  it("shows the back link, h1, lead, On this page, diagram, topics, search, then the tiers, in order (R1.1)", async () => {
    const h1 = await renderPage();

    expect(h1).toHaveTextContent("Tokens");
    const parts = [
      screen.getByRole("link", { name: "Back to Design System" }),
      h1,
      screen.getByText(/^Every design token behind this site/),
      screen.getByRole("list", { name: "On this page" }),
      screen.getByRole("figure"),
      ...h2s.slice(0, 5).map((name) => screen.getByRole("heading", { level: 2, name })),
      screen.getByRole("searchbox", { name: "Search tokens" }),
      ...h2s.slice(5).map((name) => screen.getByRole("heading", { level: 2, name })),
    ];
    for (const [index, part] of parts.entries()) {
      const next = parts[index + 1];
      if (next) expect(follows(part, next), `part ${String(index)}`).toBe(true);
    }
    expect(screen.getByRole("link", { name: "Back to Design System" })).toHaveAttribute(
      "href",
      "/design-system",
    );
  });

  it("lists the page's eight h2s, and only those, under On this page (R1.2)", async () => {
    await renderPage();

    const toc = screen.getByRole("list", { name: "On this page" });
    expect(
      within(toc)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => [heading.textContent, `#${heading.id}`]),
    );
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(h2s);
  });

  it("has one h1 and skips no heading level", async () => {
    await renderPage();

    const levels = screen
      .getAllByRole("heading")
      .map((heading) => Number(heading.tagName.slice(1)));
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    for (const [index, level] of levels.entries()) {
      expect(level - (levels[index - 1] ?? 0)).toBeLessThanOrEqual(1);
    }
  });

  it("starts with every group closed (R4.4)", async () => {
    await renderPage();

    expect(screen.queryAllByRole("button", { expanded: true })).toEqual([]);
  });

  it("is titled Tokens · Design System · Ben, with the new description (R1.3)", () => {
    expect(meta()).toEqual([
      { title: "Tokens · Design System · Ben" },
      {
        name: "description",
        content:
          "Every design token behind this site: a diagram of how they flow, then every primitive, semantic and component token.",
      },
    ]);
  });

  it("links the canonical URL to /design-system/tokens (R1.3)", () => {
    expect(links()).toEqual([{ rel: "canonical", href: `${siteUrl}/design-system/tokens` }]);
  });
});
