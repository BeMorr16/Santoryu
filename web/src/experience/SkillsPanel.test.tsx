import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../test/axe.ts";
import {
  experienceContent,
  positions,
  skillCategories,
  skills,
  type SkillId,
} from "../content/experience.ts";
import {
  categorySkills,
  countHighlights,
  emptySelection,
  usedSkillIds,
  type Selection,
} from "./model.ts";
import { SkillsPanel } from "./SkillsPanel.tsx";

const used = usedSkillIds(positions);
const frontend = categorySkills("frontend", used);
const { total } = countHighlights(positions, emptySelection);

/** The panel under page-like state, recording every selection it reports. */
function Harness({ onChange }: { onChange: (selection: Selection) => void }) {
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const { shown } = countHighlights(positions, selection);
  return (
    <SkillsPanel
      selection={selection}
      onSelectionChange={(next) => {
        onChange(next);
        setSelection(next);
      }}
      shown={shown}
      total={total}
    />
  );
}

function renderPanel() {
  const onChange = vi.fn<(selection: Selection) => void>();
  const user = userEvent.setup();
  const { container } = render(<Harness onChange={onChange} />);
  const panel = screen.getByRole("region", { name: experienceContent.skillsHeading });
  const lastSelection = () => [...(onChange.mock.lastCall?.[0] ?? [])];
  return { user, panel, container, onChange, lastSelection };
}

const skillToggle = (name: string) => screen.getByRole("button", { name });
const categoryToggle = (category: (typeof skillCategories)[number]) => {
  const heading = screen.getByRole("heading", {
    level: 3,
    name: experienceContent.categories[category],
  });
  return within(heading).getByRole("button");
};
const search = () => screen.getByRole("searchbox", { name: experienceContent.searchLabel });
const clear = () => screen.getByRole("button", { name: experienceContent.clearLabel });
const liveRegion = (panel: HTMLElement) => panel.querySelector("[aria-live]");

/** Each node comes before the next in document order. */
function expectInOrder(nodes: (Node | null)[]) {
  for (let index = 1; index < nodes.length; index++) {
    const before = nodes[index - 1];
    const after = nodes[index];
    if (!before || !after) throw new Error(`node ${String(index)} is missing`);
    expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
}

describe("SkillsPanel order (resume R3.3, R6.1, R6.5)", () => {
  it("shows the h2, hint, count, Clear, the disclosure toggle, search, then the categories", () => {
    const { panel } = renderPanel();

    expectInOrder([
      within(panel).getByRole("heading", { level: 2, name: experienceContent.skillsHeading }),
      within(panel).getByText(experienceContent.skillsHint),
      liveRegion(panel),
      clear(),
      screen.getByRole("button", { name: experienceContent.disclosureLabel }),
      search(),
      ...within(panel).getAllByRole("heading", { level: 3 }),
    ]);
  });

  it("shows the six categories in order", () => {
    const { panel } = renderPanel();

    expect(
      within(panel)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(skillCategories.map((category) => experienceContent.categories[category]));
  });
});

describe("skill toggles (resume R6.2, R7.2, R12.3)", () => {
  it("names every used skill's toggle by its label, and nothing else", () => {
    renderPanel();

    for (const skill of skills) {
      if (used.has(skill.id)) {
        expect(skillToggle(skill.label)).toHaveAccessibleName(skill.label);
      } else {
        expect(screen.queryByRole("button", { name: skill.label })).toBeNull();
      }
    }
  });

  it("adds a skill when pressed, then removes it, following aria-pressed", async () => {
    const { user, lastSelection } = renderPanel();

    const react = skillToggle("React");
    expect(react).toHaveAttribute("aria-pressed", "false");
    await user.click(react);
    expect(lastSelection()).toEqual(["react"]);
    expect(react).toHaveAttribute("aria-pressed", "true");
    await user.click(react);
    expect(lastSelection()).toEqual([]);
    expect(react).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps focus on the pressed toggle (R7.11)", async () => {
    const { user } = renderPanel();

    await user.click(skillToggle("React"));
    expect(skillToggle("React")).toHaveFocus();
    await user.click(categoryToggle("frontend"));
    expect(categoryToggle("frontend")).toHaveFocus();
  });
});

describe("category toggles (resume R7.4, R7.5)", () => {
  it("is an h3 wrapping a button named by the category", () => {
    renderPanel();

    for (const category of skillCategories) {
      expect(categoryToggle(category)).toHaveAccessibleName(experienceContent.categories[category]);
    }
  });

  it("selects all its used skills, then clears them all", async () => {
    const { user, lastSelection } = renderPanel();

    const toggle = categoryToggle("frontend");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(lastSelection()).toEqual(frontend.used.map((skill) => skill.id));
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await user.click(toggle);
    expect(lastSelection()).toEqual([]);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("is not pressed while partial, and describes itself with “n of m selected”", async () => {
    const { user, lastSelection } = renderPanel();

    const toggle = categoryToggle("frontend");
    const partial = experienceContent.categoryCount(1, frontend.used.length);
    expect(screen.queryByText(partial)).toBeNull();
    expect(toggle).not.toHaveAttribute("aria-describedby");

    await user.click(skillToggle("React"));
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(partial)).toBeVisible();
    expect(toggle).toHaveAccessibleDescription(partial);

    await user.click(toggle);
    expect(lastSelection()).toEqual(frontend.used.map((skill) => skill.id));
    expect(screen.queryByText(partial)).toBeNull();
    expect(toggle).not.toHaveAttribute("aria-describedby");
  });
});

describe("also worked with (resume R6.2)", () => {
  it("lists each category's unused skills as plain text after the label, and no label without any", () => {
    const { panel } = renderPanel();

    for (const category of skillCategories) {
      const group = within(panel).getByRole("group", {
        name: experienceContent.categories[category],
      });
      const other = categorySkills(category, used).other.map((skill) => skill.label);
      if (other.length === 0) {
        expect(
          within(group).queryByText(new RegExp(experienceContent.alsoLabel)),
          category,
        ).toBeNull();
        continue;
      }
      expect(
        within(group).getByText(`${experienceContent.alsoLabel}: ${other.join(", ")}`),
      ).toBeVisible();
      for (const label of other) {
        expect(within(group).queryByRole("button", { name: label })).toBeNull();
      }
    }
  });

  it("shows no label for a category with no unused skills to show", async () => {
    const { user, panel } = renderPanel();

    await user.type(search(), "TypeScript");
    const languages = within(panel).getByRole("group", {
      name: experienceContent.categories.languages,
    });
    expect(within(languages).queryByText(new RegExp(experienceContent.alsoLabel))).toBeNull();
  });
});

describe("live count (resume R7.7)", () => {
  it("is a polite, atomic region that reads the new count after a change", async () => {
    const { user, panel } = renderPanel();

    const region = liveRegion(panel);
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
    expect(region).toHaveTextContent(`Showing all ${String(total)} highlights`);

    await user.click(skillToggle("Python"));
    const { shown } = countHighlights(positions, new Set<SkillId>(["python"]));
    expect(shown).toBeLessThan(total);
    expect(region).toHaveTextContent(`Showing ${String(shown)} of ${String(total)} highlights`);
  });
});

describe("Clear (resume R7.8)", () => {
  it("is disabled but focusable while nothing is selected", async () => {
    const { user, onChange } = renderPanel();

    expect(clear()).toHaveAttribute("aria-disabled", "true");
    await user.click(clear());
    expect(onChange).not.toHaveBeenCalled();
    clear().focus();
    expect(clear()).toHaveFocus();
  });

  it("empties the selection and moves focus to the search field", async () => {
    const { user, lastSelection } = renderPanel();

    await user.click(skillToggle("React"));
    expect(clear()).not.toHaveAttribute("aria-disabled");
    await user.click(clear());
    expect(lastSelection()).toEqual([]);
    expect(search()).toHaveFocus();
    expect(clear()).toHaveAttribute("aria-disabled", "true");
  });
});

describe("search (resume R8)", () => {
  it("narrows the skills by label and by alias", async () => {
    const { user } = renderPanel();

    await user.type(search(), "a11y");
    expect(skillToggle("Accessibility")).toBeVisible();
    expect(screen.queryByRole("button", { name: "React" })).toBeNull();

    await user.clear(search());
    await user.type(search(), "  REACT ");
    expect(skillToggle("React")).toBeVisible();
    expect(skillToggle("React Native")).toBeVisible();
    expect(screen.queryByRole("button", { name: "TypeScript" })).toBeNull();
  });

  it("hides a category whose skills are all hidden", async () => {
    const { user, panel } = renderPanel();

    await user.type(search(), "a11y");
    expect(
      within(panel)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual([experienceContent.categories.frontend]);
  });

  it("says so when nothing matches", async () => {
    const { user, panel } = renderPanel();

    await user.type(search(), "zzz");
    expect(screen.getByText(experienceContent.noSkillsMatch("zzz"))).toBeVisible();
    expect(within(panel).queryAllByRole("heading", { level: 3 })).toEqual([]);
  });

  it("never changes the selection, and hidden selected skills stay selected", async () => {
    const { user, panel, onChange } = renderPanel();

    await user.click(skillToggle("Python"));
    onChange.mockClear();
    await user.type(search(), "react");
    expect(onChange).not.toHaveBeenCalled();
    expect(liveRegion(panel)).not.toHaveTextContent(`Showing all`);
  });

  it("keeps a category toggle acting on the skills the search hides", async () => {
    const { user, lastSelection } = renderPanel();

    await user.type(search(), "a11y");
    expect(categoryToggle("frontend")).toHaveAccessibleName(experienceContent.categories.frontend);
    await user.click(categoryToggle("frontend"));
    expect(lastSelection()).toEqual(frontend.used.map((skill) => skill.id));
  });

  it("shows every skill again when its clear button is pressed", async () => {
    const { user, panel } = renderPanel();

    await user.type(search(), "zzz");
    await user.click(
      screen.getByRole("button", { name: `Clear ${experienceContent.searchLabel}` }),
    );
    expect(search()).toHaveValue("");
    expect(within(panel).getAllByRole("heading", { level: 3 })).toHaveLength(
      skillCategories.length,
    );
  });
});

describe("Filter by skill disclosure (resume R3.3)", () => {
  it("toggles aria-expanded and controls the search and categories", async () => {
    const { user } = renderPanel();

    const toggle = screen.getByRole("button", { name: experienceContent.disclosureLabel });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const body = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(body).toContainElement(search());
    expect(body).toContainElement(categoryToggle("languages"));
    expect(body).not.toContainElement(clear());

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});

describe("accessibility", () => {
  it("has no axe violations, with and without a selection", async () => {
    const { user, container } = renderPanel();

    await expectNoAxeViolations(container);
    await user.click(skillToggle("React"));
    await expectNoAxeViolations(container);
  });
});
