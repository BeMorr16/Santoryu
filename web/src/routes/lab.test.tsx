import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { siteUrl } from "../site.config.ts";
import Lab, { links, meta } from "./lab.tsx";

function renderLab() {
  const Stub = createRoutesStub([{ path: "/lab", Component: Lab }]);
  render(<Stub initialEntries={["/lab"]} />);
}

describe("lab route", () => {
  it("renders an h1 of Lab, then the six category h2s in order, with no deeper levels", async () => {
    renderLab();

    const headings = await screen.findAllByRole("heading");
    expect(headings.map((h) => [h.tagName, h.textContent])).toEqual([
      ["H1", "Lab"],
      ["H2", "Color"],
      ["H2", "Type"],
      ["H2", "Space"],
      ["H2", "Radius"],
      ["H2", "Motion"],
      ["H2", "Effect"],
    ]);
  });

  it("has a short intro", async () => {
    renderLab();

    expect(await screen.findByText(/design tokens/i, { selector: "p" })).toBeVisible();
  });

  it("is titled Lab · Ben, with a description", () => {
    expect(meta()).toEqual([
      { title: "Lab · Ben" },
      { name: "description", content: expect.any(String) as string },
    ]);
  });

  it("links the canonical URL to /lab", () => {
    expect(links()).toEqual([{ rel: "canonical", href: `${siteUrl}/lab` }]);
  });
});
