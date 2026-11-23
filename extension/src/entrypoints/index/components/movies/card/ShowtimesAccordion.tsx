import React from "react";
import { ChevronDown, Pin, Ticket } from "lucide-react";
import { Movie, PinnedShowing, ShowingItem } from "../../../types/api";
import { formatComparator } from "./FormatChipList";

export interface ShowtimesAccordionProps {
  movie: Movie;
  isOpen: boolean;
  pinnedShowing?: PinnedShowing | null;
  onPinShowing?: (movie: Movie, formatName: string, showing: ShowingItem) => void;
  onUnpinShowing?: (title: string) => void;
  onSelectAnchor?: (movie: Movie, formatName: string, showing: ShowingItem) => void;
  screeningDropdownKey?: string | null;
  onToggleScreeningDropdown: (key: string) => void;
  onCloseScreeningDropdown: () => void;
}

export const ShowtimesAccordion: React.FC<ShowtimesAccordionProps> = ({
  movie,
  isOpen,
  pinnedShowing,
  onPinShowing,
  onUnpinShowing,
  onSelectAnchor,
  screeningDropdownKey,
  onToggleScreeningDropdown,
  onCloseScreeningDropdown,
}) => {
  const [isRendered, setIsRendered] = React.useState(isOpen);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [isFullyOpen, setIsFullyOpen] = React.useState(false);

  React.useEffect(() => {
    let animTimer: ReturnType<typeof setTimeout> | null = null;
    let fullOpenTimer: ReturnType<typeof setTimeout> | null = null;

    if (isOpen) {
      setIsRendered(true);
      const frame = requestAnimationFrame(() => {
        setIsAnimating(true);
      });
      fullOpenTimer = setTimeout(() => {
        setIsFullyOpen(true);
      }, 110);

      return () => {
        cancelAnimationFrame(frame);
        if (fullOpenTimer) clearTimeout(fullOpenTimer);
      };
    } else if (isRendered) {
      setIsFullyOpen(false);
      setIsAnimating(false);
      onCloseScreeningDropdown();
      animTimer = setTimeout(() => {
        setIsRendered(false);
      }, 100);

      return () => {
        if (animTimer) clearTimeout(animTimer);
      };
    }
  }, [isOpen, isRendered]);

  const showingsByFormat = movie.showings_by_format || {};
  const allowedFormats = movie.allowed_formats || [];

  if (!isRendered && !isOpen) return null;
  if (Object.keys(showingsByFormat).length === 0) return null;

  return (
    <div
      className={`grid transition-[grid-template-rows,opacity,transform] duration-100 ease-out !mt-0 ${
        isAnimating && isOpen
          ? "grid-rows-[1fr] opacity-100 translate-y-0"
          : "grid-rows-[0fr] opacity-0 -translate-y-1 pointer-events-none"
      }`}
    >
      <div className={`min-h-0 ${isFullyOpen ? "overflow-visible" : "overflow-hidden"}`}>
        <div className="pt-2.5">
          <div className="border-t border-dark-border/60 pt-3 space-y-2 text-xs bg-dark-surface/40 p-3 rounded">
      {Object.entries(showingsByFormat)
        .sort(([aFmt], [bFmt]) => formatComparator(aFmt, bFmt))
        .map(([rawFmtName, showList]) => {
          const fmtName =
            !rawFmtName || rawFmtName.toLowerCase() === "undefined"
              ? "Digital"
              : rawFmtName;
          const isPrem = /dolby|imax|prime|4dx|screenx|\bxl\b/i.test(fmtName);
          const hasOpenDropdownInRow = showList.some(
            (s) => `${fmtName}-${s.time}` === screeningDropdownKey
          );

          return (
            <div
              key={rawFmtName}
              className={`flex items-start space-x-3 py-1 border-b border-dark-border/20 last:border-b-0 ${
                hasOpenDropdownInRow ? "relative z-20" : "relative"
              }`}
            >
              {/* Left column: Format Name */}
              <div className="w-28 sm:w-36 flex-shrink-0 pt-1">
                <span
                  className={`font-semibold block ${
                    isPrem ? "text-purple-600 dark:text-purple-400" : "text-gray-300"
                  }`}
                >
                  {fmtName}:
                </span>
              </div>

              {/* Right column: Times pills */}
              <div className="flex-1 flex flex-wrap gap-2">
                {showList.map((s, idx) => {
                  const showingKey = `${fmtName}-${s.time}-${idx}`;
                  const fmtNameNorm =
                    !fmtName || fmtName.toLowerCase() === "undefined"
                      ? "digital"
                      : fmtName.trim().toLowerCase();
                  const isFormatAllowed = allowedFormats.some(
                    (f) =>
                      (!f || f.toLowerCase() === "undefined"
                        ? "digital"
                        : f.trim().toLowerCase()) === fmtNameNorm
                  );
                  const isThisPinned =
                    isFormatAllowed &&
                    pinnedShowing != null &&
                    pinnedShowing.title.trim().toLowerCase() ===
                      movie.title.trim().toLowerCase() &&
                    (!pinnedShowing.format_name ||
                    pinnedShowing.format_name.toLowerCase() === "undefined"
                      ? "digital"
                      : pinnedShowing.format_name.trim().toLowerCase()) === fmtNameNorm &&
                    pinnedShowing.time.trim().toLowerCase() === s.time.trim().toLowerCase();

                  const urls =
                    s.booking_urls && s.booking_urls.length > 0
                      ? s.booking_urls
                      : s.url
                      ? [s.url]
                      : [];
                  const hasMultipleScreenings = urls.length > 1;
                  const dropdownKey = `${fmtName}-${s.time}`;
                  const isDropdownOpen = screeningDropdownKey === dropdownKey;

                  if (s.is_sold_out) {
                    return (
                      <div
                        key={showingKey}
                        className="inline-flex items-stretch rounded border shadow-sm text-xs transition relative z-auto bg-dark-surface/50 border-dark-border/50 text-gray-500 opacity-60 cursor-not-allowed"
                        title="Sold Out"
                      >
                        <div className="px-2.5 py-1 font-medium flex items-center space-x-1.5 rounded-l line-through">
                          <span>{s.time}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={showingKey}
                      className={`inline-flex items-stretch rounded border shadow-sm text-xs transition relative ${
                        isDropdownOpen ? "z-30" : "z-auto"
                      } ${
                        isThisPinned
                          ? "bg-blue-100 dark:bg-blue-950/50 border-blue-300 dark:border-blue-500/80 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/40"
                          : "bg-dark-surface border-dark-border text-gray-200"
                      }`}
                    >
                      {/* Left: Showtime or Multi-screening Dropdown */}
                      {hasMultipleScreenings ? (
                        <div className="relative" data-screening-menu={dropdownKey}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onToggleScreeningDropdown(dropdownKey);
                            }}
                            className="px-2 py-1 hover:bg-dark-hover font-medium flex items-center space-x-1 transition group rounded-l"
                            title={`${urls.length} screenings available at ${s.time}. Click to select auditorium.`}
                          >
                            <span>{s.time}</span>
                            <span className="text-[10px] text-blue-700 dark:text-blue-400 font-bold bg-blue-100 dark:bg-blue-950/80 px-1 py-0.2 rounded border border-blue-300 dark:border-blue-800/60 leading-none">
                              ({urls.length})
                            </span>
                            <ChevronDown
                              className={`w-3 h-3 text-blue-600 dark:text-blue-400 transition-transform ${
                                isDropdownOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {isDropdownOpen && (
                            <div className="absolute left-0 top-full mt-1 w-44 bg-dark-card border border-dark-border rounded shadow-2xl py-1 z-50 ring-1 ring-black/50">
                              <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-dark-border/40 mb-1">
                                Screenings @ {s.time}
                              </div>
                              {urls.map((u, uIdx) => (
                                <a
                                  key={`${s.time}-aud-${uIdx}`}
                                  href={u}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => onCloseScreeningDropdown()}
                                  className="flex items-center justify-between px-2.5 py-1.5 text-xs text-gray-200 hover:text-gray-100 hover:bg-dark-hover transition group/item"
                                >
                                  <span className="font-medium">
                                    Screening #{uIdx + 1}
                                  </span>
                                  <Ticket className="w-3 h-3 text-blue-600 dark:text-blue-400 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-300" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <a
                          href={s.url || urls[0] || "#"}
                          target={s.url || urls[0] ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 hover:bg-dark-hover font-medium flex items-center space-x-1.5 transition group rounded-l"
                          title={
                            s.url || urls[0]
                              ? `Open AMC tickets for ${s.time}`
                              : `${s.time} showtime`
                          }
                        >
                          <span>{s.time}</span>
                          {(s.url || urls[0]) && (
                            <Ticket className="w-3 h-3 text-blue-600 dark:text-blue-400 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-300" />
                          )}
                        </a>
                      )}

                      {/* Right: Pin / unpin this showing button */}
                      {(onPinShowing || onSelectAnchor) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isThisPinned) {
                              onUnpinShowing?.(movie.title);
                            } else if (onPinShowing) {
                              onPinShowing(movie, fmtName, s);
                            } else if (onSelectAnchor) {
                              onSelectAnchor(movie, fmtName, s);
                            }
                          }}
                          className={`px-2 py-1 border-l transition flex items-center justify-center rounded-r group/pin ${
                            isThisPinned
                              ? "bg-brand-accent text-brand-text border-blue-400/50 hover:bg-rose-600 hover:text-white"
                              : "bg-dark-surface hover:bg-brand-blue/30 text-gray-400 hover:text-brand-accent border-dark-border"
                          }`}
                          title={
                            isThisPinned
                              ? `Unpin ${movie.title} @ ${s.time}`
                              : `Pin ${movie.title} @ ${s.time} (${fmtName})`
                          }
                        >
                          <Pin
                            className={`w-3.5 h-3.5 transition-transform ${
                              isThisPinned
                                ? "fill-current -rotate-45"
                                : "-rotate-45 group-hover/pin:scale-115 text-gray-400 group-hover/pin:text-brand-accent"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
          </div>
        </div>
      </div>
    </div>
  );
};
