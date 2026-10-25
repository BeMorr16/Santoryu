import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { focusWithoutScroll, pageFocusTarget } from "./focus.ts";

describe("pageFocusTarget", () => {
  it("returns main's h1", () => {
    render(
      <>
        <h1>Outside main</h1>
        <main>
          <h1>Page title</h1>
        </main>
      </>,
    );

    expect(pageFocusTarget()).toBe(screen.getByRole("heading", { name: "Page title" }));
  });

  it("returns main when it has no h1", () => {
    render(
      <main>
        <h2>Section</h2>
      </main>,
    );

    expect(pageFocusTarget()).toBe(screen.getByRole("main"));
  });

  it("returns null with no main", () => {
    render(<h1>No main</h1>);

    expect(pageFocusTarget()).toBeNull();
  });

  it("searches the main it is given", () => {
    render(
      <>
        <main>
          <h1>First</h1>
        </main>
        <section data-testid="other">
          <h1>Second</h1>
        </section>
      </>,
    );

    expect(pageFocusTarget(screen.getByTestId("other"))).toBe(
      screen.getByRole("heading", { name: "Second" }),
    );
  });
});

describe("focusWithoutScroll", () => {
  it("makes a heading focusable from script only, and focuses it", () => {
    render(<h1>Title</h1>);
    const heading = screen.getByRole("heading");

    focusWithoutScroll(heading);

    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(heading).toHaveFocus();
  });

  it("keeps an element's own tabindex", () => {
    render(<main>Content</main>);
    const main = screen.getByRole("main");
    main.setAttribute("tabindex", "0");

    focusWithoutScroll(main);

    expect(main).toHaveAttribute("tabindex", "0");
    expect(main).toHaveFocus();
  });

  it("leaves a control in the tab order", () => {
    render(<button type="button">Save</button>);
    const button = screen.getByRole("button");

    focusWithoutScroll(button);

    expect(button).not.toHaveAttribute("tabindex");
    expect(button).toHaveFocus();
  });

  it("asks the browser not to scroll", () => {
    render(<h1>Title</h1>);
    const heading = screen.getByRole("heading");
    const focus = vi.spyOn(heading, "focus");

    focusWithoutScroll(heading);

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("does nothing with no element", () => {
    expect(() => {
      focusWithoutScroll(null);
    }).not.toThrow();
  });
});
