import React, { useState, useMemo } from "react";
import { Calendar } from "lucide-react";
import { DateOption } from "../../../types/api";
import { DatePickerModal } from "../../common/DatePickerModal";
import { getAvailableDates } from "../../../../../shared/utils/time";

export interface DateSelectorProps {
  dates?: DateOption[];
  selectedDate: string;
  selectedTheaterId: string;
  onSelectDate: (d: string) => void;
  isScraping: boolean;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  dates,
  selectedDate,
  selectedTheaterId,
  onSelectDate,
  isScraping,
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const availableDates = useMemo(() => dates || getAvailableDates(), [dates]);
  const quickPills = availableDates.slice(0, 8);
  const quickPillMatch = quickPills.find((d) => d.date_str === selectedDate);
  const isCustomDateSelected = Boolean(selectedDate && !quickPillMatch);

  const formatCustomDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      if (y === undefined || m === undefined || d === undefined || isNaN(y) || isNaN(m) || isNaN(d)) {
        return dateStr;
      }
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        weekday: "short",
      });
    } catch {
      return dateStr;
    }
  };

  const activeDisplayLabel = quickPillMatch
    ? quickPillMatch.display_label
    : formatCustomDate(selectedDate);

  return (
    <section className="space-y-2.5">
      <div className="flex items-center space-x-2 text-gray-200 font-semibold">
        <Calendar className="w-4 h-4 text-blue-400" />
        <span>Date Selection</span>
      </div>

      {/* Quick Date Pills (Primary) */}
      {!selectedTheaterId ? (
        <div className="py-3 px-2 rounded-lg bg-dark-surface/40 border border-dashed border-dark-border text-center text-xs text-gray-400">
          Select a theater above to view available dates.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {quickPills.map((d) => {
            const isSelected = d.date_str === selectedDate;
            return (
              <button
                key={d.date_str}
                onClick={() => !isScraping && onSelectDate(d.date_str)}
                disabled={isScraping}
                className={`py-1.5 px-1 rounded text-xs font-medium text-center transition ${
                  isScraping ? "opacity-60 cursor-not-allowed" : ""
                } ${
                  isSelected
                    ? "bg-brand-blue text-brand-text font-bold shadow-md ring-1 ring-white/20"
                    : "bg-dark-surface hover:bg-dark-hover text-gray-300"
                }`}
                title={isScraping ? "Showtimes are currently loading..." : undefined}
              >
                {d.display_label}
              </button>
            );
          })}
        </div>
      )}

      {/* Secondary: Other Date Picker */}
      <button
        type="button"
        onClick={() => {
          if (selectedTheaterId && !isScraping) setIsDatePickerOpen(true);
        }}
        disabled={!selectedTheaterId || isScraping}
        className={`w-full py-1.5 px-3 rounded text-xs font-semibold border flex items-center justify-between transition select-none ${
          !selectedTheaterId || isScraping
            ? "opacity-50 cursor-not-allowed bg-dark-surface/50 border-dark-border/50 text-gray-500"
            : isCustomDateSelected
            ? "bg-brand-blue text-brand-text border-brand-blue shadow-md ring-1 ring-white/20"
            : "bg-dark-surface hover:bg-dark-hover text-gray-300 border-dark-border"
        }`}
        title={
          isScraping
            ? "Showtimes are currently loading..."
            : selectedTheaterId
            ? "Choose a specific calendar date"
            : "Select a theater first"
        }
      >
        <div className="flex items-center space-x-1.5 truncate">
          <Calendar
            className={`w-3.5 h-3.5 flex-shrink-0 ${
              isCustomDateSelected ? "text-white" : "text-blue-400"
            }`}
          />
          <span className="truncate">
            {isCustomDateSelected ? `${activeDisplayLabel} (Custom)` : "Other Date..."}
          </span>
        </div>
        <span
          className={`text-[10px] uppercase font-bold tracking-wider ${
            isCustomDateSelected ? "text-blue-100" : "text-gray-400"
          }`}
        >
          {isCustomDateSelected ? "Change" : "Calendar"}
        </span>
      </button>

      {/* Custom Dark Date Picker Modal */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />
    </section>
  );
};
