import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import typographyStyles from "../../../components/Typography/Typography.module.css";
import showcaseStyles from "../Showcase.module.css";
import badgeStyles from "../../../components/Badge/Badge.module.css";
import {
  accordionKeyboard,
  customAccordionCss,
  findCaption,
  findWord,
  richHeadingAnnounced,
} from "./accordion.tsx";
import {
  describeComponentPage,
  exampleTitle,
  expectCustomCss,
  renderComponentPage,
  showcases,
} from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/accordion.tsx";

const renderPage = () => renderComponentPage(route, "accordion");

describeComponentPage(route, "accordion");

describe("Accordion page examples", () => {
  it("shows the Accordion examples, its props, keyboard rows, notes and the customized CSS it applies (refinement R13.13)", async () => {
    const user = userEvent.setup();
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => within(section).getByRole("group", { name: title });
    const buttons = (title: string) =>
      within(example(title))
        .getAllByRole("button")
        .filter((button) => button.hasAttribute("aria-expanded"));

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "Independent items",
      "Exclusive",
      "Controlled",
      "Rich heading",
      "Find in page",
      "Regions",
      "Heading look",
      "Customized with component tokens",
    ]);

    const questions = ["What is this site?", "How is it built?", "Can I reuse the components?"];
    for (const title of ["Independent items", "Exclusive", "Heading look"]) {
      expect(buttons(title).map((button) => button.textContent)).toEqual(questions);
      for (const button of buttons(title)) {
        expect(button.closest("h4")).not.toBeNull();
      }
    }
    expect(buttons("Independent items").map((b) => b.getAttribute("aria-expanded"))).toEqual([
      "true",
      "false",
      "false",
    ]);
    for (const heading of within(example("Heading look")).getAllByRole("heading", { level: 4 })) {
      expect(heading).toHaveClass(typographyStyles.body ?? "");
    }

    const [first, second] = buttons("Exclusive");
    if (!first || !second) throw new Error("Missing exclusive items");
    await user.click(first);
    await user.click(second);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "true");

    const controlled = example("Controlled");
    expect(within(controlled).getByText("The item is closed.")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    await user.click(within(controlled).getByRole("button", { name: "Open" }));
    expect(within(controlled).getByRole("button", { name: "Shipping details" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(within(controlled).getByText("The item is open.")).toBeInTheDocument();
    await user.click(within(controlled).getByRole("button", { name: "Shipping details" }));
    expect(within(controlled).getByRole("button", { name: "Open" })).toBeInTheDocument();

    const rich = example("Rich heading");
    const collapsed = richHeadingAnnounced(false);
    const richButton = within(rich).getByRole("button", { name: collapsed.name });
    expect(richButton.closest("h4")).not.toBeNull();
    expect(within(richButton).getByText("Live")).toHaveClass(badgeStyles.success ?? "");
    expect(rich).toHaveTextContent(`Announced as: “${collapsed.name}, ${collapsed.role}”`);
    await user.click(richButton);
    const expanded = richHeadingAnnounced(true);
    expect(expanded.role).toBe("heading level 4, button, expanded");
    expect(rich).toHaveTextContent(`Announced as: “${expanded.name}, ${expanded.role}”`);

    const find = example("Find in page");
    expect(within(find).getByText(findCaption).tagName).toBe("P");
    expect(findCaption).not.toContain(findWord);
    const word = section.querySelector("#accordion-find-word");
    expect(word).toHaveTextContent(findWord);
    expect(word?.closest("[hidden]")).toHaveAttribute("hidden", "until-found");
    // The answer appears once on the whole page, so find-in-page's first match is the hidden one.
    const pageText = document.body.textContent;
    expect(pageText.toLowerCase().split(findWord).length - 1).toBe(1);

    for (const button of buttons("Regions")) await user.click(button);
    expect(
      within(example("Regions"))
        .getAllByRole("region")
        .map((r) => r.id),
    ).toHaveLength(2);
    expect(within(example("Regions")).getByRole("region", { name: "Delivery" })).toBeVisible();

    const custom = example("Customized with component tokens");
    expect(custom.querySelector(`.${showcaseStyles.customAccordion ?? ""}`)).not.toBeNull();
    expect([...custom.querySelectorAll("pre code")].map((code) => code.textContent)).toEqual([
      customAccordionCss,
    ]);
    expect(readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8")).toContain(
      customAccordionCss,
    );

    const accordion = showcases.find((s) => s.id === "accordion");
    expect(accordion?.props.map(({ part, docs }) => [part, Object.keys(docs)])).toEqual([
      ["Accordion", ["headingLevel", "headingVariant", "exclusive", "region"]],
      ["AccordionItem", ["heading", "open", "defaultOpen", "onOpenChange"]],
    ]);
    expect(accordion?.propsNote).toMatch(
      /heading must not hold links or buttons.+works alone.+exclusive, items opened together on first render stay open.+region only for six or fewer panels/,
    );
    expect(accordion?.keyboard).toEqual(accordionKeyboard);
    expect(accordionKeyboard.map((row) => row.keys)).toEqual([
      "Tab / Shift+Tab",
      "Enter / Space",
      "Arrow keys",
    ]);
    for (const note of [
      /headings stay in the page outline: choose headingLevel/,
      /announces whether it's expanded/,
      /out of the Tab order and the accessibility tree, yet find-in-page and links/,
      /No arrow keys move between headings/,
      /More than about six regions clutter the landmarks list/,
      /chevron animate over component.accordion.transition-duration, 0ms under reduced motion/,
      /In forced colors/,
    ]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }
  });

  it("shows Accordion's customized CSS in a CodeBlock labelled CSS, as Showcase.module.css applies it (refinement R15.11)", async () => {
    const { page } = await renderPage();

    expectCustomCss(
      page,
      customAccordionCss,
      readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8"),
    );
  });
});
