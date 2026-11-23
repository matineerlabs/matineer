import { TimelineItemType, isPremiumFormat } from "../../../../shared/types/movie";
import React from "react";
import { TimelineItem } from "../../types/api";
import { MovieShowingResponse } from "../../../../shared/types/schemas";

export function getTimelineItemKey(item: TimelineItem, idx: number): string {
  return `${item.item_type}-${item.start_min}-${item.end_min}-${item.label || item.showing?.title || idx}`;
}

export interface TimelineBarProps {
  items: TimelineItem[];
  totalStartMin: number;
  totalEndMin: number;
  hoveredKey?: string | null;
  onHoverKey?: (key: string | null) => void;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({
  items,
  totalStartMin,
  totalEndMin,
  hoveredKey,
  onHoverKey,
}) => {
  const totalSpan = Math.max(1, totalEndMin - totalStartMin);

  return (
    <div
      className="w-full h-8 bg-dark-surface rounded overflow-hidden flex shadow-inner border border-dark-border/40"
      onMouseLeave={() => onHoverKey?.(null)}
    >
      {items.map((item, idx) => {
        const itemKey = getTimelineItemKey(item, idx);
        const isItemHovered = hoveredKey === itemKey;

        if (item.item_type === TimelineItemType.FAST_CONNECTION) {
          return null;
        }

        if (item.item_type === TimelineItemType.BREAK) {
          const itemDuration = item.end_min - item.start_min;
          const widthPct = (itemDuration / totalSpan) * 100;
          return (
            <div
              key={itemKey}
              style={{ width: `${widthPct}%` }}
              onMouseEnter={() => onHoverKey?.(itemKey)}
              className={`bg-yellow-400 dark:bg-yellow-600 text-brand-text h-full flex items-center justify-center px-1 text-[11px] font-bold border-r border-dark-bg/60 truncate cursor-pointer ${
                isItemHovered ? "brightness-110 ring-1 ring-inset ring-brand-text/60 z-10" : ""
              }`}
            >
              <span className="truncate">{item.label}</span>
            </div>
          );
        }

        if (item.item_type === TimelineItemType.GAP) {
          if (item.duration_min <= 0) return null;
          const itemDuration = item.end_min - item.start_min;
          const widthPct = (itemDuration / totalSpan) * 100;
          return (
            <div
              key={itemKey}
              style={{ width: `${widthPct}%` }}
              onMouseEnter={() => onHoverKey?.(itemKey)}
              className={`bg-gray-800 text-gray-400 h-full border-r border-dark-bg/60 cursor-pointer ${
                isItemHovered ? "bg-gray-700 ring-1 ring-inset ring-gray-400/60 z-10" : ""
              }`}
            />
          );
        }

        if (item.item_type === TimelineItemType.MOVIE && item.showing) {
          const s = item.showing;
          const isPrem =
            s.is_premium ||
            Boolean(s.format_name && isPremiumFormat(s.format_name));

          // Check if previous item was a fast connection (incoming overlap into our trailers)
          const prevItem = idx > 0 ? items[idx - 1] : null;
          const isPrevFastConn =
            prevItem?.item_type === TimelineItemType.FAST_CONNECTION ||
            (prevItem?.item_type === TimelineItemType.GAP && prevItem.duration_min < 0);
          const prevOverlapMin = isPrevFastConn && prevItem ? Math.abs(prevItem.duration_min) : 0;

          // Check if next item is a fast connection (outgoing overlap from our end into next trailers)
          const nextItem = idx < items.length - 1 ? items[idx + 1] : null;
          const isNextFastConn =
            nextItem?.item_type === TimelineItemType.FAST_CONNECTION ||
            (nextItem?.item_type === TimelineItemType.GAP && nextItem.duration_min < 0);
          const nextOverlapMin = isNextFastConn && nextItem ? Math.abs(nextItem.duration_min) : 0;
          const nextItemKey = nextItem && (idx < items.length - 1) ? getTimelineItemKey(nextItem, idx + 1) : null;
          const isOverlapHovered = Boolean(nextItemKey && hoveredKey === nextItemKey);

          // Find next movie showing to know adjoining format context
          let nextShowing: MovieShowingResponse | null = null;
          for (let n = idx + 1; n < items.length; n++) {
            const currentItem = items[n];
            if (currentItem && currentItem.item_type === TimelineItemType.MOVIE && currentItem.showing) {
              nextShowing = currentItem.showing;
              break;
            }
          }

          const isNextPrem = Boolean(
            nextShowing &&
              (nextShowing.is_premium ||
                (nextShowing.format_name && isPremiumFormat(nextShowing.format_name)))
          );

          // Select context-dependent hatched pattern for outgoing overlap (end of this movie)
          let trailingHatchedClass = "bg-hatched-trailers-blue";
          if (isPrem && isNextPrem) {
            trailingHatchedClass = "bg-hatched-trailers-purple";
          } else if (isPrem || isNextPrem) {
            trailingHatchedClass = "bg-hatched-trailers-mixed";
          } else {
            trailingHatchedClass = "bg-hatched-trailers-blue";
          }

          // Effective visible start on continuous timeline
          const visibleStartMin = isPrevFastConn ? s.start_min + prevOverlapMin : s.start_min;
          const visibleDuration = s.end_min - visibleStartMin;

          // Outgoing overlap minutes at the tail end of this movie
          const trailingOverlapMin = isNextFastConn ? nextOverlapMin : 0;
          const featureMin = Math.max(0, visibleDuration - trailingOverlapMin);

          const featureWidthPct = (featureMin / totalSpan) * 100;
          const overlapWidthPct = (trailingOverlapMin / totalSpan) * 100;

          const solidBg = isPrem ? "bg-brand-purple" : "bg-brand-accent";

          return (
            <React.Fragment key={itemKey}>
              {/* Solid Feature Film Segment */}
              <div
                style={{ width: `${featureWidthPct}%` }}
                onMouseEnter={() => onHoverKey?.(itemKey)}
                className={`${solidBg} text-brand-text h-full flex items-center justify-center px-1 text-[11px] font-bold border-r border-dark-bg/60 truncate cursor-pointer ${
                  isItemHovered ? "brightness-110 ring-1 ring-inset ring-brand-text/60 z-10" : ""
                }`}
              >
                <span className="truncate">{s.title}</span>
              </div>

              {/* Trailing Hatched Overlap Segment (Only the actual overlap of trailers) */}
              {isNextFastConn && trailingOverlapMin > 0 && (
                <div
                  style={{ width: `${overlapWidthPct}%` }}
                  onMouseEnter={() => {
                    if (nextItemKey) onHoverKey?.(nextItemKey);
                  }}
                  className={`h-full border-r border-dark-bg/60 ${trailingHatchedClass} cursor-pointer ${
                    isOverlapHovered ? "brightness-125 ring-1 ring-inset ring-amber-400/80 z-20" : ""
                  }`}
                />
              )}
            </React.Fragment>
          );
        }

        return null;
      })}
    </div>
  );
};
