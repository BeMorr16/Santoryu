import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { siteUrl } from "../site.config.ts";
import Lab, { labPages, links, meta } from "./lab.tsx";

function renderLab() {
  const Stub = createRoutesStub([{ path: "/lab", Component: Lab }]);
  render(<Stub initialEntries={["/lab"]} />);
}

describe("lab hub route (R14.1)", () => {
  it("renders an h1 of Lab and a short intro", async () => {
    renderLab();

    expect(await screen.findByRole("heading", { level: 1, name: "Lab" })).toBeVisible();
    expect(screen.getByText(/design system/i, { selector: "p" })).toBeVisible();
  });

  it("links Tokens and Components, each with a one-line description", async () => {
    renderLab();

    const list = await screen.findByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(labPages.map((page) => [page.title, page.href])).toEqual([
      ["Tokens", "/lab/tokens"],
      ["Components", "/lab/components"],
    ]);
    for (const [index, page] of labPages.entries()) {
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
    renderLab();

    expect(await screen.findAllByRole("heading")).toHaveLength(1);
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
