import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import {
  MarathonConfigProvider,
  MarathonConfigContextType,
  useMarathonConfig,
  useOptionalMarathonConfig,
} from "../MarathonConfigContext";
import { MarathonControls } from "../../components/layout/sidebar/MarathonControls";
import { BreakConfigurator } from "../../components/layout/sidebar/BreakConfigurator";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const dummyConfig: MarathonConfigContextType = {
  numMovies: 4,
  onNumMoviesChange: vi.fn(),
  earliestStart: "10:00am",
  onEarliestStartChange: vi.fn(),
  latestEnd: "11:00pm",
  onLatestEndChange: vi.fn(),
  trailerMin: 20,
  onTrailerMinChange: vi.fn(),
  minWaitMin: -10,
  onMinWaitMinChange: vi.fn(),
  maxWaitMin: 30,
  onMaxWaitMinChange: vi.fn(),
  breaks: [
    {
      id: "brk-1",
      intent: "Lunch",
      size: "45m",
    },
  ],
  onAddBreak: vi.fn(),
  onRemoveBreak: vi.fn(),
  onUpdateBreakSize: vi.fn(),
};

describe("MarathonConfigContext", () => {
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
        root!.unmount();
      });
      root = null;
    }
    if (container) {
      container.remove();
      container = null;
    }
  });

  it("throws error when useMarathonConfig is used outside provider", () => {
    function BrokenComponent() {
      useMarathonConfig();
      return null;
    }

    expect(() => {
      act(() => {
        root!.render(<BrokenComponent />);
      });
    }).toThrow("useMarathonConfig must be used within a MarathonConfigProvider");
  });

  it("returns null when useOptionalMarathonConfig is used outside provider", () => {
    let ctxValue: any = "unset";
    function OptionalComponent() {
      ctxValue = useOptionalMarathonConfig();
      return <div>Optional</div>;
    }

    act(() => {
      root!.render(<OptionalComponent />);
    });

    expect(ctxValue).toBeNull();
  });

  it("provides configuration to MarathonControls and BreakConfigurator without props", () => {
    act(() => {
      root!.render(
        <MarathonConfigProvider value={dummyConfig}>
          <MarathonControls />
          <BreakConfigurator />
        </MarathonConfigProvider>
      );
    });

    // Check that MarathonControls rendered values from context
    expect(container!.textContent).toContain("Scheduling Rules");
    expect(container!.textContent).toContain("20m"); // trailerMin

    // Check Time Between Movies controls and sub-labels
    expect(container!.textContent).toContain("Time Between Movies");
    expect(container!.textContent).toContain("Skip 10m trailers");
    expect(container!.textContent).toContain("Wait up to 30m");

    // Check tooltip content
    expect(container!.textContent).toContain("Most screenings run pre-show ads and trailers");
    expect(container!.textContent).toContain("Special events (such as Fathom Events or Q&A screenings)");

    // Check that BreakConfigurator rendered values from context
    expect(container!.textContent).toContain("Flexible Activity Breaks");
    expect(container!.textContent).toContain("Lunch Break");
    expect(container!.textContent).toContain("45m");
  });

  it("renders At Showtime when minWaitMin is 0", () => {
    const atShowtimeConfig: MarathonConfigContextType = {
      ...dummyConfig,
      minWaitMin: 0,
      maxWaitMin: 20,
    };

    act(() => {
      root!.render(
        <MarathonConfigProvider value={atShowtimeConfig}>
          <MarathonControls />
        </MarathonConfigProvider>
      );
    });

    expect(container!.textContent).toContain("At Showtime");
    expect(container!.textContent).toContain("Wait up to 20m");
    expect(container!.textContent).not.toContain("Skip 0m trailers");
  });

  it("renders Change link when onOpenSettings is provided to MarathonControls", () => {
    const onOpenSettingsSpy = vi.fn();
    act(() => {
      root!.render(
        <MarathonConfigProvider value={dummyConfig}>
          <MarathonControls onOpenSettings={onOpenSettingsSpy} />
        </MarathonConfigProvider>
      );
    });

    const buttons = Array.from(container!.querySelectorAll("button"));
    const changeBtn = buttons.find((b) => b.getAttribute("aria-label")?.includes("trailer") || b.textContent?.includes("20m"));
    expect(changeBtn).toBeDefined();

    act(() => {
      changeBtn!.click();
    });

    expect(onOpenSettingsSpy).toHaveBeenCalledTimes(1);
  });
});
