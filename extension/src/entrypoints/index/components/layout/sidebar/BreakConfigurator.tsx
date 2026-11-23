import React, { useState } from "react";
import {
  AlertTriangle,
  Coffee,
  Pause,
  Plus,
  Utensils,
  X,
  Zap,
  LucideIcon,
} from "lucide-react";
import { useMarathonConfig } from "../../../context/MarathonConfigContext";
import { BREAK_INTENTS_MAP, BreakIntent } from "../../../../../shared/types/breaks";

export interface BreakConfiguratorProps {}

export interface BreakPresentationInfo {
  title: string;
  icon: LucideIcon;
  sizes: string[];
  defaultSize: string;
  color: string;
}

const ICON_MAP: Record<BreakIntent, LucideIcon> = {
  Lunch: Utensils,
  Dinner: Utensils,
  Intermission: Pause,
  "Quick Breather": Zap,
};

export const BREAK_INFO: Record<BreakIntent, BreakPresentationInfo> = {
  Lunch: {
    title: BREAK_INTENTS_MAP.Lunch.title,
    icon: ICON_MAP.Lunch,
    sizes: BREAK_INTENTS_MAP.Lunch.sizes,
    defaultSize: BREAK_INTENTS_MAP.Lunch.defaultSize,
    color: "bg-dark-surface/90 border-dark-border text-gray-200",
  },
  Dinner: {
    title: BREAK_INTENTS_MAP.Dinner.title,
    icon: ICON_MAP.Dinner,
    sizes: BREAK_INTENTS_MAP.Dinner.sizes,
    defaultSize: BREAK_INTENTS_MAP.Dinner.defaultSize,
    color: "bg-dark-surface/90 border-dark-border text-gray-200",
  },
  Intermission: {
    title: BREAK_INTENTS_MAP.Intermission.title,
    icon: ICON_MAP.Intermission,
    sizes: BREAK_INTENTS_MAP.Intermission.sizes,
    defaultSize: BREAK_INTENTS_MAP.Intermission.defaultSize,
    color: "bg-dark-surface/90 border-dark-border text-gray-200",
  },
  "Quick Breather": {
    title: BREAK_INTENTS_MAP["Quick Breather"].title,
    icon: ICON_MAP["Quick Breather"],
    sizes: BREAK_INTENTS_MAP["Quick Breather"].sizes,
    defaultSize: BREAK_INTENTS_MAP["Quick Breather"].defaultSize,
    color: "bg-dark-surface/90 border-dark-border text-gray-200",
  },
};

export const BreakConfigurator: React.FC<BreakConfiguratorProps> = () => {
  const {
    breaks,
    numMovies,
    onAddBreak,
    onRemoveBreak,
    onUpdateBreakSize,
  } = useMarathonConfig();

  const [removingId, setRemovingId] = useState<string | null>(null);

  const hasLunch = breaks.some((b) => b.intent === "Lunch");
  const hasDinner = breaks.some((b) => b.intent === "Dinner");
  const maxAllowedBreaks = Math.max(0, numMovies - 1);
  const isMaxBreaksReached = breaks.length >= maxAllowedBreaks;

  const isLunchDisabled = hasLunch || isMaxBreaksReached;
  const isDinnerDisabled = hasDinner || isMaxBreaksReached;
  const isIntermissionDisabled = isMaxBreaksReached;
  const isQuickDisabled = isMaxBreaksReached;

  const maxBreaksTooltip = `Maximum ${maxAllowedBreaks} ${
    maxAllowedBreaks === 1 ? "break" : "breaks"
  } allowed for ${numMovies} ${numMovies === 1 ? "movie" : "movies"}`;

  const handleRemove = (id: string) => {
    setRemovingId(id);
    setTimeout(() => {
      onRemoveBreak(id);
      setRemovingId((curr) => (curr === id ? null : curr));
    }, 75);
  };

  return (
    <section className="space-y-3 border-t border-dark-border pt-4">
      <div className="flex items-center space-x-2 text-gray-200 font-semibold">
        <Coffee className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span>Flexible Activity Breaks</span>
      </div>

      {/* Add Break Buttons */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => onAddBreak("Lunch")}
          disabled={isLunchDisabled}
          title={
            isMaxBreaksReached
              ? maxBreaksTooltip
              : hasLunch
              ? "Only 1 Lunch break allowed"
              : "Add Lunch break"
          }
          className={`text-xs font-semibold py-1.5 rounded flex items-center justify-center space-x-1 border transition ${
            isLunchDisabled
              ? "bg-dark-surface/40 text-gray-600 border-dark-border/40 cursor-not-allowed"
              : "bg-dark-surface hover:bg-dark-hover text-gray-200 border-dark-border hover:border-gray-600 active:scale-[0.98]"
          }`}
        >
          <Plus className={`w-3 h-3 ${isLunchDisabled ? "text-gray-600" : "text-gray-400"}`} />
          <span>Lunch</span>
        </button>
        <button
          onClick={() => onAddBreak("Dinner")}
          disabled={isDinnerDisabled}
          title={
            isMaxBreaksReached
              ? maxBreaksTooltip
              : hasDinner
              ? "Only 1 Dinner break allowed"
              : "Add Dinner break"
          }
          className={`text-xs font-semibold py-1.5 rounded flex items-center justify-center space-x-1 border transition ${
            isDinnerDisabled
              ? "bg-dark-surface/40 text-gray-600 border-dark-border/40 cursor-not-allowed"
              : "bg-dark-surface hover:bg-dark-hover text-gray-200 border-dark-border hover:border-gray-600 active:scale-[0.98]"
          }`}
        >
          <Plus className={`w-3 h-3 ${isDinnerDisabled ? "text-gray-600" : "text-gray-400"}`} />
          <span>Dinner</span>
        </button>
        <button
          onClick={() => onAddBreak("Intermission")}
          disabled={isIntermissionDisabled}
          title={isMaxBreaksReached ? maxBreaksTooltip : "Add Intermission break"}
          className={`text-xs font-semibold py-1.5 rounded flex items-center justify-center space-x-1 border transition ${
            isIntermissionDisabled
              ? "bg-dark-surface/40 text-gray-600 border-dark-border/40 cursor-not-allowed"
              : "bg-dark-surface hover:bg-dark-hover text-gray-200 border-dark-border hover:border-gray-600 active:scale-[0.98]"
          }`}
        >
          <Plus className={`w-3 h-3 ${isIntermissionDisabled ? "text-gray-600" : "text-gray-400"}`} />
          <span>Intermission</span>
        </button>
        <button
          onClick={() => onAddBreak("Quick Breather")}
          disabled={isQuickDisabled}
          title={isMaxBreaksReached ? maxBreaksTooltip : "Add Quick Breather break"}
          className={`text-xs font-semibold py-1.5 rounded flex items-center justify-center space-x-1 border transition ${
            isQuickDisabled
              ? "bg-dark-surface/40 text-gray-600 border-dark-border/40 cursor-not-allowed"
              : "bg-dark-surface hover:bg-dark-hover text-gray-200 border-dark-border hover:border-gray-600 active:scale-[0.98]"
          }`}
        >
          <Plus className={`w-3 h-3 ${isQuickDisabled ? "text-gray-600" : "text-gray-400"}`} />
          <span>Quick</span>
        </button>
      </div>

      {/* Active Breaks List */}
      <div className="space-y-2 pt-1">
        {breaks.length === 0 ? (
          <p className="text-xs text-gray-500 italic text-center py-2">
            No breaks active (movies back-to-back)
          </p>
        ) : (
          breaks.map((b, idx) => {
            const info = BREAK_INFO[b.intent as BreakIntent] || BREAK_INFO.Lunch;
            const isInactive = idx >= maxAllowedBreaks;
            const isRemoving = removingId === b.id;
            return (
              <div
                key={b.id}
                className={`bg-dark-surface/80 border border-dark-border border-l-4 border-l-amber-500 rounded-lg p-2.5 space-y-2 shadow-sm hover:border-dark-border hover:border-l-amber-400 ${
                  isRemoving
                    ? "opacity-0 -translate-y-1 scale-95 transition-all duration-75 ease-out pointer-events-none"
                    : "animate-break-in transition-all duration-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <info.icon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="font-semibold text-xs text-gray-200 truncate">
                      {info.title}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemove(b.id)}
                    title={`Remove ${info.title}`}
                    className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-red-300 hover:bg-red-500/20 active:scale-90 transition flex-shrink-0 ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Size chips */}
                <div className="flex space-x-1">
                  {info.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => onUpdateBreakSize(b.id, s)}
                      className={`text-[11px] px-2 py-0.5 rounded flex-1 text-center font-medium transition ${
                        b.size === s
                          ? "bg-dark-card border border-amber-500/60 text-amber-800 dark:text-amber-300 font-bold shadow-sm"
                          : "bg-dark-card/60 border border-transparent text-gray-400 hover:text-gray-200 hover:bg-dark-card"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {isInactive && (
                  <div className="flex items-center space-x-1 text-[11px] text-amber-700 dark:text-amber-300 pt-0.5">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span>
                      Inactive: {numMovies} {numMovies === 1 ? "movie" : "movies"} only accommodates {maxAllowedBreaks} {maxAllowedBreaks === 1 ? "break" : "breaks"}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
