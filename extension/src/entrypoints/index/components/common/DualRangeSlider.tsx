import React from "react";

export interface DualRangeSliderProps {
  minValue: number;
  maxValue: number;
  minBound: number;
  maxBound?: number;
  step?: number;
  minGap?: number;
  onMinChange: (val: number) => void;
  onMaxChange: (val: number) => void;
  className?: string;
  trackBgClass?: string;
  minAriaLabel?: string;
  maxAriaLabel?: string;
}

export const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  minValue,
  maxValue,
  minBound,
  maxBound = 60,
  step = 5,
  minGap = 5,
  onMinChange,
  onMaxChange,
  className = "",
  trackBgClass = "bg-dark-surface",
  minAriaLabel,
  maxAriaLabel,
}) => {
  const totalRange = Math.max(1, maxBound - minBound);

  const leftPercent = Math.max(
    0,
    Math.min(100, ((minValue - minBound) / totalRange) * 100)
  );
  const rightPercent = Math.max(
    0,
    Math.min(100, ((maxValue - minBound) / totalRange) * 100)
  );
  const zeroPercent = Math.max(
    0,
    Math.min(100, ((0 - minBound) / totalRange) * 100)
  );

  const computedMinAriaLabel =
    minAriaLabel ||
    (minValue < 0
      ? `Skip trailers up to ${Math.abs(minValue)} minutes`
      : minValue === 0
      ? "At Showtime"
      : `Minimum wait ${minValue} minutes`);

  const computedMaxAriaLabel =
    maxAriaLabel || `Wait up to ${maxValue} minutes`;

  const minThumbColor =
    minValue < 0
      ? "[&::-webkit-slider-thumb]:bg-slate-400 [&::-moz-range-thumb]:bg-slate-400 [&::-webkit-slider-thumb]:border-slate-800 [&::-moz-range-thumb]:border-slate-800"
      : "[&::-webkit-slider-thumb]:bg-slate-300 [&::-moz-range-thumb]:bg-slate-300 [&::-webkit-slider-thumb]:border-dark-bg [&::-moz-range-thumb]:border-dark-bg";

  return (
    <div className={`relative w-full h-6 flex items-center select-none ${className}`}>
      {/* Background Track */}
      <div
        className={`absolute left-[7px] right-[7px] h-2 ${trackBgClass} rounded-full overflow-hidden border border-dark-border/40`}
      >
        {/* Striped Trailer Zone Background (Pre-show area left of zero marker) */}
        {minBound < 0 && (
          <div
            className="absolute top-0 bottom-0 bg-hatched-track-subtle opacity-70 pointer-events-none"
            style={{
              left: 0,
              width: `${zeroPercent}%`,
            }}
          />
        )}

        {/* Active Trailer Skip segment (Muted slate-blue hatched) */}
        {minValue < 0 && (
          <div
            className="absolute h-full bg-hatched-trailers-muted rounded-l"
            style={{
              left: `${leftPercent}%`,
              width: `${Math.min(rightPercent, zeroPercent) - leftPercent}%`,
            }}
          />
        )}

        {/* Active Wait segment (Blue solid) */}
        {maxValue > 0 && rightPercent > Math.max(leftPercent, zeroPercent) && (
          <div
            className="absolute h-full bg-brand-accent rounded-r"
            style={{
              left: `${Math.max(leftPercent, zeroPercent)}%`,
              width: `${rightPercent - Math.max(leftPercent, zeroPercent)}%`,
            }}
          />
        )}

        {/* Zero Marker Line (Ticketed Showtime) */}
        {minBound < 0 && (
          <div
            className="absolute -top-0.5 -bottom-0.5 w-[2px] bg-gray-200 rounded-full z-10 -translate-x-1/2 pointer-events-none shadow-sm ring-1 ring-black/40"
            style={{ left: `${zeroPercent}%` }}
            title="Ticketed Showtime (0m)"
          />
        )}
      </div>

      {/* Min Input Handle */}
      <input
        type="range"
        min={minBound}
        max={maxBound}
        step={step}
        value={minValue}
        aria-label={computedMinAriaLabel}
        aria-valuenow={minValue}
        aria-valuemin={minBound}
        aria-valuemax={maxBound}
        aria-valuetext={
          minValue < 0
            ? `Skip ${Math.abs(minValue)}m trailers`
            : minValue === 0
            ? "At Showtime"
            : `Wait ${minValue}m`
        }
        onChange={(e) =>
          onMinChange(Math.min(Number(e.target.value), maxValue - minGap))
        }
        className={`pointer-events-none absolute w-full h-6 appearance-none bg-transparent z-20 focus:z-30 active:z-30 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full ${minThumbColor} [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md hover:[&::-moz-range-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-110 transition-transform`}
      />

      {/* Max Input Handle */}
      <input
        type="range"
        min={minBound}
        max={maxBound}
        step={step}
        value={maxValue}
        aria-label={computedMaxAriaLabel}
        aria-valuenow={maxValue}
        aria-valuemin={minBound}
        aria-valuemax={maxBound}
        aria-valuetext={`Wait up to ${maxValue}m`}
        onChange={(e) =>
          onMaxChange(Math.max(Number(e.target.value), minValue + minGap))
        }
        className="pointer-events-none absolute w-full h-6 appearance-none bg-transparent z-20 focus:z-30 active:z-30 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-950/80 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-950/80 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md hover:[&::-moz-range-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-110 transition-transform"
      />
    </div>
  );
};
