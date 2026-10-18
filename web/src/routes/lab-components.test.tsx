import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { siteUrl } from "../site.config.ts";
import LabComponents, { links, meta } from "./lab-components.tsx";

function renderPage() {
  const Stub = createRoutesStub([{ path: "/lab/components", Component: LabComponents }]);
  render(<Stub initialEntries={["/lab/components"]} />);
}

describe("lab components route (R14.2, R14.5)", () => {
  it("renders an h1 of Components, after a link back to /lab", async () => {
    renderPage();

    const h1 = await screen.findByRole("heading", { level: 1, name: "Components" });
    const back = screen.getByRole("link", { name: "Back to Lab" });
    expect(back).toHaveAttribute("href", "/lab");
    expect(back.compareDocumentPosition(h1)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("is titled Components · Lab · Ben, with a description", () => {
    expect(meta()).toEqual([
      { title: "Components · Lab · Ben" },
      { name: "description", content: expect.any(String) as string },
    ]);
  });

  it("links the canonical URL to /lab/components", () => {
    expect(links()).toEqual([{ rel: "canonical", href: `${siteUrl}/lab/components` }]);
  });
});
