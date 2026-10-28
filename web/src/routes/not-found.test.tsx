import { render, screen } from "@testing-library/react";
import { Outlet, createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import linkStyles from "../components/Link/Link.module.css";
import { isRouteHandle } from "../shell/route-handle.ts";
import * as notFoundModule from "./not-found.tsx";

const { default: NotFound, handle, meta } = notFoundModule;

function renderAt(path: string) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: Outlet,
      children: [
        { index: true, Component: () => <h1>Home page</h1> },
        { path: "*", Component: NotFound },
      ],
    },
  ]);
  render(<Stub initialEntries={[path]} />);
}

describe("not-found route", () => {
  it("renders a Page not found heading and a link home", async () => {
    renderAt("/does-not-exist");

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Page not found");
    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute("href", "/");
  });

  it("uses the library Link for the home link (refinement R4.10)", async () => {
    renderAt("/does-not-exist");

    expect(await screen.findByRole("link", { name: /home/i })).toHaveClass(linkStyles.link ?? "");
  });

  it("renders for unknown nested paths", async () => {
    renderAt("/design-system/nope/deeper");

    expect(await screen.findByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  });

  it("is noindex, titled Page not found · Ben Morrison, with a description", () => {
    expect(meta()).toEqual([
      { title: "Page not found · Ben Morrison" },
      { name: "description", content: expect.any(String) as string },
      { name: "robots", content: "noindex" },
    ]);
  });

  it("asks for the striking backdrop (site-backdrop R1.3)", () => {
    expect(isRouteHandle(handle)).toBe(true);
    expect(handle.backdrop).toBe("striking");
  });

  it("has no canonical link", () => {
    expect("links" in notFoundModule).toBe(false);
  });
});
