import React from "react";
import { ChevronDown, ExternalLink, Ticket } from "lucide-react";

export interface AuditoriumDropdownProps {
  urls: string[];
  movieTitle: string;
  startTimeStr: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  menuIndex: number;
}

export const AuditoriumDropdown: React.FC<AuditoriumDropdownProps> = ({
  urls,
  movieTitle,
  startTimeStr,
  isOpen,
  onToggle,
  onClose,
  menuIndex,
}) => {
  if (urls.length === 0) {
    return (
      <span className="text-gray-500 text-[11px] flex-shrink-0 whitespace-nowrap">
        No link
      </span>
    );
  }

  if (urls.length > 1) {
    return (
      <div className="relative flex-shrink-0" data-booking-menu={menuIndex}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }}
          className="bg-brand-green hover:bg-brand-greenHover text-brand-text text-xs font-semibold px-3 py-1.5 rounded flex items-center space-x-1.5 shadow transition whitespace-nowrap"
          title={`Select seats for either of the ${urls.length} screenings at ${startTimeStr}`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>Select Seats ({urls.length})</span>
          <ChevronDown
            className={`w-3 h-3 opacity-80 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-dark-card border border-dark-border rounded shadow-2xl py-1 z-50 ring-1 ring-black/50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-dark-border/40 mb-1">
              Auditorium Options
            </div>
            {urls.map((u, uIdx) => (
              <a
                key={`${movieTitle}-${startTimeStr}-${uIdx}`}
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-gray-200 hover:text-gray-100 hover:bg-dark-hover transition group/item"
              >
                <span className="font-semibold">Screening #{uIdx + 1}</span>
                <ExternalLink className="w-3 h-3 opacity-70 group-hover/item:opacity-100 text-emerald-600 dark:text-emerald-400" />
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <a
      href={urls[0]}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-brand-green hover:bg-brand-greenHover text-brand-text text-xs font-semibold px-3 py-1.5 rounded flex items-center space-x-1.5 shadow flex-shrink-0 transition whitespace-nowrap"
    >
      <Ticket className="w-3.5 h-3.5" />
      <span>Select Seats</span>
      <ExternalLink className="w-3 h-3 opacity-70" />
    </a>
  );
};
