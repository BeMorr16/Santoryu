import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import buttonStyles from "../../../components/shared/button-styles.module.css";
import showcaseStyles from "../Showcase.module.css";
import { customTooltipCss, describedButton, tooltipKeyboard } from "./tooltip.tsx";
import {
  describeComponentPage,
  exampleTitle,
  expectCustomCss,
  renderComponentPage,
  showcases,
} from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/tooltip.tsx";

const renderPage = () => renderComponentPage(route, "tooltip");

describeComponentPage(route, "tooltip");

describe("Tooltip page examples", () => {
  it("shows the Tooltip examples, its props, keyboard rows, notes and the customized CSS it applies (refinement R14.14)", async () => {
    const user = userEvent.setup();
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => within(section).getByRole("group", { name: title });
    /** The tooltip popup right after a trigger. */
    const popupAfter = (trigger: HTMLElement) => {
      const popup = trigger.nextElementSibling;
      return popup instanceof HTMLSpanElement && popup.hasAttribute("popover") ? popup : null;
    };

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "Description",
      "Icon-only names",
      "Sides",
      "Disabled reason",
      "In running text",
      "Controlled",
      "Customized with component tokens",
    ]);

    const description = example("Description");
    expect(
      within(description).getByRole("button", { name: describedButton.label }),
    ).toHaveAccessibleDescription(describedButton.tooltip);
    expect(description).toHaveTextContent(
      `Announced as: “${describedButton.label}, button, ${describedButton.tooltip}”`,
    );

    const names = example("Icon-only names");
    for (const name of ["Mark as done", "Next"]) {
      expect(popupAfter(within(names).getByRole("button", { name }))).toHaveTextContent(name);
    }
    expect(popupAfter(within(names).getByRole("button", { name: "Show more" }))).toBeNull();
    expect(within(names).getByText("No tooltip on the last: nameTooltip={false}.")).toBeVisible();

    const sides = example("Sides");
    expect(
      ["Top", "Bottom", "Start", "End"].map((name) =>
        popupAfter(within(sides).getByRole("button", { name }))?.getAttribute("data-side"),
      ),
    ).toEqual(["top", "bottom", "start", "end"]);

    const disabled = example("Disabled reason");
    const publish = within(disabled).getByRole("button", { name: "Publish" });
    expect(publish).toHaveAttribute("aria-disabled", "true");
    expect(publish).toHaveClass(buttonStyles.primary ?? "");
    expect(publish).toHaveAccessibleDescription("Add a title first");
    expect(within(disabled).getByText("Press or tap it to see why it's disabled.")).toBeVisible();

    const text = example("In running text");
    const link = within(text).getByRole("link", { name: "the token gallery" });
    expect(link).toHaveAttribute("href", "/design-system/tokens");
    expect(link).toHaveAccessibleDescription("Every color, type and space token");
    expect(link.closest("p")).toContainElement(popupAfter(link));

    const controlled = example("Controlled");
    const pinned = within(controlled).getByRole("button", { name: "Pinned" });
    // A plain readout: announcing it would talk over the trigger on every focus (Tooltip review).
    expect(within(controlled).getByText("The tooltip is hidden.")).not.toHaveAttribute("aria-live");
    await user.click(within(controlled).getByRole("button", { name: "Show" }));
    expect(popupAfter(pinned)).toBeVisible();
    expect(within(controlled).getByText("The tooltip is shown.")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(popupAfter(pinned)).not.toBeVisible();
    expect(within(controlled).getByRole("button", { name: "Show" })).toBeInTheDocument();

    const custom = example("Customized with component tokens");
    expect(popupAfter(within(custom).getByRole("button", { name: "Custom" }))).toHaveClass(
      showcaseStyles.customTooltip ?? "",
    );
    expect([...custom.querySelectorAll("pre code")].map((code) => code.textContent)).toEqual([
      customTooltipCss,
    ]);
    expect(readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8")).toContain(
      customTooltipCss,
    );

    const tooltip = showcases.find((s) => s.id === "tooltip");
    expect(tooltip?.props.map(({ part, docs }) => [part, Object.keys(docs)])).toEqual([
      ["Tooltip", ["content", "kind", "side", "open", "defaultOpen", "onOpenChange"]],
    ]);
    expect(tooltip?.propsNote).toMatch(
      /one child is the trigger: a focusable element that takes a ref.+no links, buttons or other interactive content.+kind="name" only when content repeats.+className and other native props go to the tooltip popup/,
    );
    expect(tooltip?.keyboard).toEqual(tooltipKeyboard);
    expect(tooltipKeyboard.map((row) => row.keys)).toEqual(["Tab", "Escape"]);
    for (const note of [
      /role="tooltip" and becomes the trigger's accessible description.+hidden from assistive technology/,
      /in the page from the start, so the description is there before JavaScript loads/,
      /300ms hover.+Keyboard focus shows it at once.+focus from a mouse press doesn't/,
      /stays until dismissed.+never hides on a timer \(WCAG 1\.4\.13\)/,
      /focus coming back from the trigger's own menu/,
      /Around a library control, one bubble shows: the control's disabledReason while it's disabled/,
      /Touch shows no tooltips, except a disabled Button's reason/,
      /Never put essential information only in a tooltip/,
      /fades over component\.tooltip\.transition-duration, 0ms under reduced motion/,
      /In forced colors, the bubble and its arrow are outlined/,
    ]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }
  });

  it("shows Tooltip's customized CSS in a CodeBlock labelled CSS, as Showcase.module.css applies it (refinement R15.11)", async () => {
    const { page } = await renderPage();

    expectCustomCss(
      page,
      customTooltipCss,
      readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8"),
    );
  });
});
