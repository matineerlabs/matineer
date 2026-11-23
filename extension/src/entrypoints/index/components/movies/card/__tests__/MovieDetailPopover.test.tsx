import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MovieDetailPopover } from "../MovieDetailPopover";
import type { Movie } from "../../../../types/api";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const createMockMovie = (overrides?: Partial<Movie>): Movie => ({
  title: "Dune: Part Two",
  runtime_min: 166,
  runtime_str: "2h 46m",
  poster_url: "https://amc-theatres-res.cloudinary.com/image/upload/dune2.jpg",
  rated: "PG-13",
  genre: "Action, Adventure, Sci-Fi",
  plot: "Paul Atreides unites with Chani and the Fremen while seeking revenge.",
  rt_score: "92%",
  audience_score: "95%",
  imdb_rating: "8.5",
  is_a_list_eligible: true,
  all_formats: ["Dolby Cinema at AMC", "IMAX with Laser at AMC"],
  program_labels: ["Fan Faves"],
  ...overrides,
});

describe("MovieDetailPopover", () => {
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

  it("renders movie title, specs, and normalized MPAA rating", () => {
    const movie = createMockMovie();
    act(() => {
      root?.render(<MovieDetailPopover movie={movie} />);
    });

    expect(container?.textContent).toContain("Dune: Part Two");
    expect(container?.textContent).toContain("2h 46m");
    expect(container?.textContent).toContain("PG-13");
  });

  it("renders genres and overview synopsis", () => {
    const movie = createMockMovie();
    act(() => {
      root?.render(<MovieDetailPopover movie={movie} />);
    });

    expect(container?.textContent).toContain("Action • Adventure • Sci-Fi");
    expect(container?.textContent).toContain("Paul Atreides unites with Chani and the Fremen while seeking revenge.");
  });

  it("renders Rotten Tomatoes and IMDb ratings", () => {
    const movie = createMockMovie();
    act(() => {
      root?.render(<MovieDetailPopover movie={movie} />);
    });

    expect(container?.textContent).toContain("92%");
    expect(container?.textContent).toContain("95%");
    expect(container?.textContent).toContain("8.5");
  });

  it("renders promotional programs and formats", () => {
    const movie = createMockMovie();
    act(() => {
      root?.render(<MovieDetailPopover movie={movie} />);
    });

    expect(container?.textContent).toContain("★ Fan Faves");
    expect(container?.textContent).toContain("Dolby Cinema at AMC");
    expect(container?.textContent).toContain("IMAX with Laser at AMC");
  });

  it("handles mouse events for popover dwell time", () => {
    const onEnter = vi.fn();
    const onLeave = vi.fn();
    const movie = createMockMovie();

    act(() => {
      root?.render(
        <MovieDetailPopover
          movie={movie}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        />
      );
    });

    const popover = container?.querySelector('[role="tooltip"]');
    expect(popover).not.toBeNull();

    act(() => {
      popover?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      popover?.dispatchEvent(new MouseEvent("mouseenter"));
    });
    expect(onEnter).toHaveBeenCalled();

    act(() => {
      popover?.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      popover?.dispatchEvent(new MouseEvent("mouseleave"));
    });
    expect(onLeave).toHaveBeenCalled();
  });
});
