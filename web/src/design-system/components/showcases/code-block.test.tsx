import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import showcaseStyles from "../Showcase.module.css";
import codeBlockStyles from "../../../components/CodeBlock/CodeBlock.module.css";
import { basicCss, codeBlockKeyboard, customCodeBlockCss, longLines } from "./code-block.tsx";
import {
  describeComponentPage,
  exampleTitle,
  renderComponentPage,
  showcases,
} from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/code-block.tsx";

const renderPage = () => renderComponentPage(route, "code-block");

describeComponentPage(route, "code-block");

describe("CodeBlock page examples", () => {
  it("shows the CodeBlock examples, its props, keyboard rows, notes and the customized CSS it applies (refinement R15.10)", async () => {
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => within(section).getByRole("group", { name: title });
    const shown = (element: HTMLElement) =>
      [...element.querySelectorAll("pre code")].map((code) => code.textContent);
    const labelsIn = (element: HTMLElement) =>
      [...element.querySelectorAll("pre")].map(
        (pre) => pre.parentElement?.firstElementChild?.firstElementChild?.textContent,
      );

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "Basic",
      "Long lines",
      "Wrapped",
      "Without copy",
      "Without line numbers",
      "Customized with component tokens",
    ]);

    const basic = example("Basic");
    expect(shown(basic)).toEqual([basicCss]);
    expect(labelsIn(basic)).toEqual(["CSS"]);
    expect(within(basic).getByRole("button", { name: "Copy code" })).toBeInTheDocument();
    expect(basic.querySelector("code")).toHaveClass("language-css");

    const long = example("Long lines");
    expect(shown(long)).toEqual(longLines.map((line) => line.code));
    // Before it's measured, an unwrapped block is a focusable group named by its label (R15.5).
    for (const { label } of longLines) {
      expect(within(long).getByRole("group", { name: label })).toHaveAttribute("tabindex", "0");
    }
    expect(long).toHaveTextContent(`Announced as: “${longLines[0].label}, group”`);

    const wrapped = example("Wrapped");
    expect(shown(wrapped)).toEqual(longLines.map((line) => line.code));
    expect(labelsIn(wrapped)).toEqual(longLines.map((line) => line.label));
    for (const pre of wrapped.querySelectorAll("pre")) expect(pre).not.toHaveAttribute("tabindex");

    const withoutCopy = example("Without copy");
    expect(shown(withoutCopy)).toEqual([basicCss]);
    expect(within(withoutCopy).queryByRole("button")).toBeNull();

    const numbered = (element: HTMLElement) =>
      [...element.querySelectorAll("pre")].map((pre) =>
        pre.classList.contains(codeBlockStyles.numbered ?? ""),
      );
    expect(numbered(basic)).toEqual([true]);
    expect(numbered(long)).toEqual(longLines.map((line) => line.lineNumbers));
    const withoutNumbers = example("Without line numbers");
    expect(shown(withoutNumbers)).toEqual([basicCss]);
    expect(numbered(withoutNumbers)).toEqual([false]);

    const custom = example("Customized with component tokens");
    expect(custom.querySelector("pre")?.parentElement).toHaveClass(
      showcaseStyles.customCodeBlock ?? "",
    );
    expect(shown(custom)).toEqual([customCodeBlockCss]);
    expect(readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8")).toContain(
      customCodeBlockCss,
    );

    const codeBlock = showcases.find((s) => s.id === "code-block");
    expect(codeBlock?.props.map(({ part, docs }) => [part, Object.keys(docs)])).toEqual([
      ["CodeBlock", ["label", "children", "language", "wrap", "copy", "lineNumbers"]],
    ]);
    expect(codeBlock?.propsNote).toMatch(
      /children is plain text, trimmed by one line break at each end.+label holds no links or buttons.+no syntax highlighting: language only sets the code's class.+className and native props reach the root/,
    );
    expect(codeBlock?.keyboard).toEqual(codeBlockKeyboard);
    expect(codeBlockKeyboard.map((row) => row.keys)).toEqual([
      "Tab / Shift+Tab",
      "← / →",
      "Enter / Space",
    ]);
    for (const note of [
      /The label comes first in reading order.+While the code scrolls, the label also names its focusable group/,
      /focusable group named by the label.+Safari doesn't make scrolling boxes focusable.+no longer a Tab stop.+every block without wrap is one/,
      /a group, not a region, so a page of code samples doesn't fill the landmarks list/,
      /Use wrap for prose-like samples/,
      /Line numbers are decorative.+never announced, selected or copied/,
      /"Copied" through a polite status message.+for 2 seconds.+"Couldn't copy", shown beside the button as well, with a warning icon/,
      /Every copy button is named "Copy code"/,
      /In forced colors, the border, the header line and the focus ring/,
    ]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }
  });
});
