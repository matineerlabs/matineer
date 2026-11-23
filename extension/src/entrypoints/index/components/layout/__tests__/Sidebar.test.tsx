import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { Sidebar } from "../Sidebar";
import {
  MarathonConfigProvider,
  MarathonConfigContextType,
} from "../../../context/MarathonConfigContext";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const dummyConfig: MarathonConfigContextType = {
  numMovies: 3,
  onNumMoviesChange: vi.fn(),
  earliestStart: "9:30am",
  onEarliestStartChange: vi.fn(),
  latestEnd: "10:30pm",
  onLatestEndChange: vi.fn(),
  trailerMin: 25,
  onTrailerMinChange: vi.fn(),
  minWaitMin: -20,
  onMinWaitMinChange: vi.fn(),
  maxWaitMin: 15,
  onMaxWaitMinChange: vi.fn(),
  breaks: [],
  onAddBreak: vi.fn(),
  onRemoveBreak: vi.fn(),
  onUpdateBreakSize: vi.fn(),
};

describe("Sidebar", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  it("renders without error and passes onOpenSettings to MarathonControls", () => {
    const onOpenSettingsSpy = vi.fn();

    act(() => {
      root!.render(
        <MarathonConfigProvider value={dummyConfig}>
          <Sidebar
            theaters={[]}
            selectedTheaterId=""
            onSelectTheater={vi.fn()}
            selectedDate="2026-10-15"
            onSelectDate={vi.fn()}
            isScraping={false}
            onOpenSettings={onOpenSettingsSpy}
          />
        </MarathonConfigProvider>
      );
    });

    expect(container?.textContent).toContain("Matineer");
    expect(container?.textContent).toContain("Scheduling Rules");
    expect(container?.textContent).toContain("25m");

    const buttons = Array.from(container!.querySelectorAll("button"));
    const changeBtn = buttons.find((b) => b.getAttribute("aria-label")?.includes("trailer") || b.textContent?.includes("25m"));
    expect(changeBtn).toBeDefined();

    act(() => {
      changeBtn!.click();
    });

    expect(onOpenSettingsSpy).toHaveBeenCalledTimes(1);
  });
});
