import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useState } from "react";
import { flushSync } from "react-dom";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Accordion, AccordionItem } from "../../components/Accordion/Accordion.tsx";
import { TokenLink } from "./TokenLink.tsx";
import { TokenTargetContext, useHashTarget } from "./TokenTargetContext.tsx";

/** Two closed groups holding one row each, revealed the way the tokens page does (§7). */
const groupOf: Record<string, string> = {
  "color-text-muted": "semantic-color",
  "space-inset-md": "semantic-space",
};

function Harness() {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const reveal = useCallback((id: string) => {
    const group = groupOf[id];
    if (group === undefined) return false;
    flushSync(() => {
      setOpen((current) => new Set(current).add(group));
    });
    return true;
  }, []);
  useHashTarget(reveal);
  const item = (group: string, row: string) => (
    <AccordionItem
      heading={group}
      open={open.has(group)}
      onOpenChange={(next) => {
        setOpen((current) => {
          const updated = new Set(current);
          if (next) updated.add(group);
          else updated.delete(group);
          return updated;
        });
      }}
    >
      <p id={row}>{row}</p>
    </AccordionItem>
  );
  return (
    <TokenTargetContext value={reveal}>
      <TokenLink token="color.text.muted" />
      <Accordion>
        {item("semantic-color", "color-text-muted")}
        {item("semantic-space", "space-inset-md")}
      </Accordion>
    </TokenTargetContext>
  );
}

/** The accordion panel around a row (its id ends in "panel"). */
const panelOf = (row: string) => document.getElementById(row)?.closest("[id$='panel']");

describe("linking to a token (ds-tokens R7)", () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    scrollIntoView.mockClear();
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    window.history.replaceState(null, "", "/");
  });

  it("opens a closed group before the click's own navigation runs, keeping focus on the link (R7.1, R7.3)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const link = screen.getByRole("link", { name: "color.text.muted" });
    expect(link).toHaveAttribute("href", "#color-text-muted");
    expect(panelOf("color-text-muted")).toHaveAttribute("hidden");
    let hiddenAtDefault: boolean | undefined;
    const recordHidden = () => {
      hiddenAtDefault = panelOf("color-text-muted")?.hasAttribute("hidden");
    };
    document.addEventListener("click", recordHidden);

    await user.click(link);

    document.removeEventListener("click", recordHidden);
    expect(hiddenAtDefault).toBe(false);
    expect(screen.getByRole("button", { name: "semantic-color" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: "semantic-space" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(link).toHaveFocus();
  });

  it("opens and scrolls to the row named by the fragment on load (R7.2)", async () => {
    window.history.replaceState(null, "", "#space-inset-md");
    render(<Harness />);

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledOnce();
    });
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById("space-inset-md"));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    expect(screen.getByRole("button", { name: "semantic-space" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("opens and scrolls on hashchange (back, forward or a typed fragment)", async () => {
    render(<Harness />);
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));

    act(() => {
      window.history.replaceState(null, "", "#color-text-muted");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(screen.getByRole("button", { name: "semantic-color" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById("color-text-muted"));
  });

  it("ignores a fragment that isn't a token row", async () => {
    window.history.replaceState(null, "", "#naming");
    render(<Harness />);
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { expanded: false })).toHaveLength(2);
  });

  it("is a plain fragment link outside the tokens page's reference", () => {
    render(
      <MemoryRouter>
        <TokenLink token="space.4" page="/design-system/tokens" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "space.4" })).toHaveAttribute(
      "href",
      "/design-system/tokens#space-4",
    );
  });
});
