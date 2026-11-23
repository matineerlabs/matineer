import { MovieDayStatus, UserMovieStatus } from '../../../shared/types/movie';
import { useState, useMemo, useCallback } from "react";
import { Movie, PinnedShowing, ShowingItem } from "../types/api";
import {
  batchUpdateDay,
  updateDaySelection,
  updateMovieStatus,
} from "../api/client";

export function useMoviePreferences(
  dateStr: string,
  movies: Movie[],
  onMoviesUpdated: React.Dispatch<React.SetStateAction<Movie[]>>,
  initialPinnedShowing: PinnedShowing | null = null
) {
  // Pinned showing state (at most 1 active pin across the entire app)
  const [pinnedShowing, setPinnedShowing] = useState<PinnedShowing | null>(
    initialPinnedShowing
  );

  const handleUnpinShowing = useCallback((_title?: string) => {
    setPinnedShowing(null);
  }, []);

  // Pin a specific screening: forces Must See, ensures active and format enabled, and records pinnedShowing
  const handlePinShowing = useCallback(
    (movie: Movie, formatName: string, showing: ShowingItem) => {
      const normalizeFmt = (f: string) =>
        !f || f.toLowerCase() === "undefined" ? "digital" : f.trim().toLowerCase();
      const fmtNorm = normalizeFmt(formatName);

      onMoviesUpdated((prev) =>
        prev.map((m) => {
          if (m.title !== movie.title) return m;
          const currentAllowed = m.allowed_formats || [];
          const isAlreadyAllowed = currentAllowed.some(
            (f) => normalizeFmt(f) === fmtNorm
          );
          const nextAllowed = isAlreadyAllowed
            ? currentAllowed
            : [...currentAllowed, formatName];
          return {
            ...m,
            status: MovieDayStatus.MUST_SEE,
            user_status: UserMovieStatus.ACTIVE,
            allowed_formats: nextAllowed,
          };
        })
      );

      if (dateStr) {
        updateDaySelection(dateStr, movie.title, MovieDayStatus.MUST_SEE).catch(() => {});
      }
      if (movie.user_status !== UserMovieStatus.ACTIVE) {
        updateMovieStatus(movie.title, UserMovieStatus.ACTIVE).catch(() => {});
      }

      setPinnedShowing({
        title: movie.title,
        format_name: formatName,
        time: showing.time,
        url: showing.url,
      });
    },
    [dateStr, onMoviesUpdated]
  );

  // Count movies that are candidate for schedule (Must See or Include, has at least one format allowed)
  const selectedMoviesCount = useMemo(() => {
    return movies.filter(
      (m) =>
        (m.status === MovieDayStatus.MUST_SEE || m.status === MovieDayStatus.INCLUDE) &&
        (!m.allowed_formats || m.allowed_formats.length > 0)
    ).length;
  }, [movies]);

  // Must See movies (both active and inactive)
  const mustSeeTitles = useMemo(() => {
    return movies
      .filter((m) => m.status === MovieDayStatus.MUST_SEE)
      .map((m) => m.title);
  }, [movies]);

  // Change individual movie status (Must See, Include, Exclude)
  const handleMovieStatusChange = useCallback(
    async (title: string, status: MovieDayStatus) => {
      // If unsetting Must See (Include or Exclude), clear pin
      if (
        status !== MovieDayStatus.MUST_SEE &&
        pinnedShowing &&
        pinnedShowing.title.trim().toLowerCase() === title.trim().toLowerCase()
      ) {
        setPinnedShowing(null);
      }
      onMoviesUpdated((prev) =>
        prev.map((m) => (m.title === title ? { ...m, status } : m))
      );
      if (dateStr) {
        await updateDaySelection(dateStr, title, status);
      }
    },
    [dateStr, pinnedShowing, onMoviesUpdated]
  );

  // Toggle format allowance for a movie
  const handleFormatToggle = useCallback(
    (title: string, fmt: string) => {
      const normalizeFmt = (f: string) =>
        !f || f.toLowerCase() === "undefined" ? "digital" : f.trim().toLowerCase();
      const fmtNorm = normalizeFmt(fmt);

      const targetMovie = movies.find(
        (m) => m.title.trim().toLowerCase() === title.trim().toLowerCase()
      );
      if (!targetMovie) return;

      const targetAllowed = targetMovie.allowed_formats || [];
      const isCurrentlyAllowed = targetAllowed.some(
        (f) => normalizeFmt(f) === fmtNorm
      );

      // Prevent toggling off the last remaining allowed format
      if (isCurrentlyAllowed) {
        const remainingAllowed = targetAllowed.filter(
          (f) => normalizeFmt(f) !== fmtNorm
        );
        if (remainingAllowed.length === 0) {
          return; // At least one format must remain selected
        }
      }

      // If toggling off the format of the currently pinned showtime, unpin immediately
      if (
        pinnedShowing &&
        pinnedShowing.title.trim().toLowerCase() === title.trim().toLowerCase()
      ) {
        const pinnedFmtNorm = normalizeFmt(pinnedShowing.format_name);
        if (isCurrentlyAllowed && fmtNorm === pinnedFmtNorm) {
          setPinnedShowing(null);
        }
      }

      onMoviesUpdated((prev) =>
        prev.map((m) => {
          if (m.title !== title) return m;
          const currentAllowed = m.allowed_formats || [];
          const exists = currentAllowed.some((f) => normalizeFmt(f) === fmtNorm);
          const updated = exists
            ? currentAllowed.filter((f) => normalizeFmt(f) !== fmtNorm)
            : [...currentAllowed, fmt];
          return { ...m, allowed_formats: updated };
        })
      );
    },
    [movies, pinnedShowing, onMoviesUpdated]
  );

  // Change user status (seen, wont_watch, active)
  const handleUserStatusChange = useCallback(
    async (title: string, st: UserMovieStatus) => {
      // If marking as seen or won't watch, clear pin
      if (
        st !== UserMovieStatus.ACTIVE &&
        pinnedShowing &&
        pinnedShowing.title.trim().toLowerCase() === title.trim().toLowerCase()
      ) {
        setPinnedShowing(null);
      }
      const isNowInactive = st !== UserMovieStatus.ACTIVE;
      onMoviesUpdated((prev) =>
        prev.map((m) => {
          if (m.title !== title) return m;
          return { ...m, user_status: st, status: isNowInactive ? MovieDayStatus.EXCLUDE : m.status };
        })
      );
      await updateMovieStatus(title, st);
      if (isNowInactive && dateStr) {
        await updateDaySelection(dateStr, title, MovieDayStatus.EXCLUDE);
      }
    },
    [dateStr, pinnedShowing, onMoviesUpdated]
  );

  // Exclude all active movies
  const handleExcludeAll = useCallback(async () => {
    setPinnedShowing(null);
    const activeMovies = movies.filter((m) => m.user_status === UserMovieStatus.ACTIVE);
    const titles = activeMovies.map((m) => m.title);
    onMoviesUpdated((prev) =>
      prev.map((m) => (m.user_status === UserMovieStatus.ACTIVE ? { ...m, status: MovieDayStatus.EXCLUDE } : m))
    );
    if (dateStr) {
      await batchUpdateDay(dateStr, titles, MovieDayStatus.EXCLUDE);
    }
  }, [dateStr, movies, onMoviesUpdated]);

  // Include all active movies
  const handleIncludeAll = useCallback(async () => {
    const activeMovies = movies.filter((m) => m.user_status === UserMovieStatus.ACTIVE);
    const titles = activeMovies.map((m) => m.title);
    onMoviesUpdated((prev) =>
      prev.map((m) => (m.user_status === UserMovieStatus.ACTIVE ? { ...m, status: MovieDayStatus.INCLUDE } : m))
    );
    if (dateStr) {
      await batchUpdateDay(dateStr, titles, MovieDayStatus.INCLUDE);
    }
  }, [dateStr, movies, onMoviesUpdated]);

  return {
    pinnedShowing,
    setPinnedShowing,
    handlePinShowing,
    handleUnpinShowing,
    selectedMoviesCount,
    mustSeeTitles,
    handleMovieStatusChange,
    handleFormatToggle,
    handleUserStatusChange,
    handleExcludeAll,
    handleIncludeAll,
  };
}
