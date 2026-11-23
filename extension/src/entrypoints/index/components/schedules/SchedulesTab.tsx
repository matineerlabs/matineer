import React, { useState, useEffect } from "react";
import { AlertTriangle, Film, Info, Loader2, Pin } from "lucide-react";
import { PinnedShowing, Schedule } from "../../types/api";
import { ScheduleCard } from "./ScheduleCard";
import { useOptionalMarathonConfig } from "../../context/MarathonConfigContext";

export interface SchedulesTabProps {
  schedules: Schedule[];
  isSolving: boolean;
  mustSeeTitles?: string[];
  numMovies?: number;
  selectedMoviesCount?: number;
  pinnedShowing?: PinnedShowing | null;
}

interface EmptyScheduleNoticeProps {
  numMovies: number;
  selectedMoviesCount?: number;
  mustSeeTitles: string[];
  pinnedShowing?: PinnedShowing | null;
}

const EmptyScheduleNotice: React.FC<EmptyScheduleNoticeProps> = ({
  numMovies,
  selectedMoviesCount,
  mustSeeTitles,
  pinnedShowing,
}) => {
  // 1. Movie deficit: fewer movies included than required marathon size
  if (selectedMoviesCount !== undefined && selectedMoviesCount < numMovies) {
    const deficit = numMovies - selectedMoviesCount;
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center text-gray-400 space-y-3">
        <div className="flex items-center justify-center space-x-2 text-gray-200 font-semibold text-sm">
          <Film className="w-4 h-4 flex-shrink-0 text-gray-400" />
          <span>At least {numMovies} movies must be selected for this marathon.</span>
        </div>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          You currently have {selectedMoviesCount} movie{selectedMoviesCount === 1 ? "" : "s"} included.
          Go to the <strong className="text-gray-200 font-medium">Available Movies</strong> tab and mark at least{" "}
          {deficit} more movie{deficit === 1 ? "" : "s"} as{" "}
          <strong className="text-gray-200 font-medium">Included</strong> or{" "}
          <strong className="text-gray-200 font-medium">Must-See</strong>.
        </p>
      </div>
    );
  }

  // 2. Too many Must-See movies for chosen marathon size
  if (mustSeeTitles.length > numMovies) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center text-gray-400 space-y-3">
        <div className="flex items-center justify-center space-x-2 text-gray-200 font-semibold text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-gray-400" />
          <span>
            Too many Must-See movies selected ({mustSeeTitles.length}) for a {numMovies}-movie marathon.
          </span>
        </div>
        <p className="text-xs text-gray-400 max-w-lg mx-auto">
          A {numMovies}-movie schedule cannot include all {mustSeeTitles.length} of your Must-See movies (
          <strong className="text-gray-200 font-medium">{mustSeeTitles.join(", ")}</strong>).{" "}
          {numMovies < 4 && mustSeeTitles.length <= 4 ? (
            <>
              Please either reduce your Must-See selections in the{" "}
              <strong className="text-gray-200 font-medium">Available Movies</strong> tab or increase the marathon size in the
              sidebar.
            </>
          ) : (
            <>
              Please reduce your Must-See selections in the{" "}
              <strong className="text-gray-200 font-medium">Available Movies</strong> tab (the maximum marathon size supported is 4
              movies).
            </>
          )}
        </p>
      </div>
    );
  }

  // 3. Pinned screening conflict
  if (pinnedShowing) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center text-gray-400 space-y-3">
        <div className="flex items-center justify-center space-x-2 text-gray-200 font-semibold text-sm">
          <Pin className="w-4 h-4 flex-shrink-0 text-gray-400" />
          <span>
            No valid schedules could accommodate your pinned screening:{" "}
            <strong className="text-gray-200 font-medium">
              {pinnedShowing.title} @ {pinnedShowing.time} ({pinnedShowing.format_name})
            </strong>
          </span>
        </div>
        <p className="text-xs text-gray-400 max-w-lg mx-auto">
          Other screenings around this showtime may exceed your Max Wait limit, violate break rules, or fall outside
          your Earliest/Latest time window. Try increasing the{" "}
          <strong className="text-gray-200 font-medium">Wait Between Movies</strong> slider in the
          sidebar, adjusting break rules, or unpinning this showtime in the{" "}
          <strong className="text-gray-200 font-medium">Available Movies</strong> tab.
        </p>
      </div>
    );
  }

  // 4. Must-See chain connection conflict
  if (mustSeeTitles.length > 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center text-gray-400 space-y-3">
        <div className="flex items-center justify-center space-x-2 text-gray-200 font-semibold text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-gray-400" />
          <span>
            No valid schedules could accommodate your Must-See movie{mustSeeTitles.length > 1 ? "s" : ""}:{" "}
            <strong className="text-gray-200 font-medium">{mustSeeTitles.join(", ")}</strong>
          </span>
        </div>
        <p className="text-xs text-gray-400 max-w-lg mx-auto">
          The available showtimes for the selected format(s) may exceed your Max Wait limit or fall outside your
          Earliest/Latest time window. Try increasing the{" "}
          <strong className="text-gray-200 font-medium">Wait Between Movies</strong> slider in the sidebar or
          enabling additional formats in the{" "}
          <strong className="text-gray-200 font-medium">Available Movies</strong> tab.
        </p>
      </div>
    );
  }

  // 5. General fallback
  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center text-gray-400 space-y-3">
      <div className="flex items-center justify-center space-x-2 text-gray-200 font-semibold text-sm">
        <Info className="w-4 h-4 flex-shrink-0 text-gray-400" />
        <span>No valid schedules found matching the constraints.</span>
      </div>
      <p className="text-xs text-gray-400 max-w-md mx-auto">
        Try broadening your time bounds, adjusting wait window sliders, or removing one or more breaks.
      </p>
    </div>
  );
};

export const SchedulesTab: React.FC<SchedulesTabProps> = ({
  schedules,
  isSolving,
  mustSeeTitles = [],
  numMovies: propNumMovies,
  selectedMoviesCount,
  pinnedShowing = null,
}) => {
  const marathonConfig = useOptionalMarathonConfig();
  const numMovies = propNumMovies ?? marathonConfig?.numMovies ?? 3;
  const safeSchedules = Array.isArray(schedules) ? schedules : [];
  const strictSchedules = safeSchedules.filter((s) => !s.is_relaxed);
  const relaxedSchedules = safeSchedules.filter((s) => s.is_relaxed);

  // Only show "Recalculating..." spinner if solving takes longer than 250ms (avoids flicker)
  const [showRecalculating, setShowRecalculating] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isSolving) {
      timer = setTimeout(() => {
        setShowRecalculating(true);
      }, 250);
    } else {
      setShowRecalculating(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isSolving]);

  return (
    <div className="space-y-4">
      {showRecalculating && safeSchedules.length > 0 && (
        <div className="flex justify-end">
          <div className="flex items-center space-x-1.5 bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-500/30 px-2.5 py-1 rounded-md text-xs text-blue-800 dark:text-blue-300 flex-shrink-0 animate-badge-in">
            <Loader2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
            <span className="font-medium text-[11px]">Recalculating...</span>
          </div>
        </div>
      )}

      {/* Schedule Cards List */}
      <div className="space-y-4">
        {isSolving && safeSchedules.length === 0 ? (
          <div className="bg-dark-card border border-dark-border rounded-lg p-16 text-center text-gray-400 space-y-3 shadow-sm">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto" />
            <p className="font-semibold text-sm text-gray-200">Finding Marathon Schedules...</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Evaluating candidate showtimes, connections, and break windows.
            </p>
          </div>
        ) : safeSchedules.length === 0 ? (
          <EmptyScheduleNotice
            numMovies={numMovies}
            selectedMoviesCount={selectedMoviesCount}
            mustSeeTitles={mustSeeTitles}
            pinnedShowing={pinnedShowing}
          />
        ) : (
          <>
            {strictSchedules.map((schedule, idx) => (
              <ScheduleCard
                key={schedule.schedule_id || idx}
                schedule={schedule}
                rank={idx + 1}
              />
            ))}

            {relaxedSchedules.length > 0 && (
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-dark-border" />
                <span className="text-xs font-semibold text-gray-300 bg-dark-surface border border-dark-border rounded-full px-3 py-1 tracking-wide">
                  {strictSchedules.length === 0
                    ? "No exact matches · Closest options outside your filters"
                    : "Closest options slightly outside your filters"}
                </span>
                <div className="h-px flex-1 bg-dark-border" />
              </div>
            )}

            {relaxedSchedules.map((schedule, idx) => (
              <ScheduleCard
                key={schedule.schedule_id || `relaxed-${idx}`}
                schedule={schedule}
                rank={strictSchedules.length + idx + 1}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};
