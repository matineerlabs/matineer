import { useClickOutside } from "../../../hooks/useClickOutside";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Check, ChevronDown, MapPin, Search, Star } from "lucide-react";
import { Theater } from "../../../types/api";
import { TheaterPickerModal } from "../../common/TheaterPickerModal";

export interface TheaterSelectorProps {
  theaters: Theater[];
  selectedTheaterId: string;
  onSelectTheater: (theaterId: string) => void;
  favoriteTheaterIds?: string[];
  onToggleFavorite?: (theaterId: string) => void;
  isTheaterModalOpen?: boolean;
  onOpenTheaterModal?: () => void;
  onCloseTheaterModal?: () => void;
  isScraping: boolean;
}

export const TheaterSelector: React.FC<TheaterSelectorProps> = ({
  theaters,
  selectedTheaterId,
  onSelectTheater,
  favoriteTheaterIds = [],
  onToggleFavorite,
  isTheaterModalOpen: externalTheaterModalOpen,
  onOpenTheaterModal,
  onCloseTheaterModal,
  isScraping,
}) => {
  const [internalTheaterModalOpen, setInternalTheaterModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isTheaterModalOpen =
    externalTheaterModalOpen !== undefined
      ? externalTheaterModalOpen
      : internalTheaterModalOpen;
  const handleOpenTheaterModal =
    onOpenTheaterModal || (() => setInternalTheaterModalOpen(true));
  const handleCloseTheaterModal =
    onCloseTheaterModal || (() => setInternalTheaterModalOpen(false));

  const currentTheater = useMemo(() => {
    return theaters.find((t) => t.id === selectedTheaterId);
  }, [theaters, selectedTheaterId]);

  const favoriteTheaters = useMemo(() => {
    if (!favoriteTheaterIds || favoriteTheaterIds.length === 0) return [];
    return theaters.filter((t) => favoriteTheaterIds.includes(t.id));
  }, [theaters, favoriteTheaterIds]);

  // Close dropdown on click outside or escape key
  useClickOutside(dropdownRef, () => setIsDropdownOpen(false), isDropdownOpen);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => {
          if (isScraping) return;
          if (favoriteTheaters.length > 0) {
            setIsDropdownOpen((prev) => !prev);
          } else {
            handleOpenTheaterModal();
          }
        }}
        className={`border rounded-lg p-2.5 flex items-center justify-between transition shadow-sm ${
          isScraping
            ? "opacity-60 cursor-not-allowed bg-dark-surface/50 border-dark-border/50 pointer-events-none"
            : isDropdownOpen
            ? "bg-dark-surface border-blue-500/60 ring-1 ring-blue-500/40 cursor-pointer group"
            : currentTheater
            ? "bg-dark-surface/70 hover:bg-dark-surface border-dark-border/80 hover:border-blue-500/40 cursor-pointer group"
            : "bg-dark-surface/50 hover:bg-dark-surface border-blue-500/50 ring-1 ring-blue-500/30 cursor-pointer group"
        }`}
        title={
          isScraping
            ? "Showtimes are currently loading..."
            : favoriteTheaters.length > 0
            ? "Click to switch location or search theaters"
            : currentTheater
            ? "Click to change theater"
            : "Click to select your AMC theater"
        }
      >
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-md bg-dark-surface border border-dark-border flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300 transition">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span
              className="font-semibold text-xs text-gray-200 group-hover:text-gray-100 truncate leading-tight block"
              title={currentTheater ? currentTheater.name : "Select AMC Theater"}
            >
              {currentTheater ? currentTheater.name : "Select AMC Theater"}
            </span>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition mt-0.5 block leading-none font-medium truncate">
              {currentTheater
                ? [currentTheater.city, currentTheater.state].filter(Boolean).join(", ") ||
                  "Change location"
                : "Choose your theater"}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0 text-gray-400 group-hover:text-gray-200 transition">
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Favorites Quick Switcher Dropdown */}
      {isDropdownOpen && favoriteTheaters.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-dark-card border border-dark-border rounded-lg shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-dark-border/40 flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>Favorite Theaters</span>
            </div>
            <span className="text-gray-500 font-normal">
              {favoriteTheaters.length} saved
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {favoriteTheaters.map((ft) => {
              const isSelected = ft.id === selectedTheaterId;
              return (
                <button
                  key={ft.id}
                  onClick={() => {
                    onSelectTheater(ft.id);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-dark-surface transition group text-xs ${
                    isSelected
                      ? "bg-brand-blue/15 dark:bg-brand-blue/20 text-brand-text dark:text-blue-200 font-semibold"
                      : "text-gray-200"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="truncate group-hover:text-blue-600 dark:group-hover:text-blue-300 leading-tight">
                      {ft.name}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate leading-none mt-0.5">
                      {ft.address ? `${ft.address} · ` : ""}
                      {ft.city ? `${ft.city}, ` : ""}
                      {ft.state || ""}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 stroke-[3]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-dark-border/60 mt-1 pt-1 px-1">
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                handleOpenTheaterModal();
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-dark-surface flex items-center space-x-2 transition"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search all 500+ theaters...</span>
            </button>
          </div>
        </div>
      )}

      {/* Custom Dark Theater Picker Modal */}
      <TheaterPickerModal
        isOpen={isTheaterModalOpen}
        onClose={handleCloseTheaterModal}
        theaters={theaters}
        selectedTheaterId={selectedTheaterId}
        onSelectTheater={onSelectTheater}
        favoriteTheaterIds={favoriteTheaterIds}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
};
