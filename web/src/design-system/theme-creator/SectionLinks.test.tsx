import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SectionLinks } from "./SectionLinks.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

/** Each heading's top in the viewport, by id; jsdom has no layout, so rects are reported from here. */
let tops: Record<string, number> = {};

function renderLinks() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    return DOMRect.fromRect({ y: tops[this.id] ?? 0, height: 32 });
  });
  const user = userEvent.setup();
  const result = render(
    <>
      <button type="button">Before</button>
      <SectionLinks />
      <h2 id="section-color">Color</h2>
      <h2 id="section-typography">Typography</h2>
      <h2 id="section-shape">Shape</h2>
      <h2 id="section-spacing">Spacing</h2>
    </>,
  );
  return { user, ...result };
}

const nav = () => screen.getByRole("navigation", { name: "Editor sections" });
const current = () =>
  within(nav())
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "location")
    .map((link) => link.textContent);

function scrollTo(next: Record<string, number>) {
  tops = next;
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

describe("SectionLinks (theme-creator-controls R5.1–R5.3)", () => {
  it("links to Color, Typography, Shape and Spacing, in a nav named Editor sections", () => {
    tops = {};
    renderLinks();

    expect(
      within(nav())
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Color", "#section-color"],
      ["Typography", "#section-typography"],
      ["Shape", "#section-shape"],
      ["Spacing", "#section-spacing"],
    ]);
    expect(within(nav()).getByRole("list")).toBeInTheDocument();
  });

  it("marks the section in view as the current location, following the scroll", async () => {
    tops = {
      "section-color": 300,
      "section-typography": 900,
      "section-shape": 1500,
      "section-spacing": 2100,
    };
    renderLinks();
    // Every heading below the line: the first section.
    expect(current()).toEqual(["Color"]);

    scrollTo({
      "section-color": -700,
      "section-typography": -100,
      "section-shape": 500,
      "section-spacing": 1100,
    });
    await waitFor(() => {
      expect(current()).toEqual(["Typography"]);
    });

    scrollTo({
      "section-color": -2000,
      "section-typography": -1400,
      "section-shape": -800,
      "section-spacing": -200,
    });
    await waitFor(() => {
      expect(current()).toEqual(["Spacing"]);
    });
  });

  it("marks the last section once the page is scrolled to its end", async () => {
    tops = {
      "section-color": -1500,
      "section-typography": -900,
      "section-shape": -300,
      "section-spacing": 300,
    };
    renderLinks();
    expect(current()).toEqual(["Shape"]);
    const root = document.documentElement;
    vi.spyOn(window, "scrollY", "get").mockReturnValue(2000);
    vi.spyOn(root, "scrollHeight", "get").mockReturnValue(2000 + window.innerHeight);

    scrollTo(tops);

    await waitFor(() => {
      expect(current()).toEqual(["Spacing"]);
    });
  });

  it("isn't a live region, so moving the mark isn't announced", () => {
    tops = {};
    renderLinks();

    expect(nav().closest("[aria-live], [role='status']")).toBeNull();
    expect(nav().querySelector("[aria-live], [role='status'], [role='alert']")).toBeNull();
  });

  it("is in the Tab order in reading order", async () => {
    tops = {};
    const { user } = renderLinks();
    screen.getByRole("button", { name: "Before" }).focus();

    const order: (string | null)[] = [];
    for (let step = 0; step < 4; step += 1) {
      await user.tab();
      order.push(document.activeElement?.textContent ?? null);
    }

    expect(order).toEqual(["Color", "Typography", "Shape", "Spacing"]);
  });

  it("stops following the scroll once unmounted", () => {
    tops = {};
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderLinks();

    unmount();

    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
