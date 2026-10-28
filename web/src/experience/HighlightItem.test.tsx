import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../test/axe.ts";
import badgeStyles from "../components/Badge/Badge.module.css";
import type { Highlight, SkillId } from "../content/experience.ts";
import { HighlightItem } from "./HighlightItem.tsx";
import { emptySelection, type Selection } from "./model.ts";

const focusable = "a[href], button, input, select, textarea, [tabindex]";

// Neutral made-up content, tagged with real skill ids so the labels come from the skill list.
const highlight: Highlight = {
  id: "sample",
  title: "Sample project",
  summary: "Built a sample project.",
  details: ["Wrote the first part.", "Wrote the second part."],
  skills: ["typescript", "react", "css"],
};

function renderItem(selection: Selection = emptySelection) {
  render(
    <ul>
      <HighlightItem highlight={highlight} selection={selection} />
    </ul>,
  );
  return screen.getByRole("heading", { level: 4 }).closest("li") as HTMLElement;
}

const tagList = (item: HTMLElement) => within(item).getByRole("list", { name: "Skills" });

describe("HighlightItem (resume R4.5, R5)", () => {
  it("shows the h4, the summary, then the details as list items (R4.5)", () => {
    const item = renderItem();

    expect(within(item).getByRole("heading", { level: 4 })).toHaveTextContent("Sample project");
    expect(within(item).getByText(highlight.summary)).toBeVisible();
    const details = within(item).getAllByRole("list")[0] as HTMLElement;
    expect(
      within(details)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(highlight.details);
  });

  it("lists the skills as tags named Skills, in authored order, with nothing focusable (R5.1–R5.3)", () => {
    const item = renderItem();

    const tags = within(tagList(item)).getAllByRole("listitem");
    expect(tags.map((tag) => tag.textContent)).toEqual(["TypeScript", "React", "CSS"]);
    expect(item.querySelectorAll(focusable)).toHaveLength(0);
  });

  it("shows every tag as neutral while nothing is selected", () => {
    const item = renderItem();

    for (const tag of within(tagList(item)).getAllByRole("listitem")) {
      expect(tag).toHaveClass(badgeStyles.neutral ?? "");
      expect(tag.querySelector("svg")).toBeNull();
    }
  });

  it("marks a selected skill's tag with the accent variant, a hidden check and spoken text (R5.4)", () => {
    const item = renderItem(new Set<SkillId>(["react"]));

    const [typescript, react, css] = within(tagList(item)).getAllByRole("listitem");
    expect(react).toHaveClass(badgeStyles.accent ?? "");
    expect(react?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(react).toHaveTextContent("React, selected");
    expect(typescript).toHaveClass(badgeStyles.neutral ?? "");
    expect(typescript).toHaveTextContent(/^TypeScript$/);
    expect(css).toHaveClass(badgeStyles.neutral ?? "");
  });

  it("has no axe violations, with and without a selection", async () => {
    const { container, rerender } = render(
      <ul>
        <HighlightItem highlight={highlight} selection={emptySelection} />
      </ul>,
    );
    await expectNoAxeViolations(container);
    rerender(
      <ul>
        <HighlightItem highlight={highlight} selection={new Set<SkillId>(["react"])} />
      </ul>,
    );
    await expectNoAxeViolations(container);
  });
});
