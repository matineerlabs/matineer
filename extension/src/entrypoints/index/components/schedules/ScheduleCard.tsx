import { TimelineItemType, isPremiumFormat } from "../../../../shared/types/movie";
import React, { useState } from "react";
import { Clock, Film, Pause, Sparkles, Utensils, Zap } from "lucide-react";
import { Schedule } from "../../types/api";
import { TimelineBar, getTimelineItemKey } from "./TimelineBar";
import { AuditoriumDropdown } from "./AuditoriumDropdown";
import { useClickOutside } from "../../hooks/useClickOutside";

interface ScheduleCardProps {
  schedule: Schedule;
  rank: number;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({ schedule, rank }) => {
  const [openBookingDropdownIdx, setOpenBookingDropdownIdx] = useState<number | null>(null);
  const [hoveredItemKey, setHoveredItemKey] = useState<string | null>(null);

  useClickOutside({
    onClose: () => setOpenBookingDropdownIdx(null),
    enabled: openBookingDropdownIdx !== null,
    ignoreSelector: openBookingDropdownIdx !== null
      ? `[data-booking-menu="${openBookingDropdownIdx}"]`
      : undefined,
  });

  const totalSpanMin = Math.max(0, schedule.end_min - schedule.start_min);
  const hours = Math.floor(totalSpanMin / 60);
  const mins = totalSpanMin % 60;
  const durationStr = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`;

  const relaxations = schedule.relaxations || [];
  const startWindowRel = relaxations.find((r) => r.type === "time_window" && r.target === "start");
  const endWindowRel = relaxations.find((r) => r.type === "time_window" && r.target === "end");
  const omittedBreakRels = relaxations.filter((r) => r.type === "break_omitted");

  return (
    <div
      className={`bg-dark-card border border-dark-border rounded-lg p-4 space-y-3 shadow-sm hover:border-gray-700 transition ${
        openBookingDropdownIdx !== null ? "relative z-30" : "relative"
      }`}
    >
      {/* Top Header Vitals */}
      <div className="flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center space-x-2.5">
          <span
            className={`${
              schedule.is_relaxed
                ? "bg-dark-surface text-gray-300 border border-dark-border"
                : "bg-brand-blue text-brand-text"
            } font-black text-xs px-2.5 py-0.5 rounded shadow`}
          >
            #{rank}
          </span>
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-baseline space-x-2">
              <span className="font-bold text-gray-100 text-sm">
                {schedule.start_time_str} – {schedule.end_time_str}
              </span>
              <span className="text-xs text-gray-400 font-medium">
                ({durationStr})
              </span>
            </div>
            {(startWindowRel || endWindowRel) && (
              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                · {[startWindowRel?.note || startWindowRel?.description, endWindowRel?.note || endWindowRel?.description].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1">
          {omittedBreakRels.map((rel, rIdx) => (
            <span
              key={`omitted-${rIdx}`}
              className="text-[11px] font-medium px-2 py-1 rounded bg-amber-100/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/50"
            >
              {rel.note || rel.description}
            </span>
          ))}

          <span className="text-gray-300 bg-dark-surface px-2 py-1 rounded border border-dark-border flex items-center space-x-1.5 font-medium">
            <Clock className="w-3 h-3 text-gray-400" />
            <span>{schedule.total_wasted_wait_min}m wait</span>
          </span>

          {schedule.has_premium && (
            <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800/60 font-semibold px-2 py-1 rounded flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              <span>
                {(schedule.premium_movie_count ?? 0) > 0
                  ? `${schedule.premium_movie_count} Premium`
                  : "Premium"}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Visual Timeline Bar with Gantt Hover Emphasis */}
      <TimelineBar
        items={schedule.timeline_items}
        totalStartMin={schedule.start_min}
        totalEndMin={schedule.end_min}
        hoveredKey={hoveredItemKey}
        onHoverKey={setHoveredItemKey}
      />

      {/* Detailed Itinerary List */}
      <div className="space-y-2 pt-1 text-xs">
        {schedule.timeline_items.map((item, idx) => {
          const itemKey = getTimelineItemKey(item, idx);
          const isHovered = hoveredItemKey === itemKey;

          if (item.item_type === TimelineItemType.MOVIE && item.showing) {
            const s = item.showing;
            const fmtName = !s.format_name || s.format_name.toLowerCase() === "undefined" ? "Digital" : s.format_name;
            const isPrem = s.is_premium || isPremiumFormat(fmtName);

            const cardBorderClass = isPrem
              ? isHovered
                ? "border-purple-500 border-l-2 border-l-purple-400 ring-1 ring-inset ring-purple-500/50"
                : "border-dark-border/60 border-l-2 border-l-purple-500/70"
              : isHovered
              ? "border-blue-500 border-l-2 border-l-blue-400 ring-1 ring-inset ring-blue-500/50"
              : "border-dark-border/60 border-l-2 border-l-blue-500/70";

            return (
              <div
                key={itemKey}
                className={`bg-dark-surface/60 border rounded-md p-2.5 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap transition-all duration-150 ${cardBorderClass} ${
                  openBookingDropdownIdx === idx ? "relative z-20" : "relative z-0"
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {/* Poster thumbnail */}
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-dark-bg border border-dark-border flex-shrink-0 flex items-center justify-center">
                    {s.poster_url ? (
                      <img src={s.poster_url} alt={s.title} className="w-full h-full object-cover" />
                    ) : (
                      <Film className="w-4 h-4 text-gray-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-200 truncate flex items-center space-x-1.5 flex-wrap">
                      <span>{s.title}</span>
                      <span
                        className={`text-[11px] font-semibold whitespace-nowrap inline-flex items-center space-x-1 ${
                          isPrem ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {isPrem && <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400 inline-block flex-shrink-0" />}
                        <span>[{fmtName}]</span>
                      </span>
                      {s.is_format_fallback && (
                        <span className="text-[11px] font-normal text-amber-700 dark:text-amber-400">
                          · unselected format
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate mt-0.5">
                      <span>Showtime <strong className="text-gray-100 font-bold text-xs">{s.start_time_str}</strong></span>
                      <span className="text-gray-600 mx-1.5">·</span>
                      <span>Feature {s.feature_start_str} – {s.end_time_str}</span>
                    </div>
                  </div>
                </div>

                {/* Booking link button */}
                <AuditoriumDropdown
                  urls={s.booking_urls && s.booking_urls.length > 0 ? s.booking_urls : (s.booking_url ? [s.booking_url] : [])}
                  movieTitle={s.title}
                  startTimeStr={s.start_time_str}
                  isOpen={openBookingDropdownIdx === idx}
                  onToggle={() => setOpenBookingDropdownIdx((prev) => (prev === idx ? null : idx))}
                  onClose={() => setOpenBookingDropdownIdx(null)}
                  menuIndex={idx}
                />
              </div>
            );
          } else if (item.item_type === TimelineItemType.BREAK) {
            const isMeal = /lunch|dinner/i.test(item.label);
            const isBreather = /quick|breather/i.test(item.label);
            const BreakIcon = isMeal ? Utensils : isBreather ? Zap : Pause;
            const breakNotes = relaxations
              .filter(
                (r) =>
                  (r.type === "break_added" || r.type === "break_resized" || r.type === "break_window") &&
                  r.target === item.label
              )
              .map((r) => r.note || r.description);

            return (
              <div
                key={itemKey}
                className={`border rounded-md p-2 flex items-center space-x-2 text-xs font-semibold ${
                  isHovered
                    ? "bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-600 border-l-4 border-l-amber-600 dark:border-l-amber-400 ring-1 ring-inset ring-amber-400/50 text-amber-950 dark:text-amber-100"
                    : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40 border-l-4 border-l-amber-600 dark:border-l-amber-500 text-amber-950 dark:text-amber-200"
                }`}
              >
                <BreakIcon className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 flex-shrink-0" />
                <span>
                  {item.label}: {item.start_str} – {item.end_str} ({item.duration_min} min)
                  {breakNotes.length > 0 && (
                    <span className="font-normal text-amber-800/90 dark:text-amber-300/90">
                      {" "}· {breakNotes.join(", ")}
                    </span>
                  )}
                </span>
              </div>
            );
          } else if (item.item_type === TimelineItemType.GAP && item.duration_min > 0) {
            // Find the next movie in the timeline to check for wait relaxations
            const nextMovieItem = schedule.timeline_items
              .slice(idx + 1)
              .find((it) => it.item_type === TimelineItemType.MOVIE);
            const isLastGapBeforeNextMovie =
              !schedule.timeline_items
                .slice(idx + 1, schedule.timeline_items.indexOf(nextMovieItem!))
                .some((it) => it.item_type === TimelineItemType.GAP && it.duration_min > 0);
            const waitRel =
              nextMovieItem?.showing && isLastGapBeforeNextMovie
                ? relaxations.find(
                    (r) =>
                      (r.type === "max_wait" || r.type === "min_wait") &&
                      r.target === nextMovieItem.showing!.title
                  )
                : undefined;

            return (
              <div
                key={itemKey}
                className={`text-[11px] pl-4 py-0.5 border-l-2 my-0.5 flex items-center space-x-1 ${
                  isHovered
                    ? "border-l-blue-500 dark:border-l-blue-400 text-blue-900 dark:text-blue-100 bg-blue-50 dark:bg-blue-950/40 rounded-r font-medium"
                    : "border-l-gray-300 dark:border-l-gray-600 text-gray-200 dark:text-gray-300 font-medium"
                }`}
              >
                <span>
                  Wait {item.duration_min}m until the next showtime
                  {waitRel && (
                    <span className="text-amber-700 dark:text-amber-400">
                      {" "}· {waitRel.note || waitRel.description}
                    </span>
                  )}
                </span>
              </div>
            );
          } else if (item.item_type === TimelineItemType.FAST_CONNECTION || (item.item_type === TimelineItemType.GAP && item.duration_min < 0)) {
            const overlapMin = Math.abs(item.duration_min);
            const nextItem = schedule.timeline_items[idx + 1];
            const trailerDur = nextItem?.showing?.trailer_min ?? 25;
            const remainingTrailerMin = Math.max(0, trailerDur - overlapMin);
            const waitRel = nextItem?.showing
              ? relaxations.find(
                  (r) => r.type === "min_wait" && r.target === nextItem.showing!.title
                )
              : undefined;

            return (
              <div
                key={itemKey}
                className={`text-[11px] pl-4 py-0.5 border-l-2 my-0.5 flex items-center space-x-1 ${
                  isHovered
                    ? "border-l-amber-500 dark:border-l-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-white rounded-r font-medium"
                    : "border-l-amber-500/60 dark:border-l-amber-400/60 text-amber-900 dark:text-amber-100 font-medium"
                }`}
              >
                <span>
                  Skip {overlapMin}m of trailers · {remainingTrailerMin}m until the next feature begins
                  {waitRel && (
                    <span className="text-amber-700 dark:text-amber-400">
                      {" "}· {waitRel.note || waitRel.description}
                    </span>
                  )}
                </span>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};
