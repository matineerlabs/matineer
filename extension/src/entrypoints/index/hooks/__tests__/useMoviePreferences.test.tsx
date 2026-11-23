import { MovieDayStatus, UserMovieStatus } from '../../../../shared/types/movie';
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { useMoviePreferences } from "../useMoviePreferences";
import { Movie, ShowingItem } from "../../types/api";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../../api/client", () => ({
  updateDaySelection: vi.fn().mockResolvedValue(undefined),
  updateMovieStatus: vi.fn().mockResolvedValue(undefined),
  batchUpdateDay: vi.fn().mockResolvedValue(undefined),
}));

describe("useMoviePreferences", () => {
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

  it("handles pinning, auto-enrichment, and synchronizing state", async () => {
    let hookResult: ReturnType<typeof useMoviePreferences> | null = null;
    let currentMovies: Movie[] = [
      {
        title: "Gladiator II",
        runtime_min: 148,
        runtime_str: "2h 28m",
        status: MovieDayStatus.INCLUDE,
        user_status: UserMovieStatus.ACTIVE,
        all_formats: ["Digital", "IMAX"],
        allowed_formats: ["Digital"],
        showings_by_format: {
          IMAX: [{ time: "7:00pm", url: "https://amc.com/1" }],
        },
      },
    ];

    function TestComponent() {
      const [movies, setMovies] = React.useState<Movie[]>(currentMovies);
      currentMovies = movies;
      hookResult = useMoviePreferences("2026-10-15", movies, setMovies);
      return null;
    }

    act(() => {
      root!.render(<TestComponent />);
    });

    expect(hookResult!.pinnedShowing).toBeNull();

    // 1. Pin IMAX screening
    const showing: ShowingItem = { time: "7:00pm", url: "https://amc.com/1" };
    act(() => {
      hookResult!.handlePinShowing(currentMovies[0]!, "IMAX", showing);
    });

    expect(hookResult!.pinnedShowing).toEqual({
      title: "Gladiator II",
      format_name: "IMAX",
      time: "7:00pm",
      url: "https://amc.com/1",
    });
    expect(currentMovies[0]!.status).toBe(MovieDayStatus.MUST_SEE);
    expect(currentMovies[0]!.allowed_formats).toContain("IMAX");

    // 2. Toggling off the pinned format should clear the pin
    act(() => {
      hookResult!.handleFormatToggle("Gladiator II", "IMAX");
    });

    expect(hookResult!.pinnedShowing).toBeNull();

    // 3. Re-pin and change status to Exclude -> should clear pin
    act(() => {
      hookResult!.handlePinShowing(currentMovies[0]!, "IMAX", showing);
    });
    expect(hookResult!.pinnedShowing).not.toBeNull();

    act(() => {
      hookResult!.handleMovieStatusChange("Gladiator II", MovieDayStatus.EXCLUDE);
    });
    expect(hookResult!.pinnedShowing).toBeNull();
  });
});
