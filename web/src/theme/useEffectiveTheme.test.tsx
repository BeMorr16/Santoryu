import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setSystemTheme } from "../../test/system-theme.ts";
import { useEffectiveTheme } from "./useEffectiveTheme.ts";

function Probe() {
  return <p>{useEffectiveTheme() ?? "unknown"}</p>;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useEffectiveTheme (R13.2, R13.6, R13.8)", () => {
  it("renders no value on the server, whatever is stored", () => {
    localStorage.setItem("theme", "dark");

    expect(renderToString(<Probe />)).toBe("<p>unknown</p>");
  });

  it("shows the stored choice after hydration, with no hydration error", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Probe />);
    document.body.append(container);
    localStorage.setItem("theme", "dark");
    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<Probe />, { container, hydrate: true, onRecoverableError });

    expect(screen.getByRole("paragraph")).toHaveTextContent("dark");
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("renders no value on the server for a custom choice, then the choice after hydration (theme-creator R9.2)", () => {
    localStorage.setItem(
      "custom-themes",
      JSON.stringify({
        v: 1,
        themes: [{ id: "ocean123", name: "Ocean", scheme: "dark", vars: {}, source: {} }],
      }),
    );
    localStorage.setItem("theme", "custom:ocean123");
    expect(renderToString(<Probe />)).toBe("<p>unknown</p>");

    render(<Probe />);
    expect(screen.getByRole("paragraph")).toHaveTextContent("custom:ocean123");
  });

  it("shows the OS scheme when there's no choice, and follows it live", () => {
    setSystemTheme("dark");
    render(<Probe />);
    expect(screen.getByRole("paragraph")).toHaveTextContent("dark");

    act(() => {
      setSystemTheme("light");
    });

    expect(screen.getByRole("paragraph")).toHaveTextContent("light");
  });
});
