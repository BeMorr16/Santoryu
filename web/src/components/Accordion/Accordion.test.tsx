import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import typography from "../Typography/Typography.module.css";
import { Accordion, AccordionItem } from "./Accordion.tsx";

function panelOf(button: HTMLElement) {
  const id = button.getAttribute("aria-controls");
  const panel = id === null ? null : document.getElementById(id);
  if (!panel) throw new Error("No panel for this button");
  return panel;
}

function Fixture({ exclusive = false }: { exclusive?: boolean }) {
  return (
    <Accordion exclusive={exclusive}>
      <AccordionItem heading="One">First panel</AccordionItem>
      <AccordionItem heading="Two">Second panel</AccordionItem>
      <AccordionItem heading="Three">Third panel</AccordionItem>
    </Accordion>
  );
}

describe("Accordion", () => {
  it("renders an h3 holding a collapsed button that controls a hidden panel (refinement R13.2)", () => {
    render(<Fixture />);

    const heading = screen.getByRole("heading", { level: 3, name: "One" });
    const button = screen.getByRole("button", { name: "One", expanded: false });
    expect(heading).toContainElement(button);
    expect(button).toHaveAttribute("type", "button");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    const panel = panelOf(button);
    expect(panel.tagName).toBe("DIV");
    expect(panel).not.toBeVisible();
    expect(panel).not.toHaveAttribute("role");
    expect(screen.queryByText("First panel")).not.toBeVisible();
  });

  it("gives closed panels hidden=until-found after mount (refinement R13.7)", () => {
    render(<Fixture />);

    for (const button of screen.getAllByRole("button")) {
      expect(panelOf(button)).toHaveAttribute("hidden", "until-found");
    }
  });

  it("prerenders closed panels with plain hidden, and hydrates without a mismatch (refinement R13.7)", () => {
    const ui = (
      <Accordion>
        <AccordionItem heading="One">First panel</AccordionItem>
        <AccordionItem heading="Two" defaultOpen>
          Second panel
        </AccordionItem>
      </Accordion>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(ui);
    const prerendered = Array.from(container.querySelectorAll("[aria-controls]"), (button) =>
      container.querySelector(`[id="${button.getAttribute("aria-controls") ?? ""}"]`),
    );
    expect(prerendered[0]).toHaveAttribute("hidden", "");
    expect(prerendered[1]).not.toHaveAttribute("hidden");
    document.body.append(container);
    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { unmount } = render(ui, { container, hydrate: true, onRecoverableError });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(prerendered[0]).toHaveAttribute("hidden", "until-found");
    expect(prerendered[1]).not.toHaveAttribute("hidden");
    consoleError.mockRestore();
    unmount();
    container.remove();
  });

  it.each([2, 3, 4, 5, 6] as const)(
    "renders every heading at level %s with the h4 look by default (refinement R13.3)",
    (level) => {
      render(
        <Accordion headingLevel={level}>
          <AccordionItem heading="One">x</AccordionItem>
          <AccordionItem heading="Two">y</AccordionItem>
        </Accordion>,
      );

      const headings = screen.getAllByRole("heading", { level });
      expect(headings).toHaveLength(2);
      for (const heading of headings) expect(heading).toHaveClass(typography.h4 ?? "");
    },
  );

  it("applies headingVariant to every heading (refinement R13.3)", () => {
    render(
      <Accordion headingVariant="body">
        <AccordionItem heading="One">x</AccordionItem>
        <AccordionItem heading="Two">y</AccordionItem>
      </Accordion>,
    );

    for (const heading of screen.getAllByRole("heading")) {
      expect(heading).toHaveClass(typography.body ?? "");
      expect(heading).not.toHaveClass(typography.h4 ?? "");
    }
  });

  it("works alone with level 3 and the h4 look (refinement R13.3)", async () => {
    const user = userEvent.setup();
    render(<AccordionItem heading="Alone">Panel</AccordionItem>);

    const heading = screen.getByRole("heading", { level: 3, name: "Alone" });
    expect(heading).toHaveClass(typography.h4 ?? "");
    await user.click(screen.getByRole("button", { name: "Alone" }));
    expect(screen.getByText("Panel")).toBeVisible();
  });

  it("toggles on click (refinement R13.6)", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    const button = screen.getByRole("button", { name: "One" });

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(panelOf(button)).not.toHaveAttribute("hidden");
    expect(screen.getByText("First panel")).toBeVisible();

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(panelOf(button)).toHaveAttribute("hidden", "until-found");
  });

  it.each(["{Enter}", " "])("toggles with %s (refinement R13.6)", async (key) => {
    const user = userEvent.setup();
    render(<Fixture />);
    const button = screen.getByRole("button", { name: "One" });

    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard(key);
    expect(button).toHaveAttribute("aria-expanded", "true");
    await user.keyboard(key);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("leaves arrow keys, Home and End alone: focus stays (refinement R13.6)", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    const button = screen.getByRole("button", { name: "One" });

    await user.tab();
    await user.keyboard("{ArrowDown}{ArrowUp}{End}{Home}");
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  // jsdom has no content-visibility, so a closed (until-found) panel's links stay tabbable here;
  // accordion.spec.ts checks that browsers skip them.
  it("tabs between buttons and into open panels in source order (refinement R13.6)", async () => {
    const user = userEvent.setup();
    render(
      <Accordion>
        <AccordionItem heading="One" defaultOpen>
          <a href="#x">Inside one</a>
        </AccordionItem>
        <AccordionItem heading="Two">Second</AccordionItem>
        <AccordionItem heading="Three">Third</AccordionItem>
      </Accordion>,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "One" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Inside one" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Two" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Three" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Two" })).toHaveFocus();
  });

  it("opens with defaultOpen, items independent by default (refinement R13.4)", async () => {
    const user = userEvent.setup();
    render(
      <Accordion>
        <AccordionItem heading="One" defaultOpen>
          First
        </AccordionItem>
        <AccordionItem heading="Two">Second</AccordionItem>
      </Accordion>,
    );

    expect(screen.getByRole("button", { name: "One" })).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: "Two" }));
    expect(screen.getByRole("button", { name: "One" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Two" })).toHaveAttribute("aria-expanded", "true");
  });

  it("calls onOpenChange when uncontrolled (refinement R13.4)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <AccordionItem heading="One" onOpenChange={onOpenChange}>
        x
      </AccordionItem>,
    );

    await user.click(screen.getByRole("button", { name: "One" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.click(screen.getByRole("button", { name: "One" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("follows a controlled open, only requesting changes (refinement R13.4)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <AccordionItem heading="One" open={false} onOpenChange={onOpenChange}>
        x
      </AccordionItem>,
    );
    const button = screen.getByRole("button", { name: "One" });

    await user.click(button);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(button).toHaveAttribute("aria-expanded", "false");

    rerender(
      <AccordionItem heading="One" open onOpenChange={onOpenChange}>
        x
      </AccordionItem>,
    );
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("x")).toBeVisible();
  });

  it("closes the other open item when exclusive (refinement R13.5)", async () => {
    const user = userEvent.setup();
    render(<Fixture exclusive />);
    const one = screen.getByRole("button", { name: "One" });
    const two = screen.getByRole("button", { name: "Two" });

    await user.click(one);
    await user.click(two);
    expect(one).toHaveAttribute("aria-expanded", "false");
    expect(two).toHaveAttribute("aria-expanded", "true");

    await user.click(two);
    expect(two).toHaveAttribute("aria-expanded", "false");
  });

  it("closes a controlled item through its onOpenChange when exclusive (refinement R13.5)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <Accordion exclusive>
          <AccordionItem
            heading="One"
            open={open}
            onOpenChange={(next) => {
              onOpenChange(next);
              setOpen(next);
            }}
          >
            x
          </AccordionItem>
          <AccordionItem heading="Two">y</AccordionItem>
        </Accordion>
      );
    }
    render(<Controlled />);

    await user.click(screen.getByRole("button", { name: "Two" }));
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(screen.getByRole("button", { name: "One" })).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps items opened together on first render until one opens (refinement R13.5)", async () => {
    const user = userEvent.setup();
    render(
      <Accordion exclusive>
        <AccordionItem heading="One" defaultOpen>
          x
        </AccordionItem>
        <AccordionItem heading="Two" defaultOpen>
          y
        </AccordionItem>
        <AccordionItem heading="Three">z</AccordionItem>
      </Accordion>,
    );

    expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Three" }));
    expect(screen.getAllByRole("button", { expanded: true }).map((b) => b.textContent)).toEqual([
      "Three",
    ]);
  });

  it("makes panels regions named by their button with region (refinement R13.9)", () => {
    render(
      <Accordion region>
        <AccordionItem heading="One" defaultOpen>
          x
        </AccordionItem>
      </Accordion>,
    );

    expect(screen.getByRole("region", { name: "One" })).toHaveTextContent("x");
  });

  it("opens a closed item on beforematch, through onOpenChange (refinement R13.7)", () => {
    const onOpenChange = vi.fn();
    render(
      <AccordionItem heading="One" onOpenChange={onOpenChange}>
        periwinkle
      </AccordionItem>,
    );
    const button = screen.getByRole("button", { name: "One" });

    act(() => {
      fireEvent(panelOf(button), new Event("beforematch"));
    });

    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(panelOf(button)).not.toHaveAttribute("hidden");
  });

  it("hides a controlled item again when its parent ignores a beforematch request (refinement R13.4, R13.7)", async () => {
    const onOpenChange = vi.fn();
    render(
      <AccordionItem heading="One" open={false} onOpenChange={onOpenChange}>
        periwinkle
      </AccordionItem>,
    );
    const button = screen.getByRole("button", { name: "One" });
    const panel = panelOf(button);

    act(() => {
      fireEvent(panel, new Event("beforematch"));
      // What the browser does after the event.
      panel.removeAttribute("hidden");
    });
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));

    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("hidden", "until-found");
  });

  it("moves focus to the button when its panel closes around it (refinement R13.5)", async () => {
    render(
      <Accordion exclusive>
        <AccordionItem heading="One" defaultOpen>
          <a href="#x">Inside one</a>
        </AccordionItem>
        <AccordionItem heading="Two">periwinkle</AccordionItem>
      </Accordion>,
    );
    screen.getByRole("link", { name: "Inside one" }).focus();

    // Async: the closing panel settles once its (stubbed, empty) animations have finished.
    await act(async () => {
      fireEvent(panelOf(screen.getByRole("button", { name: "Two" })), new Event("beforematch"));
      await Promise.resolve();
    });

    const one = screen.getByRole("button", { name: "One" });
    expect(one).toHaveAttribute("aria-expanded", "false");
    expect(one).toHaveFocus();
  });

  it("passes native props, className and ref to each root (refinement R13.1)", () => {
    const groupRef = createRef<HTMLDivElement>();
    const itemRef = createRef<HTMLDivElement>();
    render(
      <Accordion ref={groupRef} className="group" data-testid="group" title="FAQ">
        <AccordionItem ref={itemRef} heading="One" className="item" data-testid="item">
          x
        </AccordionItem>
      </Accordion>,
    );

    const group = screen.getByTestId("group");
    const item = screen.getByTestId("item");
    expect(group).toBe(groupRef.current);
    expect(group).toHaveClass("group");
    expect(group).toHaveAttribute("title", "FAQ");
    expect(item).toBe(itemRef.current);
    expect(item).toHaveClass("item");
  });

  it("has no axe violations closed or open", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <main>
        <h2>Questions</h2>
        <Fixture />
      </main>,
    );
    await expectNoAxeViolations(container);

    for (const button of screen.getAllByRole("button")) await user.click(button);
    await expectNoAxeViolations(container);
  });
});
