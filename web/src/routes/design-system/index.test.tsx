import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { siteUrl } from "../../site.config.ts";
import DesignSystem, { designSystemPages, links, meta } from "./index.tsx";

function renderPage() {
  const Stub = createRoutesStub([{ path: "/design-system", Component: DesignSystem }]);
  render(<Stub initialEntries={["/design-system"]} />);
}

describe("design system route (R1.3)", () => {
  it("renders an h1 of Design System and a short intro", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Design System" })).toBeVisible();
    expect(screen.getByText(/design system/i, { selector: "p" })).toBeVisible();
  });

  it("links Tokens, Components and the Theme Creator, each with a one-line description (theme-creator R1.3)", async () => {
    renderPage();

    const list = await screen.findByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(designSystemPages.map((page) => [page.title, page.href])).toEqual([
      ["Tokens", "/design-system/tokens"],
      ["Components", "/design-system/components"],
      ["Theme Creator", "/design-system/theme-creator"],
    ]);
    for (const [index, page] of designSystemPages.entries()) {
      const item = items[index];
      if (!item) throw new Error(`missing item ${String(index)}`);
      expect(within(item).getByRole("link", { name: page.title })).toHaveAttribute(
        "href",
        page.href,
      );
      expect(item).toHaveTextContent(page.description);
    }
  });

  it("has only the one heading", async () => {
    renderPage();

    expect(await screen.findAllByRole("heading")).toHaveLength(1);
  });

  it("is titled Design System · Ben (R1.5), with a description", () => {
    expect(meta()).toEqual([
      { title: "Design System · Ben" },
      { name: "description", content: expect.any(String) as string },
    ]);
  });

  it("links the canonical URL to /design-system (R1.1)", () => {
    expect(links()).toEqual([{ rel: "canonical", href: `${siteUrl}/design-system` }]);
  });
});
