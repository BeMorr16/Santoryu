import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import hiddenStyles from "../../../components/VisuallyHidden/VisuallyHidden.module.css";
import showcaseStyles from "../Showcase.module.css";
import { announced } from "./visually-hidden.tsx";
import { describeComponentPage, renderComponentPage } from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/visually-hidden.tsx";

const renderPage = () => renderComponentPage(route, "visually-hidden");

describeComponentPage(route, "visually-hidden");

describe("VisuallyHidden page examples", () => {
  it("captions each VisuallyHidden example with the role and name it announces (refinement R2.8, R2.9)", async () => {
    await renderPage();
    const section = screen.getByRole("main");

    const queries = {
      button: ["button", {}],
      link: ["link", {}],
      "heading level 4": ["heading", { level: 4 }],
      "search field": ["searchbox", {}],
    } as const;
    for (const { name, role } of Object.values(announced)) {
      const [ariaRole, options] = queries[role];
      expect(within(section).getByRole(ariaRole, { ...options, name })).toBeInTheDocument();
      expect(within(section).getByText(`Announced as: “${name}, ${role}”`)).toBeInTheDocument();
    }
  });

  it("toggles the VisuallyHidden examples' hidden content with a pressed button (refinement R2.10)", async () => {
    const user = userEvent.setup();
    await renderPage();
    const section = screen.getByRole("main");
    const panel = within(section).getByRole("group", { name: "VisuallyHidden examples" });
    const examples = () =>
      [...panel.querySelectorAll(`.${hiddenStyles.root ?? ""}`)].filter(
        // The panel's own theme trigger keeps its hidden "(VisuallyHidden preview)".
        (element) => element.closest("[aria-haspopup]") === null,
      );
    const toggle = within(panel).getByRole("button", { name: "Show hidden content" });
    // CSS only (ds-components design §3.2): the page reveals .revealable text while it has the
    // pressed toggle. jsdom applies no module CSS, so this checks the selector against the DOM,
    // and that the stylesheet reveals with exactly that selector.
    const revealed = `:has(.${showcaseStyles.revealToggle ?? ""}[aria-pressed="true"]) .${showcaseStyles.revealable ?? ""}`;
    const css = readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8");
    expect(css).toContain(
      ':has(.revealToggle[aria-pressed="true"]) .revealable.revealable {\n  position: static;',
    );

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(examples()).toHaveLength(Object.keys(announced).length);
    for (const element of examples()) {
      expect(element).toHaveClass(showcaseStyles.revealable ?? "");
      expect(element.matches(revealed)).toBe(false);
    }

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    for (const element of examples()) {
      expect(element.matches(revealed)).toBe(true);
    }

    await user.keyboard(" ");

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    for (const element of examples()) {
      expect(element.matches(revealed)).toBe(false);
    }
  });
});
