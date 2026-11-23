import { MovieDayStatus, UserMovieStatus } from '../../../shared/types/movie';
import { useState, useRef, useEffect, useCallback } from "react";
import { fetchShowtimes, subscribeMetadataStream } from "../api/client";
import { MetadataProgressState, Movie } from "../types/api";

export function useShowtimes(
  theaterId: string,
  selectedDate: string,
  mdblistApiKey: string,
  showRatings: boolean = true
) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [showtimesUrl, setShowtimesUrl] = useState<string>("");
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [scrapeStatus, setScrapeStatus] = useState<string>("");

  const [metadataProgress, setMetadataProgress] = useState<MetadataProgressState>({
    isOpen: false,
    status: "idle",
    current: 0,
    total: 0,
  });

  const metadataUnsubRef = useRef<(() => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevShowRatingsRef = useRef<boolean>(showRatings);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  // Cancel in-flight showtimes loading
  const handleCancelShowtimesLoading = useCallback(() => {
    clearDismissTimer();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (metadataUnsubRef.current) {
      metadataUnsubRef.current();
      metadataUnsubRef.current = null;
    }
    setIsScraping(false);
    setScrapeStatus("");
    setMetadataProgress({ isOpen: false, status: "idle", current: 0, total: 0 });
  }, [clearDismissTimer]);

  // Cancel in-flight ratings metadata stream
  const handleCancelMetadata = useCallback(() => {
    clearDismissTimer();
    if (metadataUnsubRef.current) {
      metadataUnsubRef.current();
      metadataUnsubRef.current = null;
    }
    setMetadataProgress((prev) => ({ ...prev, isOpen: false, status: "idle" }));
  }, [clearDismissTimer]);

  const startMetadataStream = useCallback(
    (overrideMdblistKey?: string) => {
      if (!theaterId || !selectedDate) return;
      const keyToUse = overrideMdblistKey !== undefined ? overrideMdblistKey : mdblistApiKey;
      if (metadataUnsubRef.current) {
        metadataUnsubRef.current();
        metadataUnsubRef.current = null;
      }
      const unsub = subscribeMetadataStream(
        theaterId,
        selectedDate,
        keyToUse,
        (evt) => {
          if (evt.type === "start") {
            setMetadataProgress({
              isOpen: true,
              status: "running",
              title: "Updating Movie Ratings",
              current: 0,
              total: evt.total,
            });
          } else if (evt.type === "movie_updated") {
            setMetadataProgress((prev) => ({
              ...prev,
              isOpen: true,
              status: "running",
              title: "Updating Movie Ratings",
              current: evt.current,
              total: evt.total,
              currentTitle: evt.title,
            }));

            // Live update the specific movie card without page refresh
            setMovies((prevMovies) =>
              prevMovies.map((m) => {
                if (m.title !== evt.title) return m;
                const hadRatings = Boolean(m.rt_score || m.audience_score || m.imdb_rating);
                const hasNewRatings = Boolean(evt.rt_score || evt.audience_score || evt.imdb_rating);
                return {
                  ...m,
                  rt_score: evt.rt_score ?? m.rt_score,
                  audience_score: evt.audience_score ?? m.audience_score,
                  imdb_rating: evt.imdb_rating ?? m.imdb_rating,
                  imdb_id: evt.imdb_id ?? m.imdb_id,
                  rated: evt.rated ?? m.rated,
                  genre: evt.genre ?? m.genre,
                  plot: evt.plot ?? m.plot,
                  live_ratings_populated: !hadRatings && hasNewRatings,
                };
              })
            );
          } else if (evt.type === "complete") {
            if (evt.total === 0) {
              // All movies on this date/theater already had their ratings cached globally
              setMetadataProgress({ isOpen: false, status: "idle", current: 0, total: 0 });
              return;
            }
            setMetadataProgress({
              isOpen: true,
              status: "complete",
              title: "Showtimes & Ratings Ready",
              subtitle: `Updated ratings for ${evt.total} movies`,
              current: evt.total,
              total: evt.total,
            });
            // Dismiss after 2.5 seconds with tracked timer cleanup
            clearDismissTimer();
            dismissTimerRef.current = setTimeout(() => {
              setMetadataProgress((prev) => ({ ...prev, isOpen: false, status: "idle" }));
              dismissTimerRef.current = null;
            }, 1800);
          }
        }
      );
      metadataUnsubRef.current = unsub;
    },
    [theaterId, selectedDate, mdblistApiKey, clearDismissTimer]
  );

  // Load showtimes when theater or date changes
  const loadShowtimes = useCallback(
    async (force: boolean = false, keyOverride?: string) => {
      clearDismissTimer();
      if (!selectedDate) {
        setMovies([]);
        return;
      }
      const keyToUse = keyOverride !== undefined ? keyOverride : mdblistApiKey;

      // Abort previous showtimes fetch if in-flight
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsScraping(true);
      setScrapeStatus(force ? "Scraping live showtimes..." : "Loading showtimes...");

      // Clean up any ongoing metadata stream
      if (metadataUnsubRef.current) {
        metadataUnsubRef.current();
        metadataUnsubRef.current = null;
      }

      setMetadataProgress({
        isOpen: false,
        status: "idle",
        current: 0,
        total: 0,
      });

      try {
        const data = await fetchShowtimes(
          theaterId,
          selectedDate,
          force,
          keyToUse,
          abortController.signal
        );

        const sanitizedMovies: Movie[] = (data.movies || []).map((m) => {
          const formats =
            m.all_formats && m.all_formats.length > 0
              ? m.all_formats
              : Object.keys(m.showings_by_format || {});
          return {
            ...m,
            all_formats: formats,
            allowed_formats:
              !m.allowed_formats || m.allowed_formats.length === 0
                ? [...formats]
                : m.allowed_formats,
            user_status: m.user_status || UserMovieStatus.ACTIVE,
            status: m.status || MovieDayStatus.INCLUDE,
          };
        });
        setMovies(sanitizedMovies);
        setShowtimesUrl(data.showtimes_url || "");
        setScrapeStatus("");

        // If ratings are enabled, start listening to live metadata stream for missing ratings
        if (showRatings) {
          startMetadataStream(keyToUse);
        }
      } catch (e: unknown) {
        const err = e as { name?: string; message?: string };
        if (err.name === "AbortError") {
          setScrapeStatus("");
          setMetadataProgress({ isOpen: false, status: "idle", current: 0, total: 0 });
          return;
        }
        const errorMsg = err.message || "Unknown error";
        setScrapeStatus(`Error: ${errorMsg}`);
        setMetadataProgress({
          isOpen: true,
          status: "complete",
          title: "Error Loading Showtimes",
          subtitle: errorMsg,
          current: 0,
          total: 0,
        });
        clearDismissTimer();
        dismissTimerRef.current = setTimeout(() => {
          setMetadataProgress((prev) => ({ ...prev, isOpen: false, status: "idle" }));
          dismissTimerRef.current = null;
        }, 3000);
      } finally {
        setIsScraping(false);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [theaterId, selectedDate, mdblistApiKey, showRatings, startMetadataStream, clearDismissTimer]
  );

  // If showRatings setting toggles dynamically, stop or restart the metadata stream
  useEffect(() => {
    if (prevShowRatingsRef.current !== showRatings) {
      prevShowRatingsRef.current = showRatings;
      if (!showRatings) {
        if (metadataUnsubRef.current) {
          metadataUnsubRef.current();
          metadataUnsubRef.current = null;
        }
        setMetadataProgress({ isOpen: false, status: "idle", current: 0, total: 0 });
      } else {
        // Re-enabled: if we have movies loaded and active theater/date, start stream!
        if (theaterId && selectedDate && movies.length > 0 && !metadataUnsubRef.current) {
          startMetadataStream(mdblistApiKey);
        }
      }
    }
  }, [showRatings, theaterId, selectedDate, movies.length, mdblistApiKey, startMetadataStream]);

  // Auto-fetch showtimes on theater or date change
  useEffect(() => {
    if (theaterId && selectedDate) {
      loadShowtimes(false);
    } else {
      handleCancelShowtimesLoading();
      setMovies([]);
    }
  }, [theaterId, selectedDate, loadShowtimes, handleCancelShowtimesLoading]);

  // Clean up metadata stream and timers on unmount
  useEffect(() => {
    return () => {
      clearDismissTimer();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (metadataUnsubRef.current) {
        metadataUnsubRef.current();
      }
    };
  }, [clearDismissTimer]);

  return {
    movies,
    setMovies,
    showtimesUrl,
    isScraping,
    scrapeStatus,
    setScrapeStatus,
    metadataProgress,
    loadShowtimes,
    handleCancelShowtimesLoading,
    handleCancelMetadata,
  };
}
