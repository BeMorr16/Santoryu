import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { homeContent, principles } from "../content/home.ts";
import { PrinciplesSection } from "./PrinciplesSection.tsx";

const focusable = "a[href], button, input, select, textarea, [tabindex]";

function renderSection() {
  render(<PrinciplesSection />);
  return screen.getByRole("region", { name: homeContent.principlesHeading });
}

describe("PrinciplesSection (home R4)", () => {
  it("lists the three principles in order, one h3 each (R4.1, R4.2)", () => {
    const section = renderSection();

    expect(within(within(section).getByRole("list")).getAllByRole("listitem")).toHaveLength(3);
    expect(
      within(section)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["Bias for action", "Ownership", "Have opinions, hold them loosely"]);
  });

  it("shows each description, then an In practice label, then the example (R4.3, R4.4)", () => {
    const section = renderSection();

    const items = within(section).getAllByRole("listitem");
    for (const [index, principle] of principles.entries()) {
      const item = items[index];
      if (!item) throw new Error(`missing item ${String(index)}`);
      const description = within(item).getByText(principle.description);
      expect(description.tagName).toBe("P");
      const label = within(item).getByText("In practice");
      const example = within(item).getByText(principle.example);
      expect(description.compareDocumentPosition(label)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(label.nextElementSibling).toBe(example);
      expect(example.tagName).toBe("P");
    }
  });

  it("has nothing focusable (R4.5)", () => {
    const section = renderSection();

    expect(within(section).queryAllByRole("link")).toEqual([]);
    expect(section.querySelectorAll(focusable)).toHaveLength(0);
  });
});
