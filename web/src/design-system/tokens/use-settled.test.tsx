import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSettled } from "./use-settled.ts";

describe("useSettled (ds-tokens §9.3)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with the first value", () => {
    const { result } = renderHook(() => useSettled("a", 400));

    expect(result.current).toBe("a");
  });

  it("follows a new value only after it stays the same for the delay", () => {
    const { result, rerender } = renderHook(({ value }) => useSettled(value, 400), {
      initialProps: { value: "a" },
    });

    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    rerender({ value: "abc" });
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("abc");
  });
});
