import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { siteUrl } from "../site.config.ts";
import LabTokens, { links, meta } from "./lab-tokens.tsx";

function renderPage() {
  const Stub = createRoutesStub([{ path: "/lab/tokens", Component: LabTokens }]);
  render(<Stub initialEntries={["/lab/tokens"]} />);
}

describe("lab tokens route (R14.2, R14.3, R14.5)", () => {
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

  it("links back to /lab above the h1", async () => {
    renderPage();

    const back = await screen.findByRole("link", { name: "Back to Lab" });
    expect(back).toHaveAttribute("href", "/lab");
    expect(back.compareDocumentPosition(screen.getByRole("heading", { level: 1 }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("is titled Tokens · Lab · Ben, with a description", () => {
    expect(meta()).toEqual([
      { title: "Tokens · Lab · Ben" },
      { name: "description", content: expect.any(String) as string },
    ]);
  });

  it("links the canonical URL to /lab/tokens", () => {
    expect(links()).toEqual([{ rel: "canonical", href: `${siteUrl}/lab/tokens` }]);
  });
});
