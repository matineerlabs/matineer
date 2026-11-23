import React from "react";
import { Info, Sliders, Settings } from "lucide-react";
import { TimePicker } from "../../common/TimePicker";
import { DualRangeSlider } from "../../common/DualRangeSlider";
import { useMarathonConfig } from "../../../context/MarathonConfigContext";

export interface MarathonControlsProps {
  onOpenSettings?: () => void;
}

export const MarathonControls: React.FC<MarathonControlsProps> = ({ onOpenSettings }) => {
  const {
    numMovies,
    onNumMoviesChange,
    earliestStart,
    onEarliestStartChange,
    latestEnd,
    onLatestEndChange,
    trailerMin,
    minWaitMin,
    onMinWaitMinChange,
    maxWaitMin,
    onMaxWaitMinChange,
  } = useMarathonConfig();

  const minBound = trailerMin === 0 ? 0 : -trailerMin;
  const maxBound = 60;

  return (
    <section className="space-y-3 border-t border-dark-border pt-4">
      <div className="flex items-center space-x-2 text-gray-200 font-semibold">
        <Sliders className="w-4 h-4 text-blue-400" />
        <span>Scheduling Rules</span>
      </div>

      {/* Target Movie Count */}
      <div className="space-y-1">
        <span className="text-xs text-gray-200 font-medium">Target Movie Count:</span>
        <div className="grid grid-cols-3 gap-1 bg-dark-surface p-1 rounded">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => onNumMoviesChange(n)}
              className={`py-1 rounded text-xs font-semibold transition ${
                numMovies === n
                  ? "bg-brand-blue text-brand-text shadow"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {n} Movies
            </button>
          ))}
        </div>
      </div>

      {/* Time Bounds Picker */}
      <div className="grid grid-cols-2 gap-2">
        <TimePicker
          label="Earliest Start"
          value={earliestStart}
          onChange={onEarliestStartChange}
          stepMinutes={15}
          maxTime={latestEnd}
        />
        <TimePicker
          label="Latest End"
          value={latestEnd}
          onChange={onLatestEndChange}
          stepMinutes={15}
          minTime={earliestStart}
        />
      </div>

      {/* Sliders */}
      <div className="space-y-3 pt-1">
        {/* Trailer Duration (Interactive value chip) */}
        <div className="flex items-center justify-between text-xs py-0.5">
          <span className="text-gray-200 font-medium">Trailer Duration:</span>
          {onOpenSettings ? (
            <button
              type="button"
              onClick={onOpenSettings}
              title="Click to edit trailer duration in settings"
              aria-label="Edit trailer duration in settings"
              className="group flex items-center space-x-1 px-1.5 py-0.5 rounded bg-dark-surface hover:bg-dark-surface/80 border border-dark-border/80 hover:border-blue-500/50 text-gray-200 hover:text-white transition shadow-sm text-xs font-semibold"
            >
              <span>{trailerMin}m</span>
              <Settings className="w-2.5 h-2.5 text-gray-500 group-hover:text-blue-400 transition" />
            </button>
          ) : (
            <span className="text-gray-200 font-bold">{trailerMin}m</span>
          )}
        </div>

        {/* Dual-Handle Slider: Time Between Movies */}
        <div className="relative">
          <div className="flex items-center space-x-1.5 text-xs text-gray-200 font-medium">
            <span>Time Between Movies:</span>
            <div className="group flex items-center">
              <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-200 cursor-help transition-colors" />
              <div className="absolute left-0 right-0 bottom-full mb-2 hidden group-hover:block p-3 bg-dark-surface border border-dark-border text-gray-300 text-[11px] rounded-lg shadow-2xl z-50 pointer-events-none leading-relaxed text-left space-y-1.5">
                <p>
                  Most screenings run pre-show ads and trailers before the feature starts. Arriving during trailers unlocks tighter schedules.
                </p>
                <p>
                  <strong>Note:</strong> Special events (such as Fathom Events or Q&A screenings) may start promptly at the ticketed time.
                </p>
              </div>
            </div>
          </div>

          {/* Sub-labels directly above the slider track */}
          <div className="flex justify-between items-center text-[11px] mt-1.5 mb-0.5 select-none font-medium">
            <span
              className={
                minWaitMin < 0
                  ? "text-slate-400"
                  : "text-gray-500"
              }
            >
              {minWaitMin < 0
                ? `Skip ${Math.abs(minWaitMin)}m trailers`
                : minWaitMin === 0
                ? "At Showtime"
                : `Wait at least ${minWaitMin}m`}
            </span>
            <span className="text-blue-400/80">
              Wait up to {maxWaitMin}m
            </span>
          </div>

          <DualRangeSlider
            minValue={minWaitMin}
            maxValue={maxWaitMin}
            minBound={minBound}
            maxBound={maxBound}
            step={5}
            minGap={5}
            onMinChange={onMinWaitMinChange}
            onMaxChange={onMaxWaitMinChange}
          />
        </div>
      </div>
    </section>
  );
};
