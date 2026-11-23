import { MovieDayStatus, UserMovieStatus } from '../../../../shared/types/movie';
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { useScheduleSolver } from "../useScheduleSolver";
import { Movie } from "../../types/api";
import { SettingsProvider } from "../../context/SettingsContext";
import { DEFAULT_APP_SETTINGS } from "../../../../shared/types/settings";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../../api/client", () => ({
  solveSchedules: vi.fn().mockResolvedValue([
    {
      schedule_id: "test-sched-1",
      start_min: 600,
      end_min: 960,
      start_time_str: "10:00 AM",
      end_time_str: "4:00 PM",
      total_wasted_wait_min: 30,
      has_premium: false,
      premium_movie_count: 0,
      timeline_items: [],
    },
  ]),
}));

import { solveSchedules } from "../../api/client";

const sampleMovies: Movie[] = [
  {
    title: "Movie A",
    runtime_min: 120,
    runtime_str: "2h 0m",
    status: MovieDayStatus.MUST_SEE,
    user_status: UserMovieStatus.ACTIVE,
    all_formats: ["Digital"],
    allowed_formats: ["Digital"],
    showings_by_format: {},
  },
  {
    title: "Movie B",
    runtime_min: 120,
    runtime_str: "2h 0m",
    status: MovieDayStatus.INCLUDE,
    user_status: UserMovieStatus.ACTIVE,
    all_formats: ["Digital"],
    allowed_formats: ["Digital"],
    showings_by_format: {},
  },
  {
    title: "Movie C",
    runtime_min: 120,
    runtime_str: "2h 0m",
    status: MovieDayStatus.INCLUDE,
    user_status: UserMovieStatus.ACTIVE,
    all_formats: ["Digital"],
    allowed_formats: ["Digital"],
    showings_by_format: {},
  },
];

describe("useScheduleSolver", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
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
    vi.useRealTimers();
  });

  it("does not re-trigger solve in an infinite loop when movies update without changing scheduling signature", async () => {
    function TestComponent({ movies }: { movies: Movie[] }) {
      useScheduleSolver({
        theaterId: "theater-1",
        selectedDate: "2026-10-15",
        movies,
      });
      return null;
    }

    // Initial render
    act(() => {
      root!.render(<TestComponent movies={sampleMovies} />);
    });

    // Advance 250ms debounce timer for initial solve
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(solveSchedules).toHaveBeenCalledTimes(1);

    // Re-render with updated metadata (e.g., RT score added) - scheduling signature is identical
    const moviesWithRatings: Movie[] = sampleMovies.map((m) => ({
      ...m,
      rt_score: "95%",
      plot: "Exciting movie",
    }));

    act(() => {
      root!.render(<TestComponent movies={moviesWithRatings} />);
    });

    // Advance timers again - solver should NOT re-trigger because solverMovieSignature is unchanged
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(solveSchedules).toHaveBeenCalledTimes(1);
  });

  it("exposes unified marathonConfig and coordinates time/wait bounds", async () => {
    let hookResult: ReturnType<typeof useScheduleSolver> | null = null;

    function TestComponent() {
      hookResult = useScheduleSolver({
        theaterId: "theater-1",
        selectedDate: "2026-10-15",
        movies: sampleMovies,
      });
      return null;
    }

    act(() => {
      root!.render(<TestComponent />);
    });

    expect(hookResult).not.toBeNull();
    expect(hookResult!.marathonConfig).toBeDefined();
    expect(hookResult!.marathonConfig.numMovies).toBe(3);
    expect(hookResult!.marathonConfig.minWaitMin).toBe(-20);
    expect(hookResult!.marathonConfig.maxWaitMin).toBe(15);

    // Coordinate earliest start pushing latest end
    act(() => {
      hookResult!.marathonConfig.onEarliestStartChange("11:00pm"); // 1380 min > 1350 min (10:30pm)
    });

    // latestEnd (previously 10:30pm = 1350) should be bumped to at least 2h later (1:00am)
    expect(hookResult!.marathonConfig.earliestStart).toBe("11:00pm");
    expect(hookResult!.marathonConfig.latestEnd).toBe("1:00am");

    // Coordinate wait time bounds
    act(() => {
      hookResult!.marathonConfig.onMaxWaitMinChange(15);
    });
    expect(hookResult!.marathonConfig.maxWaitMin).toBe(15);

    // Setting minWaitMin closer than 1 discrete step (10m gap) clamps to maxWaitMin - 10
    act(() => {
      hookResult!.marathonConfig.onMinWaitMinChange(25);
    });
    expect(hookResult!.marathonConfig.minWaitMin).toBe(5);

    // Setting maxWaitMin closer than 1 discrete step (10m gap) clamps to minWaitMin + 10
    act(() => {
      hookResult!.marathonConfig.onMaxWaitMinChange(-15);
    });
    expect(hookResult!.marathonConfig.maxWaitMin).toBe(15);

    // Setting trailer duration to 0 clamps minWaitMin to 0 and bumps maxWaitMin to at least 10
    act(() => {
      hookResult!.marathonConfig.onMinWaitMinChange(-20);
    });
    act(() => {
      hookResult!.marathonConfig.onMaxWaitMinChange(-5);
    });
    expect(hookResult!.marathonConfig.minWaitMin).toBe(-20);
    expect(hookResult!.marathonConfig.maxWaitMin).toBe(-5);

    act(() => {
      hookResult!.marathonConfig.onTrailerMinChange(0);
    });
    expect(hookResult!.marathonConfig.minWaitMin).toBe(0);
    expect(hookResult!.marathonConfig.maxWaitMin).toBe(10);
  });

  it("passes prefer_premium_formats from SettingsProvider into solveSchedules", async () => {
    function TestComponent() {
      useScheduleSolver({
        theaterId: "theater-1",
        selectedDate: "2026-10-15",
        movies: sampleMovies,
      });
      return null;
    }

    act(() => {
      root!.render(
        <SettingsProvider initialSettings={{ ...DEFAULT_APP_SETTINGS, preferPremiumFormats: false }}>
          <TestComponent />
        </SettingsProvider>
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(solveSchedules).toHaveBeenCalledWith(
      expect.objectContaining({ prefer_premium_formats: false }),
      expect.anything()
    );
  });
});
