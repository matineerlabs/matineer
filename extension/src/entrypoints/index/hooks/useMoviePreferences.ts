import { MovieDayStatus, UserMovieStatus } from '../../../shared/types/movie';
import { normalizeFormatName } from '../../../shared/types/formats';
import { useState, useMemo, useCallback, useRef } from "react";
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
  const moviesRef = useRef<Movie[]>(movies);
  moviesRef.current = movies;

  const getPersistedFormats = (allFormats: string[], allowedFormats: string[]): string[] | null => {
    const allowedSet = new Set(allowedFormats.map(normalizeFormatName));
    const allEnabled =
      allFormats.length > 0 && allFormats.every((f) => allowedSet.has(normalizeFormatName(f)));
    return allEnabled ? null : allowedFormats;
  };

  const handleUnpinShowing = useCallback((_title?: string) => {
    setPinnedShowing(null);
  }, []);

  // Pin a specific screening: forces Must See, ensures active and format enabled, and records pinnedShowing
  const handlePinShowing = useCallback(
    (movie: Movie, formatName: string, showing: ShowingItem) => {
      const fmtNorm = normalizeFormatName(formatName);
      const currentMovie =
        moviesRef.current.find((m) => m.title === movie.title) || movie;
      const currentAllowed =
        currentMovie.allowed_formats ?? currentMovie.all_formats ?? [];
      const isAlreadyAllowed = currentAllowed.some(
        (f) => normalizeFormatName(f) === fmtNorm
      );
      const nextAllowed = isAlreadyAllowed
        ? currentAllowed
        : [...currentAllowed, formatName];

      moviesRef.current = moviesRef.current.map((m) =>
        m.title === movie.title
          ? {
              ...m,
              status: MovieDayStatus.MUST_SEE,
              user_status: UserMovieStatus.ACTIVE,
              allowed_formats: nextAllowed,
            }
          : m
      );

      onMoviesUpdated((prev) =>
        prev.map((m) =>
          m.title === movie.title
            ? {
                ...m,
                status: MovieDayStatus.MUST_SEE,
                user_status: UserMovieStatus.ACTIVE,
                allowed_formats: nextAllowed,
              }
            : m
        )
      );

      if (dateStr) {
        const formatsToPersist = isAlreadyAllowed
          ? undefined
          : getPersistedFormats(currentMovie.all_formats || [], nextAllowed);
        updateDaySelection(
          dateStr,
          movie.title,
          MovieDayStatus.MUST_SEE,
          formatsToPersist
        ).catch(() => {});
      }
      if (currentMovie.user_status !== UserMovieStatus.ACTIVE) {
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
      const fmtNorm = normalizeFormatName(fmt);

      const targetMovie = moviesRef.current.find(
        (m) => m.title.trim().toLowerCase() === title.trim().toLowerCase()
      );
      if (!targetMovie) return;

      const targetAllowed = targetMovie.allowed_formats || [];
      const isCurrentlyAllowed = targetAllowed.some(
        (f) => normalizeFormatName(f) === fmtNorm
      );

      // Prevent toggling off the last remaining allowed format
      if (isCurrentlyAllowed) {
        const remainingAllowed = targetAllowed.filter(
          (f) => normalizeFormatName(f) !== fmtNorm
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
        const pinnedFmtNorm = normalizeFormatName(pinnedShowing.format_name);
        if (isCurrentlyAllowed && fmtNorm === pinnedFmtNorm) {
          setPinnedShowing(null);
        }
      }

      const updatedAllowed = isCurrentlyAllowed
        ? targetAllowed.filter((f) => normalizeFormatName(f) !== fmtNorm)
        : [...targetAllowed, fmt];

      // Update ref synchronously so back-to-back toggles in the same render tick don't clobber each other
      moviesRef.current = moviesRef.current.map((m) =>
        m.title === targetMovie.title ? { ...m, allowed_formats: updatedAllowed } : m
      );

      onMoviesUpdated((prev) =>
        prev.map((m) =>
          m.title === targetMovie.title ? { ...m, allowed_formats: updatedAllowed } : m
        )
      );

      if (dateStr) {
        updateDaySelection(
          dateStr,
          targetMovie.title,
          targetMovie.status ?? MovieDayStatus.INCLUDE,
          getPersistedFormats(targetMovie.all_formats || [], updatedAllowed)
        ).catch(() => {});
      }
    },
    [dateStr, pinnedShowing, onMoviesUpdated]
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
      const nextDayStatus = isNowInactive ? MovieDayStatus.EXCLUDE : MovieDayStatus.INCLUDE;
      onMoviesUpdated((prev) =>
        prev.map((m) => {
          if (m.title !== title) return m;
          return { ...m, user_status: st, status: nextDayStatus };
        })
      );
      await updateMovieStatus(title, st);
      if (dateStr) {
        await updateDaySelection(dateStr, title, nextDayStatus);
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
    setPinnedShowing(null);
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
