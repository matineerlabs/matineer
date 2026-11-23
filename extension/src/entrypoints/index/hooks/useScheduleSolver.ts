import { MovieDayStatus } from '../../../shared/types/movie';
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BreakConfig, Movie, PinnedShowing, Schedule } from "../types/api";
import { solveSchedules } from "../api/client";
import { parseMarathonDayMinutes, minutesToTimeString } from "../../../shared/utils/time";
import { getDefaultBreakSize } from "../../../shared/types/breaks";
import { MarathonConfigContextType } from "../context/MarathonConfigContext";
import { useOptionalSettings } from "../context/SettingsContext";

interface UseScheduleSolverOptions {
  theaterId: string;
  selectedDate: string;
  movies: Movie[];
  pinnedShowing?: PinnedShowing | null;
  selectedMoviesCount?: number;
  mustSeeTitles?: string[];
}

export function useScheduleSolver({
  theaterId,
  selectedDate,
  movies,
  pinnedShowing = null,
  selectedMoviesCount,
  mustSeeTitles,
}: UseScheduleSolverOptions) {
  const settingsContext = useOptionalSettings();
  const settings = settingsContext?.settings;

  // Marathon Rules initialized from settings defaults
  const [numMovies, setNumMovies] = useState<number>(3);
  const [earliestStart, setEarliestStart] = useState<string>(
    settings?.defaultEarliestStart || "9:30am"
  );
  const [latestEnd, setLatestEnd] = useState<string>(
    settings?.defaultLatestEnd || "10:30pm"
  );
  const [trailerMin, setTrailerMin] = useState<number>(
    typeof settings?.defaultTrailerMin === "number" ? settings.defaultTrailerMin : 25
  );
  const [minWaitMin, setMinWaitMin] = useState<number>(
    typeof settings?.defaultMinWaitMin === "number" ? settings.defaultMinWaitMin : -20
  );
  const [maxWaitMin, setMaxWaitMin] = useState<number>(
    typeof settings?.defaultMaxWaitMin === "number" ? settings.defaultMaxWaitMin : 15
  );
  const [breaks, setBreaks] = useState<BreakConfig[]>([]);

  // Update defaults on initial load of settings from storage and sync trailerMin when changed in settings
  const hasLoadedSettingsRef = useRef<boolean>(false);
  const prevDefaultTrailerMinRef = useRef<number | undefined>(settings?.defaultTrailerMin);
  useEffect(() => {
    if (settingsContext?.isLoaded) {
      if (!hasLoadedSettingsRef.current) {
        hasLoadedSettingsRef.current = true;
        if (settings?.defaultEarliestStart) setEarliestStart(settings.defaultEarliestStart);
        if (settings?.defaultLatestEnd) setLatestEnd(settings.defaultLatestEnd);
        if (typeof settings?.defaultTrailerMin === "number") setTrailerMin(settings.defaultTrailerMin);
        if (typeof settings?.defaultMinWaitMin === "number") setMinWaitMin(settings.defaultMinWaitMin);
        if (typeof settings?.defaultMaxWaitMin === "number") setMaxWaitMin(settings.defaultMaxWaitMin);
        prevDefaultTrailerMinRef.current = settings?.defaultTrailerMin;
      } else if (
        typeof settings?.defaultTrailerMin === "number" &&
        settings.defaultTrailerMin !== prevDefaultTrailerMinRef.current
      ) {
        prevDefaultTrailerMinRef.current = settings.defaultTrailerMin;
        setTrailerMin(settings.defaultTrailerMin);
      }
    }
  }, [settingsContext?.isLoaded, settings]);

  // Schedules state
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isSolving, setIsSolving] = useState<boolean>(false);

  const moviesRef = useRef<Movie[]>(movies);
  moviesRef.current = movies;

  const abortControllerRef = useRef<AbortController | null>(null);
  const solveRequestIdRef = useRef<number>(0);

  // Stable signature of movie scheduling inputs (title, status, formats).
  // Live metadata streaming updates (ratings, plots, posters) will NOT mutate this signature.
  const solverMovieSignature = useMemo(() => {
    return movies
      .map(
        (m) =>
          `${m.title}|${m.status}|${m.user_status}|${(m.allowed_formats || []).join(",")}`
      )
      .join(";");
  }, [movies]);

  // Derive candidate movies count and must-see list stably based on solverMovieSignature
  const { derivedCandidateCount, derivedMustSeeTitles } = useMemo(() => {
    const candidateCount = moviesRef.current.filter(
      (m) =>
        (m.status === MovieDayStatus.MUST_SEE || m.status === MovieDayStatus.INCLUDE) &&
        (!m.allowed_formats || m.allowed_formats.length > 0)
    ).length;
    const mustSees = moviesRef.current
      .filter((m) => m.status === MovieDayStatus.MUST_SEE)
      .map((m) => m.title);
    return {
      derivedCandidateCount: candidateCount,
      derivedMustSeeTitles: mustSees,
    };
  }, [solverMovieSignature]);

  const effectiveCandidateCount =
    selectedMoviesCount !== undefined ? selectedMoviesCount : derivedCandidateCount;
  const effectiveMustSeeTitles = mustSeeTitles ?? derivedMustSeeTitles;
  const effectiveMustSeeCount = effectiveMustSeeTitles.length;

  // Coordinated rule changes
  const handleEarliestStartChange = useCallback(
    (val: string) => {
      setEarliestStart(val);
      const startMins = parseMarathonDayMinutes(val);
      const endMins = parseMarathonDayMinutes(latestEnd);
      if (startMins >= endMins) {
        // Auto-bump latestEnd to be at least 2h after earliestStart (clamped to 2:00am next day = 1560m)
        const bumpedMins = Math.min(1560, startMins + 120);
        const bumpedEnd = minutesToTimeString(bumpedMins % 1440);
        setLatestEnd(bumpedEnd);
      }
    },
    [latestEnd]
  );

  const handleLatestEndChange = useCallback(
    (val: string) => {
      const endMins = parseMarathonDayMinutes(val);
      const startMins = parseMarathonDayMinutes(earliestStart);
      if (endMins <= startMins) {
        // Auto-adjust earliestStart to be at least 2h before latestEnd (clamped to 6:00am = 360m)
        const adjustedMins = Math.max(360, endMins - 120);
        const adjustedStart = minutesToTimeString(adjustedMins % 1440);
        setEarliestStart(adjustedStart);
      }
      setLatestEnd(val);
    },
    [earliestStart]
  );

  const handleTrailerMinChange = useCallback((val: number) => {
    setTrailerMin(val);
    const minLimit = val === 0 ? 0 : -val;
    setMinWaitMin((prevMin) => {
      const nextMin = Math.max(prevMin, minLimit);
      return nextMin === 0 ? 0 : nextMin;
    });
    setMaxWaitMin((prevMax) => Math.max(prevMax, minLimit + 10));
  }, []);

  const handleMinWaitMinChange = useCallback(
    (val: number) => {
      const minLimit = trailerMin === 0 ? 0 : -trailerMin;
      const clampedVal = Math.max(minLimit, val);
      const res = Math.min(clampedVal, maxWaitMin - 10);
      setMinWaitMin(res === 0 ? 0 : res);
    },
    [maxWaitMin, trailerMin]
  );

  const handleMaxWaitMinChange = useCallback(
    (val: number) => {
      const maxLimit = 60;
      const clampedVal = Math.min(maxLimit, val);
      const res = Math.max(clampedVal, minWaitMin + 10);
      setMaxWaitMin(res === 0 ? 0 : res);
    },
    [minWaitMin]
  );

  // Handlers for breaks
  const handleAddBreak = useCallback(
    (intent: BreakConfig["intent"]) => {
      // Disallow if max allowed breaks already added
      if (breaks.length >= Math.max(0, numMovies - 1)) {
        return;
      }
      // Only allow 1 lunch or 1 dinner break
      if (intent === "Lunch" && breaks.some((b) => b.intent === "Lunch")) {
        return;
      }
      if (intent === "Dinner" && breaks.some((b) => b.intent === "Dinner")) {
        return;
      }
      const newBrk: BreakConfig = {
        id: `brk-${Date.now()}-${Math.random()}`,
        intent,
        size: getDefaultBreakSize(intent),
      };
      setBreaks((prev) => [...prev, newBrk]);
    },
    [breaks, numMovies]
  );

  const handleRemoveBreak = useCallback((id: string) => {
    setBreaks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleUpdateBreakSize = useCallback((id: string, size: string) => {
    setBreaks((prev) => prev.map((b) => (b.id === id ? { ...b, size } : b)));
  }, []);

  // Pack unified marathon configuration object for MarathonConfigProvider
  const marathonConfig = useMemo<MarathonConfigContextType>(
    () => ({
      numMovies,
      onNumMoviesChange: setNumMovies,
      earliestStart,
      onEarliestStartChange: handleEarliestStartChange,
      latestEnd,
      onLatestEndChange: handleLatestEndChange,
      trailerMin,
      onTrailerMinChange: handleTrailerMinChange,
      minWaitMin,
      onMinWaitMinChange: handleMinWaitMinChange,
      maxWaitMin,
      onMaxWaitMinChange: handleMaxWaitMinChange,
      breaks,
      onAddBreak: handleAddBreak,
      onRemoveBreak: handleRemoveBreak,
      onUpdateBreakSize: handleUpdateBreakSize,
    }),
    [
      numMovies,
      earliestStart,
      handleEarliestStartChange,
      latestEnd,
      handleLatestEndChange,
      trailerMin,
      handleTrailerMinChange,
      minWaitMin,
      handleMinWaitMinChange,
      maxWaitMin,
      handleMaxWaitMinChange,
      breaks,
      handleAddBreak,
      handleRemoveBreak,
      handleUpdateBreakSize,
    ]
  );

  // Solve schedules function with cancellation & request sequencing
  const handleSolve = useCallback(async () => {
    if (!selectedDate || !theaterId) return;
    const startMins = parseMarathonDayMinutes(earliestStart);
    const endMins = parseMarathonDayMinutes(latestEnd);
    if (
      effectiveCandidateCount < numMovies ||
      effectiveMustSeeCount > numMovies ||
      endMins <= startMins
    ) {
      setSchedules([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const currentRequestId = ++solveRequestIdRef.current;

    setIsSolving(true);
    try {
      const movieFormats: Record<string, string[]> = {};
      moviesRef.current.forEach((m) => {
        movieFormats[m.title] = m.allowed_formats || [];
      });

      const results = await solveSchedules(
        {
          theater_id: theaterId,
          date: selectedDate,
          num_movies: numMovies,
          earliest_start: earliestStart,
          latest_end: latestEnd,
          trailer_min: trailerMin,
          min_wait_min: minWaitMin,
          max_wait_min: maxWaitMin,
          breaks: breaks,
          movie_formats: movieFormats,
          pinned_showing: pinnedShowing || undefined,
          prefer_premium_formats: settings?.preferPremiumFormats ?? true,
        },
        abortController.signal
      );

      if (currentRequestId === solveRequestIdRef.current) {
        setSchedules(results);
      }
    } catch (e: any) {
      if (e?.name === "AbortError" || currentRequestId !== solveRequestIdRef.current) {
        return;
      }
      console.error(e);
    } finally {
      if (currentRequestId === solveRequestIdRef.current) {
        setIsSolving(false);
      }
    }
  }, [
    theaterId,
    selectedDate,
    numMovies,
    earliestStart,
    latestEnd,
    trailerMin,
    minWaitMin,
    maxWaitMin,
    breaks,
    solverMovieSignature,
    pinnedShowing,
    effectiveCandidateCount,
    effectiveMustSeeCount,
    settings?.preferPremiumFormats,
  ]);

  // Debounced auto-solve on rules, schedule inputs, or pinned showing change
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSolve();
    }, 250);
    return () => clearTimeout(timer);
  }, [handleSolve]);

  // Clear schedules when theater or date is unselected
  useEffect(() => {
    if (!theaterId || !selectedDate) {
      setSchedules([]);
    }
  }, [theaterId, selectedDate]);

  // Clean up in-flight solve requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    marathonConfig,
    numMovies,
    setNumMovies,
    earliestStart,
    setEarliestStart: handleEarliestStartChange,
    latestEnd,
    setLatestEnd: handleLatestEndChange,
    trailerMin,
    setTrailerMin,
    handleTrailerMinChange,
    minWaitMin,
    setMinWaitMin: handleMinWaitMinChange,
    maxWaitMin,
    setMaxWaitMin: handleMaxWaitMinChange,
    breaks,
    setBreaks,
    handleAddBreak,
    handleRemoveBreak,
    handleUpdateBreakSize,
    schedules,
    setSchedules,
    isSolving,
    handleSolve,
  };
}
