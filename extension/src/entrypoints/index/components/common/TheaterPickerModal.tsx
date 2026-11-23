import React, { useState, useEffect, useRef, useMemo } from "react";
import { Check, Map, MapPin, Search, Star, X } from "lucide-react";
import { Theater } from "../../types/api";
import { useClickOutside } from "../../hooks/useClickOutside";

interface TheaterPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  theaters: Theater[];
  selectedTheaterId: string;
  onSelectTheater: (theaterId: string) => void;
  favoriteTheaterIds?: string[];
  onToggleFavorite?: (theaterId: string) => void;
}

export const TheaterPickerModal: React.FC<TheaterPickerModalProps> = ({
  isOpen,
  onClose,
  theaters,
  selectedTheaterId,
  onSelectTheater,
  favoriteTheaterIds = [],
  onToggleFavorite,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentTheater = useMemo(() => {
    return theaters.find((t) => t.id === selectedTheaterId);
  }, [theaters, selectedTheaterId]);

  const favoriteTheaters = useMemo(() => {
    if (!favoriteTheaterIds || favoriteTheaterIds.length === 0) return [];
    return theaters.filter((t) => favoriteTheaterIds.includes(t.id));
  }, [theaters, favoriteTheaterIds]);

  // Unique list of states
  const availableStates = useMemo(() => {
    const s = new Set<string>();
    theaters.forEach((t) => {
      if (t.state) s.add(t.state);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [theaters]);

  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sync state filter with current theater when modal opens
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isOpen) {
      if (currentTheater?.state) {
        setSelectedState(currentTheater.state);
      } else {
        setSelectedState("ALL");
      }
      setSearchQuery("");
      // Auto-focus search input
      timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, currentTheater]);

  // Close on Escape or click outside via shared hook
  useClickOutside(modalRef, onClose, isOpen);

  // Filter theaters by state and search text
  const filteredTheaters = useMemo(() => {
    return theaters.filter((t) => {
      if (selectedState === "FAVORITES") {
        if (!favoriteTheaterIds.includes(t.id)) return false;
      } else if (selectedState !== "ALL" && t.state !== selectedState) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = t.name.toLowerCase().includes(q);
        const matchCitySlug = t.city_slug?.toLowerCase().replace(/-/g, " ").includes(q);
        const matchCity = t.city?.toLowerCase().includes(q);
        return matchName || matchCitySlug || matchCity;
      }
      return true;
    });
  }, [theaters, selectedState, searchQuery, favoriteTheaterIds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-dark-card border border-dark-border rounded-xl shadow-2xl overflow-hidden p-5 space-y-4 text-gray-200 flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-border/80 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-dark-surface border border-dark-border flex items-center justify-center text-blue-600 dark:text-blue-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-100 leading-tight">
                Select AMC Theater
              </h2>
              <p className="text-[11px] text-gray-400 leading-tight">
                Search or filter across 500+ AMC locations nationwide
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-dark-surface transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-shrink-0">
          {/* State Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-400 block">State</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-dark-surface border border-dark-border hover:border-gray-600 text-gray-200 text-xs rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none transition cursor-pointer"
            >
              <option value="ALL" className="bg-dark-surface text-gray-200">
                All States ({theaters.length})
              </option>
              {favoriteTheaters.length > 0 && (
                <option value="FAVORITES" className="bg-dark-surface text-amber-600 dark:text-amber-300 font-semibold">
                  ⭐ Favorites ({favoriteTheaters.length})
                </option>
              )}
              {availableStates.map((st) => {
                const count = theaters.filter((t) => t.state === st).length;
                return (
                  <option key={st} value={st} className="bg-dark-surface text-gray-200">
                    {st} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Quick Search Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-400 block">Search</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Filter by name or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-surface border border-dark-border hover:border-gray-600 text-gray-200 text-xs rounded-lg pl-8 pr-7 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-100"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Theaters List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[220px]">
          {filteredTheaters.length === 0 ? (
            <div className="p-8 text-center text-gray-400 space-y-2">
              <p className="text-xs">No theaters found matching your filter criteria.</p>
              <button
                onClick={() => {
                  setSelectedState("ALL");
                  setSearchQuery("");
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredTheaters.map((t) => {
              const isSelected = t.id === selectedTheaterId;
              const isFav = favoriteTheaterIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTheater(t.id);
                    onClose();
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border transition flex items-center justify-between group ${
                    isSelected
                      ? "bg-brand-blue/15 dark:bg-brand-blue/20 border-brand-blue text-brand-text dark:text-blue-200 ring-1 ring-brand-blue/50"
                      : "bg-dark-surface hover:bg-dark-hover border-dark-border/80 text-gray-200 hover:border-gray-500"
                  }`}
                >
                  <div className="min-w-0 pr-2 flex-1">
                    <div className="font-semibold text-xs leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-300 transition">
                      {t.name}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5 flex items-center space-x-1.5 truncate">
                      {t.address ? (
                        <span>{t.address}</span>
                      ) : t.city_slug ? (
                        <span className="capitalize">{t.city_slug.replace(/-/g, " ")}</span>
                      ) : null}
                      {t.city && t.address && (
                        <>
                          <span>•</span>
                          <span>{t.city}</span>
                        </>
                      )}
                      {t.state && (
                        <>
                          <span>•</span>
                          <span>{t.state}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(t.id);
                        }}
                        title={isFav ? "Remove from favorites" : "Save as favorite location"}
                        className={`p-1.5 rounded-md border transition flex items-center justify-center ${
                          isFav
                            ? "bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 hover:text-amber-700 dark:hover:text-amber-300"
                            : "bg-dark-bg/80 border-dark-border text-gray-500 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-500/40"
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? "fill-amber-400" : ""}`} />
                      </button>
                    )}

                    {t.google_maps_url && (
                      <a
                        href={t.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title={`View ${t.name} on Google Maps`}
                        className="px-2 py-1 rounded bg-dark-bg/80 hover:bg-dark-card border border-dark-border hover:border-blue-500/50 text-[10px] text-gray-300 hover:text-gray-100 transition flex items-center space-x-1"
                      >
                        <Map className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span>Map</span>
                      </a>
                    )}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-brand-blue flex items-center justify-center text-brand-text">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-dark-border/80 flex items-center justify-between text-xs text-gray-400 flex-shrink-0">
          <span>
            Showing <strong className="text-gray-200">{filteredTheaters.length}</strong> location
            {filteredTheaters.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-dark-surface hover:bg-dark-hover text-gray-200 border border-dark-border transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
