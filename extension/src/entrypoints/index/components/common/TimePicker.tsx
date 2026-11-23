import { useClickOutside } from "../../hooks/useClickOutside";
import React, { useState, useEffect, useRef } from "react";
import { Clock, ChevronDown } from "lucide-react";
import { parseMarathonDayMinutes, minutesToTimeString } from "../../../../shared/utils/time";

interface TimePickerProps {
  label: string;
  value: string; // e.g. "10:00am", "11:00pm", "1:30pm"
  onChange: (val: string) => void;
  // Step in minutes, default 15
  stepMinutes?: number;
  minTime?: string;
  maxTime?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  label,
  value,
  onChange,
  stepMinutes = 15,
  minTime,
  maxTime,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate options throughout the day from 6:00am to 2:00am next day (360m to 1560m)
  const timeOptions: {
    label: string;
    displayLabel: string;
    minutes: number;
    isNextDay: boolean;
  }[] = [];
  for (let m = 360; m <= 1560; m += stepMinutes) {
    const norm = m % 1440;
    const baseStr = minutesToTimeString(norm);
    const isNextDay = m >= 1440;
    let displayLabel = baseStr;
    if (isNextDay) {
      displayLabel = `${baseStr} (+1 day)`;
    }
    timeOptions.push({ label: baseStr, displayLabel, minutes: m, isNextDay });
  }

  // Current parsed minutes in marathon day timeline
  const currentMinutes = parseMarathonDayMinutes(value);
  let baseDisplay = "Select...";
  let isNextDay = false;
  if (value) {
    const norm = currentMinutes % 1440;
    baseDisplay = minutesToTimeString(norm);
    if (currentMinutes >= 1440) {
      isNextDay = true;
    }
  }

  const minMinutes = minTime ? parseMarathonDayMinutes(minTime) : undefined;
  const maxMinutes = maxTime ? parseMarathonDayMinutes(maxTime) : undefined;

  // Close when clicking outside or pressing Escape
  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  // Scroll active option into view when opened
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector('[data-selected=\"true\"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs text-gray-200 block mb-1 font-medium">{label}:</label>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={isNextDay ? `${baseDisplay} (+1 day)` : baseDisplay}
        className="w-full bg-dark-surface hover:bg-dark-hover border border-dark-border rounded px-2.5 py-1.5 text-xs text-gray-200 flex items-center justify-between transition focus:outline-none focus:border-blue-500"
      >
        <div className="flex items-center space-x-1.5 truncate">
          <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span className="truncate font-semibold text-xs">
            {baseDisplay}
            {isNextDay && (
              <sup className="text-[10px] font-bold text-blue-400 ml-0.5 select-none leading-none -top-1 relative">
                +1
              </sup>
            )}
          </span>
        </div>
        <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-40 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-dark-card border border-dark-border rounded-lg shadow-2xl py-1 text-xs divide-y divide-dark-border/40 animate-in fade-in zoom-in-95 duration-100"
        >
          {timeOptions.map((opt, i) => {
            const isMatch = Math.abs(opt.minutes - currentMinutes) < 2;
            const isDisabled =
              (minMinutes !== undefined && opt.minutes < minMinutes) ||
              (maxMinutes !== undefined && opt.minutes > maxMinutes);

            if (isDisabled) {
              return (
                <div
                  key={`${opt.label}-${i}`}
                  className="w-full text-left px-3 py-1.5 flex items-center justify-between text-gray-600 bg-dark-card/40 cursor-not-allowed opacity-35 select-none"
                  title="Time falls outside the valid range"
                >
                  <span className="line-through flex items-center">
                    <span>{opt.label}</span>
                    {opt.isNextDay && (
                      <sup className="text-[10px] font-bold text-gray-500 ml-0.5 -top-0.5 relative select-none">
                        +1
                      </sup>
                    )}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={`${opt.label}-${i}`}
                type="button"
                data-selected={isMatch}
                onClick={() => {
                  onChange(opt.label);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 transition flex items-center justify-between ${
                  isMatch
                    ? "bg-brand-blue text-brand-text font-bold"
                    : "text-gray-300 hover:bg-dark-surface hover:text-brand-text"
                }`}
              >
                <span className="flex items-center">
                  <span>{opt.label}</span>
                  {opt.isNextDay && (
                    <sup className="text-[10px] font-bold text-blue-400 ml-0.5 -top-0.5 relative select-none">
                      +1
                    </sup>
                  )}
                </span>
                {isMatch && <span className="text-[10px] text-blue-200">Selected</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
