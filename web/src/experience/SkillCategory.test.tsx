import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../test/axe.ts";
import { experienceContent, type SkillId } from "../content/experience.ts";
import { emptySelection, type ListedSkill, type Selection } from "./model.ts";
import { groupMatches, SkillCategory, type SkillGroup } from "./SkillCategory.tsx";

// Real skill ids, grouped freely: the component only reads the group it's given.
const skill = (id: SkillId, label: string): ListedSkill => ({ id, label, category: "languages" });
const group: SkillGroup = {
  category: "languages",
  used: [skill("typescript", "TypeScript"), skill("python", "Python")],
  other: [skill("cypher", "Cypher")],
};
const label = experienceContent.categories.languages;

function renderCategory(props: { group?: SkillGroup; query?: string; selection?: Selection } = {}) {
  const onSelectionChange = vi.fn<(selection: Selection) => void>();
  const { container } = render(
    <SkillCategory
      group={props.group ?? group}
      query={props.query ?? ""}
      selection={props.selection ?? emptySelection}
      onSelectionChange={onSelectionChange}
    />,
  );
  return { container, onSelectionChange, user: userEvent.setup() };
}

describe("SkillCategory (resume R6.2, R7.4–R7.6)", () => {
  it("is a group named by its h3, which wraps the category toggle", () => {
    renderCategory();

    const heading = screen.getByRole("heading", { level: 3, name: label });
    expect(within(heading).getByRole("button")).toHaveAccessibleName(label);
    expect(screen.getByRole("group", { name: label })).toContainElement(heading);
  });

  it("lists the used skills as toggles, then the others as plain text", () => {
    renderCategory();

    const toggles = within(screen.getByRole("list")).getAllByRole("button");
    expect(toggles.map((toggle) => toggle.textContent)).toEqual(["TypeScript", "Python"]);
    expect(screen.getByText(`${experienceContent.alsoLabel}: Cypher`)).toBeVisible();
  });

  it("calls back with a skill toggled, and with the whole group toggled", async () => {
    const { user, onSelectionChange } = renderCategory();

    await user.click(screen.getByRole("button", { name: "Python" }));
    expect([...(onSelectionChange.mock.lastCall?.[0] ?? [])]).toEqual(["python"]);
    await user.click(screen.getByRole("button", { name: label }));
    expect([...(onSelectionChange.mock.lastCall?.[0] ?? [])]).toEqual(["typescript", "python"]);
  });

  it("is pressed only when every used skill is selected", () => {
    renderCategory({ selection: new Set<SkillId>(["typescript", "python"]) });

    expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(/selected$/)).toBeNull();
  });

  it("shows and is described by “n of m selected” while partial", () => {
    renderCategory({ selection: new Set<SkillId>(["python", "react"]) });

    const toggle = screen.getByRole("button", { name: label });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAccessibleDescription(experienceContent.categoryCount(1, 2));
  });

  it("shows a plain heading when no skill is used (R7.6)", () => {
    renderCategory({ group: { category: "languages", used: [], other: group.other } });

    const heading = screen.getByRole("heading", { level: 3, name: label });
    expect(within(heading).queryByRole("button")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows only the skills the query matches, and no label without others (R8.1)", () => {
    renderCategory({ query: "py" });

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      label,
      "Python",
    ]);
    expect(screen.queryByText(new RegExp(experienceContent.alsoLabel))).toBeNull();
  });

  it("matches a group when any skill, used or not, matches the query (R8.2)", () => {
    expect(groupMatches(group, "cypher")).toBe(true);
    expect(groupMatches(group, "type")).toBe(true);
    expect(groupMatches(group, "zzz")).toBe(false);
  });

  it("has no axe violations", async () => {
    const { container } = renderCategory({ selection: new Set<SkillId>(["python"]) });

    await expectNoAxeViolations(container);
  });
});
