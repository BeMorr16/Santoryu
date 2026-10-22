import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { COPY_RESET_MS, CopyButton } from "./CopyButton.tsx";

describe("CopyButton (ds-tokens R8.1, R8.2)", () => {
  let writeText: ReturnType<typeof vi.fn<(text: string) => Promise<void>>>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, "clipboard");
  });

  const button = () => screen.getByRole("button", { name: "Copy --color-text-muted" });

  async function press() {
    await act(async () => {
      fireEvent.click(button());
      await Promise.resolve();
    });
  }

  it("is named by its label and shows it as a tooltip", () => {
    render(<CopyButton text="--color-text-muted" label="Copy --color-text-muted" />);

    expect(button()).toHaveAccessibleName("Copy --color-text-muted");
    expect(button().nextElementSibling).toHaveTextContent("Copy --color-text-muted");
  });

  it("writes its text and says Copied, then resets after COPY_RESET_MS", async () => {
    render(<CopyButton text="--color-text-muted" label="Copy --color-text-muted" />);
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    await press();

    expect(writeText).toHaveBeenCalledExactlyOnceWith("--color-text-muted");
    expect(status).toHaveTextContent("Copied");
    act(() => {
      vi.advanceTimersByTime(COPY_RESET_MS - 1);
    });
    expect(status).toHaveTextContent("Copied");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(status).toBeEmptyDOMElement();
  });

  it("empties the status as a second press starts, so Copied is announced again", async () => {
    render(<CopyButton text="x" label="Copy --color-text-muted" />);
    const status = screen.getByRole("status");
    await press();
    writeText.mockImplementation(() => new Promise<void>(() => undefined));

    act(() => {
      fireEvent.click(button());
    });

    expect(status).toBeEmptyDOMElement();
  });

  it("shows and says Couldn't copy when the clipboard refuses, with the failure class", async () => {
    writeText.mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
    render(<CopyButton text="x" label="Copy --color-text-muted" failureClassName="failure" />);

    await press();

    expect(screen.getByRole("status")).toHaveTextContent("Couldn't copy");
    const shown = screen.getByText("Couldn't copy", { ignore: '[role="status"]' });
    expect(shown).toHaveAttribute("aria-hidden", "true");
    expect(shown).toHaveClass("failure");
    expect(button()).toHaveAccessibleName("Copy --color-text-muted");
  });

  it("puts className on its wrapper", () => {
    const { container } = render(<CopyButton text="x" label="Copy x" className="actions" />);

    expect(container.firstElementChild).toHaveClass("actions");
  });
});

// Outside the fake timers: axe schedules its own.
it("CopyButton has no axe violations at rest or after copying", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  const { container } = render(<CopyButton text="x" label="Copy --color-text-muted" />);
  await expectNoAxeViolations(container);

  await act(async () => {
    fireEvent.click(screen.getByRole("button"));
    await Promise.resolve();
  });
  await expectNoAxeViolations(container);
  Reflect.deleteProperty(navigator, "clipboard");
});
