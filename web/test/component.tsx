import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, vi } from "vitest";

/**
 * R3.6: the prerendered markup hydrates with no mismatch, and hydration leaves it unchanged.
 * (Comparing renderToString with a client render would differ on useId by design.)
 */
export function expectHydratesCleanly(ui: ReactElement): void {
  const container = document.createElement("div");
  container.innerHTML = renderToString(ui);
  const prerendered = container.innerHTML;
  document.body.append(container);
  const onRecoverableError = vi.fn();
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

  const { unmount } = render(ui, { container, hydrate: true, onRecoverableError });

  expect(onRecoverableError).not.toHaveBeenCalled();
  expect(consoleError).not.toHaveBeenCalled();
  expect(container.innerHTML).toBe(prerendered);
  consoleError.mockRestore();
  unmount();
  container.remove();
}
