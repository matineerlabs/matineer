import { MovieDayStatus, UserMovieStatus, MOVIE_DAY_STATUS_LABELS } from '../../../../shared/types/movie';
import { normalizeMpaRating } from '../../../../shared/utils/movie';
import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  MoreVertical,
  Play,
} from "lucide-react";
import { Movie, PinnedShowing, ShowingItem } from "../../types/api";
import {
  MoviePoster,
  MovieRatings,
  MovieDetailPopover,
  FormatChipList,
  ShowtimesAccordion,
  PinnedBadge,
} from "./card/index";
import { useClickOutside } from "../../hooks/useClickOutside";
import { useOptionalSettings } from "../../context/SettingsContext";

export interface MovieCardProps {
  movie: Movie;
  hideStatusBadge?: boolean;
  pinnedShowing?: PinnedShowing | null;
  onStatusChange: (status: MovieDayStatus) => void;
  onFormatToggle: (fmt: string) => void;
  onUserStatusChange: (st: UserMovieStatus) => void;
  onPinShowing?: (movie: Movie, formatName: string, showing: ShowingItem) => void;
  onUnpinShowing?: (title: string) => void;
  onSelectAnchor?: (movie: Movie, formatName: string, showing: ShowingItem) => void;
  isMenuOpen?: boolean;
  onToggleMenu?: () => void;
  onCloseMenu?: () => void;
  openScreeningDropdownKey?: string | null;
  onToggleScreeningDropdown?: (key: string) => void;
  onCloseScreeningDropdown?: () => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  hideStatusBadge = false,
  pinnedShowing = null,
  onStatusChange,
  onFormatToggle,
  onUserStatusChange,
  onPinShowing,
  onUnpinShowing,
  onSelectAnchor,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  openScreeningDropdownKey: controlledScreeningDropdownKey,
  onToggleScreeningDropdown,
  onCloseScreeningDropdown,
}) => {
  const settingsContext = useOptionalSettings();
  const showRatings = settingsContext?.settings?.showRatings ?? true;
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const [internalScreeningDropdownKey, setInternalScreeningDropdownKey] = useState<string | null>(null);

  // Detail Popover state & handlers
  const hasRichDetails = Boolean(movie.plot || movie.genre);
  const [isDetailHovered, setIsDetailHovered] = useState(false);
  const [detailPlacement, setDetailPlacement] = useState<"bottom" | "top">("bottom");
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailTriggerRef = useRef<HTMLDivElement>(null);

  const handleDetailMouseEnter = () => {
    if (!hasRichDetails) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    hoverTimerRef.current = setTimeout(() => {
      if (detailTriggerRef.current) {
        const rect = detailTriggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 280 && rect.top > 280) {
          setDetailPlacement("top");
        } else {
          setDetailPlacement("bottom");
        }
      }
      setIsDetailHovered(true);
    }, 200);
  };

  const handleDetailMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    closeTimerRef.current = setTimeout(() => {
      setIsDetailHovered(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const screeningDropdownKey =
    controlledScreeningDropdownKey !== undefined
      ? controlledScreeningDropdownKey
      : internalScreeningDropdownKey;
  const toggleScreeningDropdown =
    onToggleScreeningDropdown ||
    ((key: string) =>
      setInternalScreeningDropdownKey((prev) => (prev === key ? null : key)));
  const closeScreeningDropdown =
    onCloseScreeningDropdown || (() => setInternalScreeningDropdownKey(null));

  const menuOpen = isMenuOpen !== undefined ? isMenuOpen : internalMenuOpen;
  const toggleMenu = onToggleMenu || (() => setInternalMenuOpen((v) => !v));
  const closeMenu = onCloseMenu || (() => setInternalMenuOpen(false));
  const menuRef = useRef<HTMLDivElement>(null);

  // Click-outside listener for uncontrolled menu usage
  useClickOutside(
    menuRef,
    () => setInternalMenuOpen(false),
    isMenuOpen === undefined && internalMenuOpen
  );

  // Click-outside listener for uncontrolled screening dropdown usage
  useClickOutside({
    onClose: () => setInternalScreeningDropdownKey(null),
    enabled: controlledScreeningDropdownKey === undefined && Boolean(internalScreeningDropdownKey),
    ignoreSelector: internalScreeningDropdownKey
      ? `[data-screening-menu="${internalScreeningDropdownKey}"]`
      : undefined,
  });

  const totalShowtimes = Object.values(movie.showings_by_format || {}).reduce(
    (sum, arr) => sum + (arr?.length || 0),
    0
  );

  return (
    <div
      className={`bg-dark-card border border-dark-border rounded-lg p-3.5 space-y-2.5 transition hover:border-gray-700 ${
        menuOpen ? "relative z-40" : screeningDropdownKey ? "relative z-30" : "relative"
      }`}
    >
      {/* Main Row: Poster + Info (Row 1 Title/Badges, Row 2 Formats) + Right Controls */}
      <div className="flex items-start justify-between gap-3 min-h-[50px]">
        {/* Left: Poster + Movie Details */}
        <div
          ref={detailTriggerRef}
          className="relative flex items-start space-x-3 min-w-0 flex-1"
        >
          {/* Hover trigger on poster thumbnail */}
          <div
            className={hasRichDetails ? "cursor-help flex-shrink-0" : "flex-shrink-0"}
            onMouseEnter={handleDetailMouseEnter}
            onMouseLeave={handleDetailMouseLeave}
          >
            <MoviePoster posterUrl={movie.poster_url} title={movie.title} />
          </div>

          <div className="space-y-1.5 min-w-0 flex-1">
            {/* Row 1: Title + Specs (Runtime, MPAA) + Ratings Capsule + Badges */}
            <div className="flex items-center flex-wrap gap-1.5">
              <h3
                className={`font-bold text-gray-100 text-sm leading-snug mr-1 break-words ${
                  hasRichDetails
                    ? "cursor-help hover:text-amber-300 transition-colors"
                    : ""
                }`}
                onMouseEnter={handleDetailMouseEnter}
                onMouseLeave={handleDetailMouseLeave}
              >
                {movie.title}
              </h3>

              {/* Runtime badge */}
              <span className="text-[11px] text-gray-400 flex items-center space-x-0.5 whitespace-nowrap flex-shrink-0">
                <Clock className="w-3 h-3" />
                <span>{movie.runtime_str}</span>
              </span>

              {/* MPAA Rating */}
              {normalizeMpaRating(movie.rated) && (
                <span className="text-[10px] bg-dark-surface text-gray-300 font-bold px-1.5 py-0.5 rounded border border-dark-border whitespace-nowrap flex-shrink-0">
                  {normalizeMpaRating(movie.rated)}
                </span>
              )}

              {/* Ratings Capsule */}
              {showRatings && (
                <MovieRatings
                  rtScore={movie.rt_score}
                  audienceScore={movie.audience_score}
                  imdbRating={movie.imdb_rating}
                  imdbId={movie.imdb_id}
                  title={movie.title}
                  animate={Boolean(movie.live_ratings_populated)}
                />
              )}

              {/* Excluded from A-List badge */}
              {!movie.is_a_list_eligible && (
                <span className="text-[10px] bg-rose-100 dark:bg-rose-950/50 text-rose-950 dark:text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-300 dark:border-rose-800/50 flex items-center space-x-1 whitespace-nowrap flex-shrink-0">
                  <span>⚠️ Excluded from A-List</span>
                </span>
              )}

              {/* Watched / Won't watch indicator */}
              {!hideStatusBadge && movie.user_status && movie.user_status !== UserMovieStatus.ACTIVE && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap flex-shrink-0 ${
                    movie.user_status === UserMovieStatus.SEEN
                      ? "bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-400"
                      : "bg-rose-100 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/40 text-rose-800 dark:text-rose-400"
                  }`}
                >
                  {movie.user_status === UserMovieStatus.SEEN ? "👁 Watched" : "🚫 Won't Watch"}
                </span>
              )}
            </div>

            {/* Row 2: Trailer + Formats + Showtimes expander */}
            <div className="flex items-center flex-wrap gap-1.5 pt-0.5 text-xs">
              {/* Trailer button */}
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                  movie.title + " trailer"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-dark-surface hover:bg-dark-hover text-gray-300 px-2 py-0.5 rounded border border-dark-border flex items-center space-x-1 text-[11px] whitespace-nowrap flex-shrink-0"
              >
                <Play className="w-3 h-3 text-red-500 fill-current" />
                <span>Trailer</span>
              </a>

              {/* Formats */}
              <FormatChipList movie={movie} onFormatToggle={onFormatToggle} />

              {/* Showtimes accordion button */}
              <button
                onClick={() => setAccordionOpen(!accordionOpen)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold flex items-center space-x-1 ml-1 whitespace-nowrap flex-shrink-0 transition-colors group"
                aria-expanded={accordionOpen}
              >
                <span>Showtimes ({totalShowtimes})</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-100 ease-out ${
                    accordionOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Hover Detail Card Popover */}
          {hasRichDetails && isDetailHovered && (
            <MovieDetailPopover
              movie={movie}
              placement={detailPlacement}
              onMouseEnter={handleDetailMouseEnter}
              onMouseLeave={handleDetailMouseLeave}
            />
          )}
        </div>

        {/* Right: Preference segmented buttons + More menu TOGETHER, with tucked pinned badge underneath */}
        <div className="flex flex-col items-start gap-1 flex-shrink-0 self-start">
          <div className="flex items-center space-x-1.5">
            <div className="inline-flex bg-dark-surface p-0.5 rounded border border-dark-border shadow-inner flex-shrink-0">
              {[MovieDayStatus.MUST_SEE, MovieDayStatus.INCLUDE, MovieDayStatus.EXCLUDE].map((st) => {
                const active = movie.status === st;
                return (
                  <button
                    key={MOVIE_DAY_STATUS_LABELS[st]}
                    onClick={() => onStatusChange(st)}
                    className={`text-xs px-2.5 py-0.5 rounded font-medium transition whitespace-nowrap ${
                      active
                        ? st === MovieDayStatus.MUST_SEE
                          ? "bg-brand-accent text-brand-text font-bold shadow"
                          : st === MovieDayStatus.INCLUDE
                          ? "bg-brand-blue text-brand-text font-bold shadow"
                          : "bg-gray-700 text-gray-300 font-bold"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {MOVIE_DAY_STATUS_LABELS[st]}
                  </button>
                );
              })}
            </div>

            {/* Context menu */}
            <div className="relative flex-shrink-0" ref={menuRef} data-movie-menu>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMenu();
                }}
                className={`p-1 rounded transition ${
                  menuOpen
                    ? "text-blue-600 dark:text-blue-400 bg-dark-surface"
                    : "text-gray-400 hover:text-gray-200 hover:bg-dark-surface"
                }`}
                title="More options"
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-dark-surface border border-dark-border rounded shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      onUserStatusChange(movie.user_status === UserMovieStatus.SEEN ? UserMovieStatus.ACTIVE : UserMovieStatus.SEEN);
                      closeMenu();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-dark-hover text-gray-200 transition"
                  >
                    {movie.user_status === UserMovieStatus.SEEN ? "Unmark Seen" : "👁 Mark Watched"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUserStatusChange(movie.user_status === UserMovieStatus.WONT_WATCH ? UserMovieStatus.ACTIVE : UserMovieStatus.WONT_WATCH);
                      closeMenu();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-dark-hover text-gray-200 transition"
                  >
                    {movie.user_status === UserMovieStatus.WONT_WATCH ? "Unmark Won't Watch" : "🚫 Won't Watch"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tucked pinned badge if this movie has a pinned showing */}
          <PinnedBadge
            movie={movie}
            pinnedShowing={pinnedShowing}
            onUnpinShowing={onUnpinShowing}
          />
        </div>
      </div>

      {/* Expandable Showtimes Accordion */}
      <ShowtimesAccordion
        movie={movie}
        isOpen={accordionOpen}
        pinnedShowing={pinnedShowing}
        onPinShowing={onPinShowing}
        onUnpinShowing={onUnpinShowing}
        onSelectAnchor={onSelectAnchor}
        screeningDropdownKey={screeningDropdownKey}
        onToggleScreeningDropdown={toggleScreeningDropdown}
        onCloseScreeningDropdown={closeScreeningDropdown}
      />
    </div>
  );
};
