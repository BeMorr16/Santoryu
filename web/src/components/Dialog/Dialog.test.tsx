import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { Button } from "../Button/Button.tsx";
import { Dialog, DialogActions, DialogBody, DialogButton, type DialogProps } from "./Dialog.tsx";
import styles from "./Dialog.module.css";

type Extra = Partial<Omit<DialogProps, "open" | "onClose" | "title" | "children">>;

/** A trigger that opens the dialog, and the dialog wired to its state, as a consumer writes it. */
function Harness({
  children,
  onClose,
  ...props
}: Extra & { children?: ReactNode; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Open
      </Button>
      <Dialog
        {...props}
        open={open}
        title="Delete theme"
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
      >
        {children}
      </Dialog>
    </>
  );
}

async function openHarness(ui: ReactNode) {
  const user = userEvent.setup();
  render(ui);
  const trigger = screen.getByRole("button", { name: "Open" });
  await user.click(trigger);
  return { user, trigger };
}

describe("Dialog (theme-creator R12)", () => {
  it("opens and closes with `open`, as a modal named by its title (R12.1, R12.2)", () => {
    const { rerender } = render(
      <Dialog open={false} onClose={vi.fn()} title="Delete theme">
        Body
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      <Dialog open onClose={vi.fn()} title="Delete theme">
        Body
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Delete theme" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("heading", { level: 2, name: "Delete theme" })).toBeVisible();

    rerender(
      <Dialog open={false} onClose={vi.fn()} title="Delete theme">
        Body
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("only reports onClose for a close it didn't get from `open`", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Dialog open onClose={onClose} title="T">
        Body
      </Dialog>,
    );
    rerender(
      <Dialog open={false} onClose={onClose} title="T">
        Body
      </Dialog>,
    );

    expect(onClose).not.toHaveBeenCalled();
  });

  it("uses the title level and icon given", () => {
    render(
      <Dialog open onClose={vi.fn()} title="Saved" titleLevel={3} titleIcon="check">
        Body
      </Dialog>,
    );

    const heading = screen.getByRole("heading", { level: 3, name: "Saved" });
    expect(heading.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  describe("initial focus (R12.3)", () => {
    it("goes to the first focusable element after the header", async () => {
      await openHarness(
        <Harness>
          <DialogBody>Delete “Ocean”?</DialogBody>
          <DialogActions>
            <DialogButton>Cancel</DialogButton>
            <DialogButton variant="primary">Delete</DialogButton>
          </DialogActions>
        </Harness>,
      );

      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    });

    it("goes to initialFocus when given", async () => {
      function WithInitial() {
        const keep = useRef<HTMLButtonElement>(null);
        return (
          <Harness role="alertdialog" initialFocus={keep}>
            <DialogActions>
              <DialogButton variant="primary">Save anyway</DialogButton>
              <DialogButton ref={keep}>Keep editing</DialogButton>
            </DialogActions>
          </Harness>
        );
      }
      await openHarness(<WithInitial />);

      expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus();
    });

    it("goes to Close when nothing else can take focus", async () => {
      await openHarness(
        <Harness>
          <DialogBody>Nothing to do here.</DialogBody>
        </Harness>,
      );

      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    });
  });

  it("returns focus to the opener when it closes (R12.3)", async () => {
    const { user, trigger } = await openHarness(
      <Harness>
        <DialogActions>
          <DialogButton>Cancel</DialogButton>
        </DialogActions>
      </Harness>,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("leaves focus where onClose puts it, once the page behind is no longer inert", async () => {
    function MovesFocus() {
      const target = useRef<HTMLInputElement>(null);
      return (
        <>
          <input ref={target} aria-label="Elsewhere" />
          <Harness onClose={() => target.current?.focus()}>
            <DialogActions>
              <DialogButton>Edit</DialogButton>
            </DialogActions>
          </Harness>
        </>
      );
    }
    const { user } = await openHarness(<MovesFocus />);

    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("textbox", { name: "Elsewhere" })).toHaveFocus();
  });

  it("skips disabled controls when choosing initial focus", async () => {
    await openHarness(
      <Harness>
        <fieldset disabled>
          <input aria-label="Locked" />
        </fieldset>
        <DialogActions>
          <DialogButton>Done</DialogButton>
        </DialogActions>
      </Harness>,
    );

    expect(screen.getByRole("button", { name: "Done" })).toHaveFocus();
  });

  describe("Escape (R12.4)", () => {
    it("closes the dialog", async () => {
      const onClose = vi.fn();
      const { user, trigger } = await openHarness(<Harness onClose={onClose} />);

      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalledOnce();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(trigger).toHaveFocus();
    });

    it("is canceled with closeOnEsc={false}", async () => {
      const onClose = vi.fn();
      const { user } = await openHarness(<Harness onClose={onClose} closeOnEsc={false} />);
      const cancel = new Event("cancel", { cancelable: true });

      await user.keyboard("{Escape}");
      fireEvent(screen.getByRole("dialog"), cancel);

      expect(cancel.defaultPrevented).toBe(true);
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toBeVisible();
    });
  });

  describe("backdrop (R12.4)", () => {
    it("closes on a click on the backdrop", async () => {
      const onClose = vi.fn();
      const { user } = await openHarness(<Harness onClose={onClose} />);

      await user.click(screen.getByRole("dialog"));

      expect(onClose).toHaveBeenCalledOnce();
    });

    it("stays open for a click inside, or a press that started inside", async () => {
      const onClose = vi.fn();
      const { user } = await openHarness(
        <Harness onClose={onClose}>
          <DialogBody>Text to select</DialogBody>
        </Harness>,
      );
      const dialog = screen.getByRole("dialog");

      await user.click(screen.getByText("Text to select"));
      fireEvent.pointerDown(screen.getByText("Text to select"));
      fireEvent.click(dialog);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("stays open with closeOnBackdrop={false}", async () => {
      const onClose = vi.fn();
      const { user } = await openHarness(<Harness onClose={onClose} closeOnBackdrop={false} />);

      await user.click(screen.getByRole("dialog"));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it("has a Close button named Close, with its name as a tooltip (R12.4)", async () => {
    const onClose = vi.fn();
    const { user } = await openHarness(<Harness onClose={onClose} />);
    const close = screen.getByRole("button", { name: "Close" });

    expect(close).not.toHaveAttribute("aria-describedby");
    await user.click(close);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("reports a DialogButton's result through onComplete, then closes (R12.1)", async () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();
    const onClick = vi.fn();
    const { user } = await openHarness(
      <Harness onComplete={onComplete} onClose={onClose}>
        <DialogActions>
          <DialogButton result="failure">Keep</DialogButton>
          <DialogButton result="success" onClick={onClick}>
            Delete
          </DialogButton>
          <DialogButton>Later</DialogButton>
        </DialogActions>
      </Harness>,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledExactlyOnceWith("success");
    expect(onClose).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Later" }));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("keeps button names to their visible text (R12.5)", async () => {
    await openHarness(
      <Harness>
        <DialogActions>
          <DialogButton result="success">Delete</DialogButton>
        </DialogActions>
      </Harness>,
    );

    expect(screen.getByRole("button", { name: "Delete" })).not.toHaveAttribute("aria-label");
  });

  it("is described by its body only when it has one (R12.1)", () => {
    const { rerender } = render(
      <Dialog open onClose={vi.fn()} title="T">
        <p>Plain</p>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toHaveAttribute("aria-describedby");
    expect(dialog).toHaveAttribute(
      "aria-labelledby",
      screen.getByRole("heading", { name: "T" }).id,
    );

    rerender(
      <Dialog open onClose={vi.fn()} title="T">
        <DialogBody>Described</DialogBody>
      </Dialog>,
    );
    expect(dialog).toHaveAccessibleDescription("Described");
  });

  it("is an alertdialog with role=alertdialog (R12.1)", () => {
    render(
      <Dialog open onClose={vi.fn()} title="Contrast issues" role="alertdialog">
        <DialogBody>2 pairings fail.</DialogBody>
      </Dialog>,
    );

    expect(screen.getByRole("alertdialog", { name: "Contrast issues" })).toBeVisible();
  });

  it("puts the size, className and native props on the dialog", () => {
    render(
      <Dialog open onClose={vi.fn()} title="T" size="full" className="extra" data-testid="d">
        Body
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass(styles.dialog ?? "", styles.full ?? "", "extra");
    expect(dialog).toHaveAttribute("data-testid", "d");
  });

  it("makes a scrolling body a focusable group named by the title", async () => {
    await openHarness(
      <Harness>
        <DialogBody>Long text</DialogBody>
      </Harness>,
    );
    const body = screen.getByText("Long text").parentElement;
    if (!body) throw new Error("no body");
    expect(body).not.toHaveAttribute("tabindex");

    Object.defineProperty(body, "clientHeight", { configurable: true, value: 100 });
    Object.defineProperty(body, "scrollHeight", { configurable: true, value: 400 });
    act(() => {
      body.dispatchEvent(new Event("blur"));
    });

    expect(screen.getByRole("group", { name: "Delete theme" })).toBe(body);
    expect(body).toHaveAttribute("tabindex", "0");
  });

  it("throws when a part is used outside a Dialog", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<DialogBody>Orphan</DialogBody>)).toThrow(/inside a Dialog/);
    vi.restoreAllMocks();
  });

  it("has no axe violations open, as a dialog and an alertdialog", async () => {
    const { container, rerender } = render(
      <Dialog open onClose={vi.fn()} title="Delete theme" titleIcon="trash">
        <DialogBody>Delete “Ocean”? This can’t be undone.</DialogBody>
        <DialogActions>
          <DialogButton result="failure">Cancel</DialogButton>
          <DialogButton result="success" variant="primary">
            Delete
          </DialogButton>
        </DialogActions>
      </Dialog>,
    );
    await expectNoAxeViolations(container);

    rerender(
      <Dialog open onClose={vi.fn()} title="Contrast issues" role="alertdialog">
        <DialogBody>2 pairings fail.</DialogBody>
      </Dialog>,
    );
    await expectNoAxeViolations(container);
  });
});
