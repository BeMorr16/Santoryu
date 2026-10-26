import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { siteUrl } from "../../site.config.ts";
import ThemeCreator, { links, meta } from "./theme-creator.tsx";

const path = "/design-system/theme-creator";
const Stub = createRoutesStub([{ path, Component: ThemeCreator }]);

afterEach(() => {
  localStorage.clear();
});

describe("theme creator route (theme-creator R1)", () => {
  it("is titled Theme Creator · Design System · Ben Morrison, with a description (R1.1)", () => {
    expect(meta()).toEqual(
      expect.arrayContaining([
        { title: "Theme Creator · Design System · Ben Morrison" },
        { name: "description", content: expect.stringMatching(/theme/i) as string },
      ]),
    );
  });

  it("links the canonical URL (R1.1)", () => {
    expect(links()).toEqual([{ rel: "canonical", href: `${siteUrl}${path}` }]);
  });

  it("prerenders the heading, lead and a no-JavaScript note, and no controls (R1.2, R1.4)", () => {
    const holder = document.createElement("div");
    holder.innerHTML = renderToString(<Stub initialEntries={[path]} />);

    expect(holder.querySelector("h1")?.textContent).toBe("Theme Creator");
    expect(holder.querySelector("a[href='/design-system']")?.textContent).toBe(
      "Back to Design System",
    );
    expect(holder.textContent).toContain("The theme creator needs JavaScript.");
    expect(holder.querySelectorAll("input, button, select, textarea")).toHaveLength(0);
  });

  it("mounts the editor after hydration, and drops the note", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Stub initialEntries={[path]} />);
    document.body.append(container);
    const onRecoverableError = vi.fn();

    render(<Stub initialEntries={[path]} />, { container, hydrate: true, onRecoverableError });

    expect(await screen.findByRole("textbox", { name: "Theme name" })).toBeInTheDocument();
    expect(screen.queryByText(/needs JavaScript/)).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Color" })).toBeInTheDocument();
    expect(onRecoverableError).not.toHaveBeenCalled();
    container.remove();
  });
});
