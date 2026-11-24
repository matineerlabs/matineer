import { MovieDayStatus, UserMovieStatus } from '../../../../shared/types/movie';
import { useClickOutside } from "../../hooks/useClickOutside";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Ban, Calendar, Check, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Eye, EyeOff, Film, Loader2, MapPin, RotateCw, Sparkles, X } from "lucide-react";
import { MetadataProgressState, Movie, PinnedShowing, ShowingItem } from "../../types/api";
import { formatFriendlyDate } from "../../../../shared/utils/time";
import { MovieCard } from "./MovieCard";
import { useOptionalSettings } from "../../context/SettingsContext";
import { getStorageItem, setStorageItem, STORAGE_KEYS } from "../../../../shared/utils/storage";

interface MoviesTabProps {
  movies: Movie[];
  isLoading?: boolean;
  selectedDate?: string;
  selectedTheaterId?: string;
  theaterName?: string;
  showtimesUrl?: string;
  metadataProgress?: MetadataProgressState;
  onCancelLoading?: () => void;
  onCancelMetadata?: () => void;
  pinnedShowing?: PinnedShowing | null;
  onOpenTheaterModal?: () => void;
  onOpenSettings?: () => void;
  onMovieStatusChange: (title: string, status: MovieDayStatus) => void;
  onFormatToggle: (title: string, fmt: string) => void;
  onUserStatusChange: (title: string, st: UserMovieStatus) => void;
  onPinShowing?: (movie: Movie, formatName: string, showing: ShowingItem) => void;
  onUnpinShowing?: (title: string) => void;
  onSelectAnchor?: (movie: Movie, formatName: string, showing: ShowingItem) => void;
  onIncludeAll: () => void;
  onExcludeAll: () => void;
  onRefreshShowtimes?: () => void;
}

const MovieCardSkeleton: React.FC = () => (
  <div className="bg-dark-card border border-dark-border rounded-lg p-3.5 space-y-2.5 animate-pulse">
    <div className="flex items-start justify-between gap-3 min-h-[50px]">
      {/* Left: Poster + Details */}
      <div className="flex items-start space-x-3 min-w-0 flex-1">
        <div className="w-12 h-12 rounded-full bg-dark-surface border border-dark-border/60 flex-shrink-0" />
        <div className="space-y-2 min-w-0 flex-1 pt-0.5">
          {/* Row 1: Title, Runtime, Badges */}
          <div className="flex items-center space-x-2">
            <div className="h-4 bg-dark-surface rounded w-36 sm:w-48" />
            <div className="h-3.5 bg-dark-surface rounded w-14" />
            <div className="h-4 bg-dark-surface rounded w-16" />
          </div>
          {/* Row 2: Trailer + Formats */}
          <div className="flex items-center space-x-2 pt-0.5">
            <div className="h-5 bg-dark-surface rounded w-16" />
            <div className="h-5 bg-dark-surface rounded w-20" />
            <div className="h-5 bg-dark-surface rounded w-24" />
          </div>
        </div>
      </div>

      {/* Right: Status and action skeletons */}
      <div className="flex items-center space-x-2 flex-shrink-0 pt-1">
        <div className="h-7 bg-dark-surface rounded-md w-28 hidden sm:block" />
        <div className="h-7 w-7 bg-dark-surface rounded-md" />
      </div>
    </div>
  </div>
);

const MoviesTabSkeleton: React.FC<{
  selectedDate?: string;
  theaterName?: string;
  onCancel?: () => void;
}> = ({ selectedDate, theaterName, onCancel }) => {
  const friendlyDate = selectedDate ? formatFriendlyDate(selectedDate) : "";
  const subtitle =
    theaterName && friendlyDate
      ? `Fetching schedules for ${theaterName} on ${friendlyDate}`
      : theaterName
      ? `Fetching schedules for ${theaterName}`
      : friendlyDate
      ? `Fetching schedules for ${friendlyDate}`
      : "Checking available movies & showtimes";

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Contextual Header with Spinner, Theater, Friendly Date and Cancel */}
      <div className="flex items-center justify-between bg-dark-card border border-dark-border rounded-lg p-3 px-4 shadow-sm">
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <Loader2 className="w-4 h-4 text-brand-blue animate-spin flex-shrink-0" />
          <div className="leading-tight min-w-0">
            <span className="text-xs sm:text-sm font-bold text-gray-200 block truncate">
              Loading showtimes & formats...
            </span>
            <span className="text-[11px] text-gray-400 block mt-0.5 truncate" title={subtitle}>
              {subtitle}
            </span>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="ml-3 px-2.5 py-1 rounded bg-dark-surface hover:bg-dark-hover border border-dark-border text-xs text-gray-300 hover:text-white font-medium flex items-center space-x-1.5 transition flex-shrink-0"
            title="Cancel loading showtimes"
          >
            <X className="w-3.5 h-3.5 text-red-400" />
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Skeleton Cards */}
      <div className="space-y-2.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <MovieCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export const MoviesTab: React.FC<MoviesTabProps> = ({
  movies,
  isLoading = false,
  selectedDate = "",
  selectedTheaterId = "",
  theaterName = "",
  showtimesUrl = "",
  metadataProgress,
  onCancelLoading,
  onCancelMetadata,
  pinnedShowing = null,
  onOpenTheaterModal,
  onOpenSettings,
  onMovieStatusChange,
  onFormatToggle,
  onUserStatusChange,
  onPinShowing,
  onUnpinShowing,
  onSelectAnchor,
  onIncludeAll,
  onExcludeAll,
  onRefreshShowtimes,
}) => {
  const settingsContext = useOptionalSettings();
  const rankNonAListLast = settingsContext?.settings?.rankNonAListLast ?? false;
  const mdblistApiKey = settingsContext?.settings?.mdblistApiKey ?? "";
  const showRatings = settingsContext?.settings?.showRatings ?? true;

  // Start hidden until async storage check resolves to avoid flicker if dismissed
  const [isMdblistPromptDismissed, setIsMdblistPromptDismissed] = useState(true);

  useEffect(() => {
    let active = true;
    getStorageItem<boolean>(STORAGE_KEYS.MDBLIST_PROMPT_DISMISSED, false).then((dismissed) => {
      if (active) setIsMdblistPromptDismissed(dismissed);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleDismissMdblistPrompt = () => {
    setIsMdblistPromptDismissed(true);
    setStorageItem(STORAGE_KEYS.MDBLIST_PROMPT_DISMISSED, true);
  };

  const showMdblistPrompt =
    Boolean(settingsContext) &&
    showRatings &&
    !mdblistApiKey.trim() &&
    !isMdblistPromptDismissed;

  const [inactiveExpanded, setInactiveExpanded] = useState(false);
  const [renderedProgress, setRenderedProgress] = useState(metadataProgress);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [activeMenuTitle, setActiveMenuTitle] = useState<string | null>(null);
  const [activeScreeningDropdown, setActiveScreeningDropdown] = useState<{
    title: string;
    key: string;
  } | null>(null);

  // Close context menu on outside click or Escape
  useClickOutside({
    onClose: () => setActiveMenuTitle(null),
    enabled: Boolean(activeMenuTitle),
    ignoreSelector: "[data-movie-menu]",
  });

  // Close screening dropdown on outside click or Escape
  useClickOutside({
    onClose: () => setActiveScreeningDropdown(null),
    enabled: Boolean(activeScreeningDropdown),
    ignoreSelector: activeScreeningDropdown
      ? `[data-screening-menu="${activeScreeningDropdown.key}"]`
      : undefined,
  });

  // Load-in animation control: only runs when loading/reloading a day
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const prevLoadingRef = useRef(isLoading);
  const prevDateRef = useRef(selectedDate);
  const hasInitialAnimated = useRef(false);

  useEffect(() => {
    const dateChanged = prevDateRef.current !== selectedDate;
    const justFinishedLoading = prevLoadingRef.current && !isLoading;
    const initialLoad = !hasInitialAnimated.current && !isLoading && movies.length > 0;

    prevDateRef.current = selectedDate;
    prevLoadingRef.current = isLoading;

    if ((dateChanged || justFinishedLoading || initialLoad) && !isLoading && movies.length > 0) {
      hasInitialAnimated.current = true;
      setShouldAnimate(true);
      const timer = setTimeout(() => {
        setShouldAnimate(false);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [selectedDate, isLoading, movies.length]);

  useEffect(() => {
    if (metadataProgress?.isOpen && metadataProgress.status !== "idle") {
      setRenderedProgress(metadataProgress);
      setIsFadingOut(false);
    } else if (renderedProgress?.isOpen && renderedProgress.status !== "idle") {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setRenderedProgress(metadataProgress);
        setIsFadingOut(false);
      }, 320);
      return () => clearTimeout(timer);
    } else {
      setRenderedProgress(metadataProgress);
      setIsFadingOut(false);
    }
  }, [
    metadataProgress?.isOpen,
    metadataProgress?.status,
    metadataProgress?.current,
    metadataProgress?.total,
    metadataProgress?.currentTitle,
    metadataProgress?.title,
    metadataProgress?.subtitle,
  ]);

  const {
    activeMovies,
    seenMovies,
    wontWatchMovies,
    inactiveMovies,
    mustSeeCount,
    includedCount,
    excludedCount,
    sortedActive,
    sortedSeen,
    sortedWontWatch,
  } = useMemo(() => {
    const active = movies.filter(
      (m) => !m.user_status || m.user_status === UserMovieStatus.ACTIVE
    );
    const seen = movies.filter((m) => m.user_status === UserMovieStatus.SEEN);
    const wontWatch = movies.filter(
      (m) => m.user_status === UserMovieStatus.WONT_WATCH
    );
    const inactive = [...seen, ...wontWatch];

    const mustSee = active.filter((m) => m.status === MovieDayStatus.MUST_SEE).length;
    const included = active.filter((m) => m.status === MovieDayStatus.INCLUDE).length;
    const excluded = active.filter((m) => m.status === MovieDayStatus.EXCLUDE).length;

    const sortedAct = [...active].sort((a, b) => {
      const getTier = (m: Movie) => {
        if (rankNonAListLast && !m.is_a_list_eligible) return 2;
        if (m.has_premium_format) return 0;
        return 1;
      };
      const diff = getTier(a) - getTier(b);
      if (diff !== 0) return diff;
      return a.title.localeCompare(b.title);
    });

    const sSeen = [...seen].sort((a, b) => a.title.localeCompare(b.title));
    const sWontWatch = [...wontWatch].sort((a, b) => a.title.localeCompare(b.title));

    return {
      activeMovies: active,
      seenMovies: seen,
      wontWatchMovies: wontWatch,
      inactiveMovies: inactive,
      mustSeeCount: mustSee,
      includedCount: included,
      excludedCount: excluded,
      sortedActive: sortedAct,
      sortedSeen: sSeen,
      sortedWontWatch: sWontWatch,
    };
  }, [movies, rankNonAListLast]);

  const metadataPercent = useMemo(() => {
    return renderedProgress && renderedProgress.total > 0
      ? Math.min(100, Math.round((renderedProgress.current / renderedProgress.total) * 100))
      : 0;
  }, [renderedProgress?.current, renderedProgress?.total]);

  if (!selectedTheaterId) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-16 text-center space-y-3.5 my-4 shadow-sm">
        <MapPin className="w-12 h-12 text-brand-blue mx-auto opacity-70" />
        <h3 className="text-base font-bold text-gray-200">No Theater Selected</h3>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          Please select your local AMC theater to browse available dates and showtimes.
        </p>
        {onOpenTheaterModal && (
          <button
            onClick={onOpenTheaterModal}
            className="px-4 py-2 bg-brand-blue hover:bg-brand-blueHover text-brand-text text-xs font-bold rounded-lg shadow transition mt-2"
          >
            Select AMC Theater
          </button>
        )}
      </div>
    );
  }

  if (!selectedDate) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-16 text-center space-y-3.5 my-4 shadow-sm">
        <Calendar className="w-12 h-12 text-brand-blue mx-auto opacity-70" />
        <h3 className="text-base font-bold text-gray-200">No Date Selected</h3>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          Choose a day from the <strong className="text-gray-200">Date Selection</strong> panel on the left to load available showtimes and plan your cinema marathon.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <MoviesTabSkeleton
        selectedDate={selectedDate}
        theaterName={theaterName}
        onCancel={onCancelLoading}
      />
    );
  }

  return (
    <div className={`space-y-4 ${shouldAnimate ? "animate-fade-in" : ""}`}>
      {showMdblistPrompt && (
        <div className="flex items-start justify-between gap-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 text-blue-950 dark:text-blue-100 rounded-lg p-3 px-4 text-xs shadow-sm">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5 min-w-0">
              <p className="font-semibold text-blue-950 dark:text-blue-100">
                Recommended: Connect a free MDBList API key
              </p>
              <p className="text-blue-900/80 dark:text-blue-200/80 leading-relaxed">
                Unlock Rotten Tomatoes critics &amp; audience scores, IMDb ratings, genres, and movie descriptions on every card.
              </p>
              <div className="flex items-center flex-wrap gap-2 pt-0.5">
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="px-2.5 py-1 rounded-md bg-brand-blue hover:bg-brand-blueHover text-brand-text font-semibold text-xs shadow-sm transition"
                  >
                    Open Settings
                  </button>
                )}
                <a
                  href="https://mdblist.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-md bg-white/80 dark:bg-dark-surface hover:bg-white dark:hover:bg-dark-hover border border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 font-medium inline-flex items-center gap-1 transition"
                >
                  <span>Get Free API Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://github.com/matineerlabs/matineer#mdblist-setup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 dark:text-blue-300 hover:underline font-medium inline-flex items-center gap-1 px-1 py-1"
                >
                  <span>Setup Guide</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismissMdblistPrompt}
            className="p-1 rounded hover:bg-blue-200/60 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:text-blue-950 dark:hover:text-white transition flex-shrink-0"
            title="Dismiss recommendation"
            aria-label="Dismiss recommendation"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary Header */}
      <div className={`flex items-center justify-between flex-wrap gap-2.5 bg-dark-card border border-dark-border rounded-lg p-3 px-4 shadow-sm ${shouldAnimate ? "animate-fade-in" : ""}`}>
        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-200 font-semibold flex-wrap gap-y-1">
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <Film className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{activeMovies.length} Active Movies</span>
          </div>
          <span className="text-gray-400 text-xs font-normal">
            ({mustSeeCount} Must See · {includedCount} Included · {excludedCount} Excluded)
          </span>
          {inactiveMovies.length > 0 && (
            <span className="text-xs text-gray-500 font-normal">
              · {inactiveMovies.length} hidden
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-1.5 flex-shrink-0">
          {/* Integrated Header Pill */}
          {renderedProgress && renderedProgress.isOpen && renderedProgress.status === "running" && (
            <div
              className={`flex items-center space-x-2.5 pl-3 pr-3.5 py-1 mr-1 sm:mr-1.5 rounded-md bg-blue-100 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-500/40 text-blue-950 dark:text-blue-100 text-xs shadow-sm ${
                isFadingOut ? "animate-badge-out pointer-events-none" : "animate-badge-in"
              }`}
            >
              <Loader2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
              <span
                className="font-medium truncate max-w-[120px] sm:max-w-[180px] text-blue-950 dark:text-blue-100"
                title={renderedProgress.currentTitle ? `Fetching ${renderedProgress.currentTitle}` : "Updating ratings"}
              >
                {renderedProgress.currentTitle ? `Ratings: ${renderedProgress.currentTitle}` : "Updating ratings..."}
              </span>
              <span className="text-blue-800 dark:text-blue-300 font-mono font-semibold text-[11px] flex-shrink-0">
                ({renderedProgress.current}/{renderedProgress.total})
              </span>
              <div className="w-10 sm:w-14 h-1.5 bg-blue-200 dark:bg-dark-surface rounded-full overflow-hidden flex-shrink-0 hidden xs:block">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${metadataPercent}%` }}
                />
              </div>
              {onCancelMetadata && (
                <button
                  onClick={onCancelMetadata}
                  className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800/60 rounded text-blue-700 dark:text-blue-300 hover:text-blue-950 dark:hover:text-white transition"
                  title="Stop fetching ratings"
                >
                  <X className="w-3 h-3 text-blue-700 dark:text-blue-300" />
                </button>
              )}
            </div>
          )}

          {renderedProgress && renderedProgress.isOpen && renderedProgress.status === "complete" && renderedProgress.total > 0 && (
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 mr-1 sm:mr-1.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-500/40 text-emerald-950 dark:text-emerald-200 text-xs shadow-sm ${
                isFadingOut ? "animate-badge-out pointer-events-none" : "animate-badge-in"
              }`}
            >
              <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 flex-shrink-0 stroke-[2.5]" />
              <span className="font-semibold text-[11px] text-emerald-950 dark:text-emerald-200">Ratings up to date</span>
            </div>
          )}

          {onRefreshShowtimes && (
            <button
              onClick={onRefreshShowtimes}
              className="bg-dark-surface hover:bg-dark-hover border border-dark-border text-gray-300 hover:text-gray-100 text-xs font-semibold px-3 py-1.5 rounded flex items-center space-x-1.5 transition flex-shrink-0"
              title="Force reload showtimes from AMC"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Refresh Showtimes</span>
            </button>
          )}

          {movies.length > 0 && (
              <>
                <button
                    onClick={onIncludeAll}
                    className="bg-dark-surface hover:bg-dark-hover border border-dark-border text-gray-300 hover:text-gray-100 text-xs font-semibold px-3 py-1.5 rounded flex items-center space-x-1.5 transition flex-shrink-0"
                    title="Include all active movies for this date"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"/>
                  <span>Include All</span>
                </button>
                <button
                    onClick={onExcludeAll}
                    className="bg-dark-surface hover:bg-dark-hover border border-dark-border text-gray-300 hover:text-gray-100 text-xs font-semibold px-3 py-1.5 rounded flex items-center space-x-1.5 transition flex-shrink-0"
                    title="Exclude all active movies for this date"
                >
                  <Ban className="w-3.5 h-3.5 text-red-600 dark:text-red-400"/>
                  <span>Exclude All</span>
                </button>
              </>
          )}
        </div>
      </div>

      {/* Active Movies List with Staggered Cascade */}
      <div className="space-y-2.5">
        {activeMovies.length === 0 && inactiveMovies.length === 0 ? (
          <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-gray-200">
              No showtimes found for this theater on this date.
            </p>
            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
              Theaters typically post their full weekly schedules by Tuesday or Wednesday afternoon. Try selecting another date in the sidebar, or verify directly on AMC.
            </p>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              {onRefreshShowtimes && (
                <button
                  onClick={onRefreshShowtimes}
                  className="bg-dark-surface hover:bg-dark-hover border border-dark-border text-gray-200 hover:text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition"
                >
                  <RotateCw className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Refresh Showtimes</span>
                </button>
              )}
              {showtimesUrl && (
                <a
                  href={showtimesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-brand-blue/15 hover:bg-brand-blue/25 border border-brand-blue/40 text-blue-400 hover:text-blue-300 text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition"
                >
                  <span>View on AMCTheatres.com</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        ) : activeMovies.length === 0 ? (
          <div className="bg-dark-card border border-dark-border rounded-lg p-8 text-center text-gray-400 text-sm">
            All available movies on this date are marked as Watched or Won't Watch. Expand the section below to view or restore them.
          </div>
        ) : (
          (sortedActive || []).map((m, idx) => (
            <div
              key={m.title}
              className={`${shouldAnimate ? "animate-card-cascade" : ""} ${
                activeMenuTitle === m.title || activeScreeningDropdown?.title === m.title
                  ? "relative z-40"
                  : "relative"
              }`}
              style={
                shouldAnimate
                  ? {
                      animationDelay: `${Math.min(idx * 30, 240)}ms`,
                      animationFillMode: "both",
                    }
                  : undefined
              }
            >
              <MovieCard
                movie={m}
                pinnedShowing={pinnedShowing}
                onStatusChange={(st) => onMovieStatusChange(m.title, st)}
                onFormatToggle={(fmt) => onFormatToggle(m.title, fmt)}
                onUserStatusChange={(st) => onUserStatusChange(m.title, st)}
                onPinShowing={onPinShowing}
                onUnpinShowing={onUnpinShowing}
                onSelectAnchor={onSelectAnchor}
                isMenuOpen={activeMenuTitle === m.title}
                onToggleMenu={() =>
                  setActiveMenuTitle(activeMenuTitle === m.title ? null : m.title)
                }
                onCloseMenu={() => setActiveMenuTitle(null)}
                openScreeningDropdownKey={
                  activeScreeningDropdown?.title === m.title
                    ? activeScreeningDropdown.key
                    : null
                }
                onToggleScreeningDropdown={(key) =>
                  setActiveScreeningDropdown((prev) =>
                    prev?.title === m.title && prev?.key === key
                      ? null
                      : { title: m.title, key }
                  )
                }
                onCloseScreeningDropdown={() => setActiveScreeningDropdown(null)}
              />
            </div>
          ))
        )}
      </div>

      {/* Prominent, Left-Grouped Bottom Inactive Section */}
      {inactiveMovies.length > 0 && (
        <div className="pt-2">
          <div className="bg-dark-surface/60 border border-dark-border/80 rounded-lg p-3 px-4">
            <button
              onClick={() => setInactiveExpanded(!inactiveExpanded)}
              className="flex items-center space-x-2.5 text-xs text-gray-300 hover:text-white font-semibold transition w-full text-left"
            >
              {inactiveExpanded ? (
                <ChevronDown className="w-4 h-4 text-brand-blue flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-brand-blue flex-shrink-0" />
              )}
              <EyeOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>
                {inactiveExpanded ? "Hide" : "Show"} Inactive Movies ({inactiveMovies.length} hidden
                {[
                  sortedSeen.length > 0 ? `${sortedSeen.length} Watched` : null,
                  sortedWontWatch.length > 0 ? `${sortedWontWatch.length} Won't Watch` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") &&
                  `: ${[
                    sortedSeen.length > 0 ? `${sortedSeen.length} Watched` : null,
                    sortedWontWatch.length > 0 ? `${sortedWontWatch.length} Won't Watch` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}`}
                )
              </span>
            </button>

            {inactiveExpanded && (
              <div className="space-y-4 mt-3 pt-3 border-t border-dark-border/40">
                {/* Watched Movies Subheader & Cards */}
                {sortedSeen.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-gray-200 pb-1.5 border-b border-dark-border/40">
                      <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>Watched Movies</span>
                      <span className="text-gray-400 text-[11px] font-normal">({sortedSeen.length})</span>
                    </div>
                    <div className="space-y-2.5">
                      {(sortedSeen || []).map((m) => (
                        <div
                          key={m.title}
                          className={
                            activeMenuTitle === m.title || activeScreeningDropdown?.title === m.title
                              ? "relative z-40"
                              : "relative"
                          }
                        >
                          <MovieCard
                            movie={m}
                            hideStatusBadge
                            pinnedShowing={pinnedShowing}
                            onStatusChange={(st) => onMovieStatusChange(m.title, st)}
                            onFormatToggle={(fmt) => onFormatToggle(m.title, fmt)}
                            onUserStatusChange={(st) => onUserStatusChange(m.title, st)}
                            onPinShowing={onPinShowing}
                            onUnpinShowing={onUnpinShowing}
                            onSelectAnchor={onSelectAnchor}
                            isMenuOpen={activeMenuTitle === m.title}
                            onToggleMenu={() =>
                              setActiveMenuTitle(activeMenuTitle === m.title ? null : m.title)
                            }
                            onCloseMenu={() => setActiveMenuTitle(null)}
                            openScreeningDropdownKey={
                              activeScreeningDropdown?.title === m.title
                                ? activeScreeningDropdown.key
                                : null
                            }
                            onToggleScreeningDropdown={(key) =>
                              setActiveScreeningDropdown((prev) =>
                                prev?.title === m.title && prev?.key === key
                                  ? null
                                  : { title: m.title, key }
                              )
                            }
                            onCloseScreeningDropdown={() => setActiveScreeningDropdown(null)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Won't Watch Subheader & Cards */}
                {sortedWontWatch.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-gray-200 pb-1.5 border-b border-dark-border/40">
                      <Ban className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                      <span>Won't Watch</span>
                      <span className="text-gray-400 text-[11px] font-normal">({sortedWontWatch.length})</span>
                    </div>
                    <div className="space-y-2.5">
                      {(sortedWontWatch || []).map((m) => (
                        <div
                          key={m.title}
                          className={
                            activeMenuTitle === m.title || activeScreeningDropdown?.title === m.title
                              ? "relative z-40"
                              : "relative"
                          }
                        >
                          <MovieCard
                            movie={m}
                            hideStatusBadge
                            pinnedShowing={pinnedShowing}
                            onStatusChange={(st) => onMovieStatusChange(m.title, st)}
                            onFormatToggle={(fmt) => onFormatToggle(m.title, fmt)}
                            onUserStatusChange={(st) => onUserStatusChange(m.title, st)}
                            onPinShowing={onPinShowing}
                            onUnpinShowing={onUnpinShowing}
                            onSelectAnchor={onSelectAnchor}
                            isMenuOpen={activeMenuTitle === m.title}
                            onToggleMenu={() =>
                              setActiveMenuTitle(activeMenuTitle === m.title ? null : m.title)
                            }
                            onCloseMenu={() => setActiveMenuTitle(null)}
                            openScreeningDropdownKey={
                              activeScreeningDropdown?.title === m.title
                                ? activeScreeningDropdown.key
                                : null
                            }
                            onToggleScreeningDropdown={(key) =>
                              setActiveScreeningDropdown((prev) =>
                                prev?.title === m.title && prev?.key === key
                                  ? null
                                  : { title: m.title, key }
                              )
                            }
                            onCloseScreeningDropdown={() => setActiveScreeningDropdown(null)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
