import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { formatLocalDateStr } from "../../../../shared/utils/time";

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // "YYYY-MM-DD"
  todayStr?: string; // "YYYY-MM-DD"
  onSelectDate: (dateStr: string) => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  todayStr: todayStrProp,
  onSelectDate,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Today in local timezone formatted as YYYY-MM-DD
  const todayStr = todayStrProp || formatLocalDateStr();
  const [todayY, todayM, todayD] = todayStr.split("-").map(Number);
  const today = todayY && todayM && todayD ? new Date(todayY, todayM - 1, todayD) : new Date();

  // Current view year & month (0-indexed)
  const initialYear = selectedDate ? parseInt(selectedDate.split("-")[0] ?? "", 10) || today.getFullYear() : today.getFullYear();
  const initialMonth = selectedDate ? (parseInt(selectedDate.split("-")[1] ?? "", 10) || (today.getMonth() + 1)) - 1 : today.getMonth();

  const [viewYear, setViewYear] = useState<number>(initialYear);
  const [viewMonth, setViewMonth] = useState<number>(initialMonth);

  // Sync view when modal opens or selectedDate changes
  useEffect(() => {
    if (isOpen) {
      if (selectedDate) {
        const parts = selectedDate.split("-").map(Number);
        const y = parts[0];
        const m = parts[1];
        if (y !== undefined && m !== undefined && !isNaN(y) && !isNaN(m)) {
          setViewYear(y);
          setViewMonth(m - 1);
        } else {
          setViewYear(today.getFullYear());
          setViewMonth(today.getMonth());
        }
      } else {
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
      }
    }
  }, [isOpen, selectedDate]);

  // Close on Escape or click outside via shared hook
  useClickOutside(modalRef, onClose, isOpen);

  if (!isOpen) return null;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Prevent navigating further back than current month of this year
  const isPrevDisabled =
    viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth <= today.getMonth());

  // Generate calendar days
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const calendarDays = [];
  // Leading empty blanks
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        ref={modalRef}
        className="w-full max-w-xs bg-dark-card border border-dark-border rounded-xl shadow-2xl overflow-hidden p-4 space-y-4 text-gray-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-dark-border/80">
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-sm text-gray-100">
              {monthNames[viewMonth]} {viewYear}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrevMonth}
              disabled={isPrevDisabled}
              aria-label="Previous month"
              className={`p-1 rounded text-gray-400 transition ${
                isPrevDisabled
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:text-gray-100 hover:bg-dark-surface"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1 rounded text-gray-400 hover:text-gray-100 hover:bg-dark-surface transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1 rounded text-gray-400 hover:text-gray-100 hover:bg-dark-surface transition ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dayNum, idx) => {
            if (dayNum === null) {
              return <div key={`empty-${idx}`} className="h-8" />;
            }

            const dayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(
              dayNum
            ).padStart(2, "0")}`;

            const isPast = dayStr < todayStr;
            const isToday = dayStr === todayStr;
            const isSelected = dayStr === selectedDate;

            return (
              <button
                key={dayStr}
                disabled={isPast}
                onClick={() => {
                  onSelectDate(dayStr);
                  onClose();
                }}
                className={`h-8 w-8 mx-auto rounded-lg text-xs font-medium flex items-center justify-center transition select-none ${
                  isSelected
                    ? "bg-brand-blue text-brand-text font-bold shadow-md ring-2 ring-blue-400/50"
                    : isPast
                    ? "text-gray-600 cursor-not-allowed opacity-40 line-through"
                    : isToday
                    ? "text-blue-600 dark:text-blue-400 font-bold border border-blue-500/50 hover:bg-blue-600/20"
                    : "text-gray-300 hover:bg-dark-surface hover:text-brand-text"
                }`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-dark-border/60 flex items-center justify-end text-[11px]">
          <button
            onClick={() => {
              onSelectDate(todayStr);
              onClose();
            }}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold px-2 py-0.5 rounded hover:bg-dark-surface transition"
          >
            Today
          </button>
        </div>
      </div>
    </div>
  );
};
