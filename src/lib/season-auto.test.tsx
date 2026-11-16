import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useXmas } from "./season";

afterEach(() => { vi.useRealTimers(); localStorage.clear(); });

describe("автоматическое оформление", () => {
  it("15 декабря включается даже при старом выключенном режиме", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 15, 0, 0));
    localStorage.setItem("xmas-mode", "off");
    const { result, unmount } = renderHook(() => useXmas());
    expect(result.current.on).toBe(true);
    unmount();
  });
  it("меняется на 15 декабря в уже открытом приложении", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 14, 23, 59));
    const { result, unmount } = renderHook(() => useXmas());
    expect(result.current.on).toBe(false);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current.on).toBe(true);
    unmount();
  });
});