import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { TimelineBar, getTimelineItemKey } from "../TimelineBar";
import { TimelineItemType } from "../../../../../shared/types/movie";
import { TimelineItem } from "../../../types/api";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("TimelineBar", () => {
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

  const sampleItems: TimelineItem[] = [
    {
      item_type: TimelineItemType.MOVIE,
      start_min: 600,
      end_min: 720,
      label: "Movie A",
      duration_min: 120,
      start_str: "10:00 AM",
      end_str: "12:00 PM",
      showing: {
        title: "Movie A",
        start_time_str: "10:00 AM",
        feature_start_str: "10:20 AM",
        end_time_str: "12:00 PM",
        start_min: 600,
        end_min: 720,
        runtime_min: 100,
        trailer_min: 20,
        format_name: "Digital",
        is_premium: false,
      },
    },
    {
      item_type: TimelineItemType.FAST_CONNECTION,
      start_min: 720,
      end_min: 720,
      label: "Quick Connection",
      duration_min: -15, // 15 min overlap into Movie B trailers
      start_str: "12:00 PM",
      end_str: "12:00 PM",
    },
    {
      item_type: TimelineItemType.MOVIE,
      start_min: 705,
      end_min: 840,
      label: "Movie B (IMAX)",
      duration_min: 135,
      start_str: "11:45 AM",
      end_str: "2:00 PM",
      showing: {
        title: "Movie B (IMAX)",
        start_time_str: "11:45 AM",
        feature_start_str: "12:10 PM",
        end_time_str: "2:00 PM",
        start_min: 705,
        end_min: 840,
        runtime_min: 110,
        trailer_min: 25,
        format_name: "IMAX",
        is_premium: true,
      },
    },
    {
      item_type: TimelineItemType.BREAK,
      start_min: 840,
      end_min: 885,
      label: "Lunch Break",
      duration_min: 45,
      start_str: "2:00 PM",
      end_str: "2:45 PM",
    },
    {
      item_type: TimelineItemType.GAP,
      start_min: 885,
      end_min: 915,
      label: "Wait",
      duration_min: 30,
      start_str: "2:45 PM",
      end_str: "3:15 PM",
    },
  ];

  it("renders movies, breaks, and gaps on timeline without rendering FAST_CONNECTION directly as its own block", () => {
    act(() => {
      root!.render(
        <TimelineBar
          items={sampleItems}
          totalStartMin={600}
          totalEndMin={915}
        />
      );
    });

    expect(container!.textContent).toContain("Movie A");
    expect(container!.textContent).toContain("Movie B (IMAX)");
    expect(container!.textContent).toContain("Lunch Break");
    expect(container!.textContent).not.toContain("Quick Connection");
  });

  it("renders a single trailing hatched overlap segment on Movie A for the trailer overlap", () => {
    act(() => {
      root!.render(
        <TimelineBar
          items={sampleItems}
          totalStartMin={600}
          totalEndMin={915}
        />
      );
    });

    const hatchedOverlap = container!.querySelector(".bg-hatched-trailers-mixed");
    expect(hatchedOverlap).not.toBeNull();
  });

  it("triggers onHoverKey when mouse enters and leaves timeline blocks", () => {
    const onHoverKey = vi.fn();
    act(() => {
      root!.render(
        <TimelineBar
          items={sampleItems}
          totalStartMin={600}
          totalEndMin={915}
          onHoverKey={onHoverKey}
        />
      );
    });

    const movieABlock = container!.querySelector(".bg-brand-accent");
    expect(movieABlock).not.toBeNull();
    act(() => {
      movieABlock!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    expect(onHoverKey).toHaveBeenCalledWith(getTimelineItemKey(sampleItems[0]!, 0));

    const outerContainer = container!.firstElementChild as HTMLElement;
    act(() => {
      outerContainer.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    });
    expect(onHoverKey).toHaveBeenCalledWith(null);
  });

  it("when the overlap gantt section is moused over, triggers onHoverKey only with the quick connection key (not the earlier movie)", () => {
    const onHoverKey = vi.fn();
    act(() => {
      root!.render(
        <TimelineBar
          items={sampleItems}
          totalStartMin={600}
          totalEndMin={915}
          onHoverKey={onHoverKey}
        />
      );
    });

    const hatchedOverlap = container!.querySelector(".bg-hatched-trailers-mixed");
    expect(hatchedOverlap).not.toBeNull();
    act(() => {
      hatchedOverlap!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    const quickConnKey = getTimelineItemKey(sampleItems[1]!, 1);
    const movieAKey = getTimelineItemKey(sampleItems[0]!, 0);

    expect(onHoverKey).toHaveBeenCalledWith(quickConnKey);
    expect(onHoverKey).not.toHaveBeenCalledWith(movieAKey);
  });

  it("highlights only the hovered item in the timeline bar without dimming any elements", () => {
    const movieAKey = getTimelineItemKey(sampleItems[0]!, 0);
    act(() => {
      root!.render(
        <TimelineBar
          items={sampleItems}
          totalStartMin={600}
          totalEndMin={915}
          hoveredKey={movieAKey}
        />
      );
    });

    const movieAFeature = container!.querySelector(".bg-brand-accent");
    const movieBFeature = container!.querySelector(".bg-brand-purple");
    const breakEl = container!.querySelector(".bg-yellow-400, .bg-amber-700, .bg-amber-600");

    // Movie A has brightness and ring
    expect(movieAFeature?.className).toContain("ring-1");
    expect(movieAFeature?.className).toContain("brightness-110");

    // Non-hovered items are NOT dimmed (no opacity-60)
    expect(movieBFeature?.className).not.toContain("opacity-60");
    expect(breakEl?.className).not.toContain("opacity-60");
    expect(container!.innerHTML).not.toContain("opacity-60");
  });
});
