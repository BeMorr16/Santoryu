import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { siteUrl } from "../../../site.config.ts";
import Components, { handle, links, meta } from "./index.tsx";

describe("design system components route (ds-components R3)", () => {
  it("renders the overview, with an h1 of Components", async () => {
    const Stub = createRoutesStub([{ path: "/design-system/components", Component: Components }]);
    render(<Stub initialEntries={["/design-system/components"]} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Components" })).toBeVisible();
  });

  it("has the docs side menu (R2.1)", () => {
    expect(handle).toBe(docsHandle);
  });

  it("is titled Components · Design System · Ben Morrison (R1.5), with a description", () => {
    expect(meta()).toEqual(
      expect.arrayContaining([
        { title: "Components · Design System · Ben Morrison" },
        { name: "description", content: expect.any(String) as string },
      ]),
    );
  });

  it("links the canonical URL to /design-system/components (R1.1)", () => {
    expect(links()).toEqual([{ rel: "canonical", href: `${siteUrl}/design-system/components` }]);
  });
});
