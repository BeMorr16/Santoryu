import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import hiddenStyles from "../../components/VisuallyHidden/VisuallyHidden.module.css";
import { semanticTokens } from "../../tokens/metadata.ts";
import { categoryLabels, referenceGroups, referenceTokens, rowGroups } from "./groups.ts";
import { referenceIndex } from "./reference-state.ts";
import { matchRows } from "./search.ts";
import { settleMs } from "./TokenSearch.tsx";
import { tokenRowId } from "./reference-ids.ts";
import { tierRules } from "./stats.ts";
import { TokenLink } from "./TokenLink.tsx";
import { TokenReference } from "./TokenReference.tsx";

function renderReference() {
  return render(
    <MemoryRouter>
      <TokenReference>
        <TokenLink token="color.text.muted" />
      </TokenReference>
    </MemoryRouter>,
  );
}

const tiers = [
  ["Primitives", "primitive"],
  ["Semantic", "semantic"],
  ["Component", "component"],
] as const;

/** The section under a tier's h2. */
function tierSection(title: string) {
  const section = screen.getByRole("heading", { level: 2, name: title }).parentElement;
  if (!section) throw new Error(`No section for ${title}`);
  return section;
}

describe("TokenReference (ds-tokens R4)", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  });

  it("renders the search's h2, then the Primitives, Semantic and Component h2s, each with its rule (R4.1)", () => {
    renderReference();

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => [h.id, h.textContent])).toEqual([
      ["find-a-token", "Find a token"],
      ["primitives", "Primitives"],
      ["semantic", "Semantic"],
      ["component", "Component"],
    ]);
    for (const [title, tier] of tiers) {
      expect(within(tierSection(title)).getByText(tierRules[tier])).toBeInTheDocument();
    }
  });

  it("has one closed h3 item per non-empty category, in order, named with its count (R4.2–R4.4)", () => {
    renderReference();

    for (const [title, tier] of tiers) {
      const items = within(tierSection(title)).getAllByRole("heading", { level: 3 });
      expect(items.map((item) => item.textContent.replace(/\s+/g, " "))).toEqual(
        referenceGroups[tier].map(
          (group) => `${categoryLabels[group.category]}, ${String(group.tokens.length)} tokens`,
        ),
      );
      for (const button of within(tierSection(title)).getAllByRole("button", { expanded: false })) {
        expect(button).toHaveAttribute("aria-expanded", "false");
      }
      expect(within(tierSection(title)).queryAllByRole("button", { expanded: true })).toEqual([]);
    }
    const color = referenceGroups.semantic.find((group) => group.category === "color");
    expect(
      screen.getByRole("button", { name: `Color, ${String(color?.tokens.length)} tokens` }),
    ).toBeInTheDocument();
  });

  it("lists every token exactly once, by row id (R4.6)", () => {
    const { container } = renderReference();

    const rowIds = [...container.querySelectorAll("tr[id], li[id]")].map((row) => row.id);
    expect(rowIds.toSorted()).toEqual(
      referenceTokens.map((token) => tokenRowId(token.name)).toSorted(),
    );
    expect(new Set(rowIds).size).toBe(rowIds.length);
  });

  it("hides every table caption, since each group's heading names it (refinement R16.11)", () => {
    const { container } = renderReference();

    const captions = [...container.querySelectorAll("caption")];
    expect(captions.length).toBeGreaterThan(0);
    for (const caption of captions) expect(caption).toHaveClass(hiddenStyles.root ?? "");
  });

  it("opens a closed group when a link to one of its rows is followed (R7.1)", async () => {
    const user = userEvent.setup();
    renderReference();
    const semantic = tierSection("Semantic");
    const color = within(semantic).getByRole("button", { name: /^Color,/ });

    await user.click(screen.getAllByRole("link", { name: "color.text.muted" })[0] as HTMLElement);

    expect(color).toHaveAttribute("aria-expanded", "true");
    expect(within(semantic).getAllByRole("button", { expanded: true })).toEqual([color]);
    expect(document.getElementById("color-text-muted")).toBeVisible();
  });

  it("opens and closes groups independently", async () => {
    const user = userEvent.setup();
    renderReference();
    const [first, second] = within(tierSection("Primitives")).getAllByRole("button", {
      expanded: false,
    });
    if (!first || !second) throw new Error("expected two groups");

    await user.click(first);
    await user.click(second);
    await user.click(first);

    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "true");
  });

  it("has no axe violations with every group open", { timeout: 60_000 }, async () => {
    const user = userEvent.setup();
    const { container } = renderReference();

    for (const button of screen.getAllByRole("button", { expanded: false }))
      await user.click(button);

    await expectNoAxeViolations(container);
  });

  describe("search (ds-tokens R11)", () => {
    const searchbox = () => screen.getByRole("searchbox", { name: "Search tokens" });
    const search = (query: string) => {
      fireEvent.change(searchbox(), { target: { value: query } });
    };
    const rowsShown = () =>
      [...document.querySelectorAll("tr[id], li[id]")]
        .filter((row) => !row.closest("[hidden]"))
        .map((row) => row.id);
    const matchesOf = (query: string) => matchRows(referenceIndex, query) ?? new Set<string>();

    it("sits in a search landmark named by its h2, before the tiers (R11.1)", () => {
      renderReference();

      // Testing Library's role table predates <search>, so it's found by tag; browsers map it to
      // the search role, which the e2e test checks.
      const landmark = searchbox().closest("search");
      if (!landmark) throw new Error("No search element");
      const heading = screen.getByRole("heading", { level: 2, name: "Find a token" });
      expect(landmark).toHaveAttribute("aria-labelledby", heading.id);
      expect(landmark).toContainElement(heading);
      expect(within(landmark).getByRole("searchbox", { name: "Search tokens" })).toBeVisible();
      expect(
        landmark.compareDocumentPosition(screen.getByRole("heading", { name: "Primitives" })) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("is hidden until scripts run, since it would do nothing without them (R11.9)", () => {
      const css = readFileSync(join(import.meta.dirname, "TokenSearch.module.css"), "utf8");

      expect(css).toMatch(/:global\(:root:not\(\[data-js\]\)\) \.search \{\s*display: none;/);
    });

    it("hides rows and ramp swatches that don't match (R11.3)", () => {
      renderReference();

      search("gold 700");

      expect(rowsShown().toSorted()).toEqual([...matchesOf("gold 700")].toSorted());
      expect(rowsShown()).toContain("color-gold-700");
      expect(document.getElementById("color-gold-600")?.closest("[hidden]")).not.toBeNull();
    });

    it(
      "opens the groups with matches, counting n of m, and hides the rest (R11.3, R11.6)",
      { timeout: 10000 },
      () => {
        renderReference();
        const query = "--color-text-muted";
        const matches = matchesOf(query);
        const groups = new Set([...matches].map((row) => rowGroups.get(row)));

        search(query);

        for (const group of [
          ...referenceGroups.primitive,
          ...referenceGroups.semantic,
          ...referenceGroups.component,
        ]) {
          const label = categoryLabels[group.category];
          const shown = group.tokens.filter((token) => matches.has(tokenRowId(token.name))).length;
          const section = tierSection(
            { primitive: "Primitives", semantic: "Semantic", component: "Component" }[group.tier],
          );
          const button = within(section).queryByRole("button", { name: new RegExp(`^${label},`) });
          if (!groups.has(group.id)) {
            expect(button, group.id).toBeNull();
            continue;
          }
          expect(button).toHaveAttribute("aria-expanded", "true");
          expect(button).toHaveAccessibleName(
            `${label}, ${String(shown)} of ${String(group.tokens.length)} tokens`,
          );
        }
      },
    );

    it("notes a tier with no matches, keeping its h2 (R11.3)", () => {
      renderReference();

      search("--color-text-muted");

      expect(screen.getByRole("heading", { level: 2, name: "Primitives" })).toBeVisible();
      expect(within(tierSection("Primitives")).getByText("No matches in this tier.")).toBeVisible();
      expect(within(tierSection("Semantic")).queryByText("No matches in this tier.")).toBeNull();
    });

    it("announces the count once typing settles, and the empty state (R11.4)", () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        renderReference();
        const status = screen.getByRole("status");

        search("muted");
        act(() => {
          vi.advanceTimersByTime(settleMs - 1);
        });
        expect(status).toBeEmptyDOMElement();
        act(() => {
          vi.advanceTimersByTime(1);
        });
        expect(status).toHaveTextContent(`${String(matchesOf("muted").size)} tokens match`);

        search("zzz");
        act(() => {
          vi.advanceTimersByTime(settleMs);
        });
        expect(status).toHaveTextContent("No tokens match “zzz”");
      } finally {
        vi.useRealTimers();
      }
    });

    it("shows every token and closes every group when the query empties (R11.5)", async () => {
      const user = userEvent.setup();
      renderReference();
      search("muted");

      await user.click(screen.getByRole("button", { name: "Clear Search tokens" }));

      expect(searchbox()).toHaveValue("");
      expect(searchbox()).toHaveFocus();
      expect(screen.queryAllByRole("button", { expanded: true })).toEqual([]);
      expect(document.querySelectorAll("tr[id][hidden], li[id][hidden]")).toHaveLength(0);
    });

    it("honors a group toggled between query changes (R11.6)", async () => {
      const user = userEvent.setup();
      renderReference();
      search("--color-text-muted");
      const color = within(tierSection("Semantic")).getByRole("button", { name: /^Color,/ });

      await user.click(color);

      expect(color).toHaveAttribute("aria-expanded", "false");
    });

    it("clears a query hiding a linked row, then opens its group (R11.8)", async () => {
      const user = userEvent.setup();
      renderReference();
      search("radius control");
      expect(document.getElementById("color-text-muted")?.closest("[hidden]")).not.toBeNull();

      await user.click(screen.getAllByRole("link", { name: "color.text.muted" })[0] as HTMLElement);

      expect(searchbox()).toHaveValue("");
      expect(document.getElementById("color-text-muted")).toBeVisible();
      expect(
        within(tierSection("Semantic")).getByRole("button", { name: /^Color,/ }),
      ).toHaveAttribute("aria-expanded", "true");
    });

    it("keeps the group holding the link open, and focus on the link, when it clears the query", async () => {
      const user = userEvent.setup();
      renderReference();
      search("--color-text-muted");
      const row = document.getElementById("color-text-muted");
      if (!row) throw new Error("No row");
      const muted = semanticTokens.find((token) => token.name === "color.text.muted");
      if (!muted?.themed) throw new Error("color.text.muted is themed");
      const link = within(row).getAllByRole("link", {
        name: muted.values.light.ref,
      })[0] as HTMLElement;

      await user.click(link);

      expect(searchbox()).toHaveValue("");
      expect(link).toHaveFocus();
      expect(
        within(tierSection("Semantic")).getByRole("button", { name: /^Color,/ }),
      ).toHaveAttribute("aria-expanded", "true");
      expect(document.getElementById(tokenRowId(muted.values.light.ref))).toBeVisible();
    });
  });
});
