import React, { act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, Root } from "react-dom/client";
import { useCurrentDate } from "../useCurrentDate";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const TestHarness: React.FC = () => {
  const todayStr = useCurrentDate();
  return <div data-testid="date">{todayStr}</div>;
};

describe("useCurrentDate", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 25, 23, 59, 0)); // 2026-11-25 23:59:00 local
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it("returns the initial local date and rolls over at midnight", () => {
    act(() => {
      root.render(<TestHarness />);
    });
    expect(container.textContent).toBe("2026-11-25");

    act(() => {
      vi.advanceTimersByTime(61_000); // 00:00:01 on 2026-11-26
    });

    expect(container.textContent).toBe("2026-11-26");
  });

  it("syncs the date when the window regains focus or visibility", () => {
    act(() => {
      root.render(<TestHarness />);
    });
    expect(container.textContent).toBe("2026-11-25");

    // Simulate system clock jumping overnight while asleep without timer firing yet
    vi.setSystemTime(new Date(2026, 10, 26, 9, 30, 0));

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(container.textContent).toBe("2026-11-26");
  });
});
