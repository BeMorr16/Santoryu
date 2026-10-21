import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { siteUrl } from "../../site.config.ts";
import Tokens, { links, meta } from "./tokens.tsx";

function renderPage() {
  const Stub = createRoutesStub([{ path: "/design-system/tokens", Component: Tokens }]);
  render(<Stub initialEntries={["/design-system/tokens"]} />);
}

describe("design system tokens route (R1.4, R14.2, R14.3)", () => {
  it("renders an h1 of Tokens, then the category h2s and Component tokens", async () => {
    renderPage();

    const h1 = await screen.findByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Tokens");
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Color",
      "Type",
      "Space",
      "Size",
      "Radius",
      "Motion",
      "Effect",
      "Layer",
      "Component tokens",
    ]);
  });

  it("links back to /design-system above the h1", async () => {
    renderPage();

    const back = await screen.findByRole("link", { name: "Back to Design System" });
    expect(back).toHaveAttribute("href", "/design-system");
    expect(back.compareDocumentPosition(screen.getByRole("heading", { level: 1 }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("is titled Tokens · Design System · Ben (R1.5), with a description", () => {
    expect(meta()).toEqual([
      { title: "Tokens · Design System · Ben" },
      { name: "description", content: expect.any(String) as string },
    ]);
  });

  it("links the canonical URL to /design-system/tokens (R1.1)", () => {
    expect(links()).toEqual([{ rel: "canonical", href: `${siteUrl}/design-system/tokens` }]);
  });
});
