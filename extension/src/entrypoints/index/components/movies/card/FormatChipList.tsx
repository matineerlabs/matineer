import React from "react";
import { Movie } from "../../../types/api";
import { formatComparator, isPremiumFormat, normalizeFormatName } from "../../../../../shared/types/formats";

export { formatComparator };

export interface FormatChipListProps {
  movie: Movie;
  onFormatToggle: (fmt: string) => void;
}

export const FormatChipList: React.FC<FormatChipListProps> = ({
  movie,
  onFormatToggle,
}) => {
  const allFormats = movie.all_formats || [];
  const showingsByFormat = movie.showings_by_format || {};
  const allowedFormats = movie.allowed_formats || [];

  const sortedFormats = [...allFormats].sort(formatComparator);

  if (sortedFormats.length === 0) return null;

  return (
    <>
      <span className="text-gray-500 text-[11px] ml-0.5 whitespace-nowrap">
        Formats:
      </span>
      {sortedFormats.map((fmt) => {
        const displayName =
          !fmt || fmt.toLowerCase() === "undefined" ? "Digital" : fmt;

        const allShowtimesForFormat = showingsByFormat[fmt] || [];
        const allSoldOut =
          allShowtimesForFormat.length > 0 &&
          allShowtimesForFormat.every((s) => s.is_sold_out);

        const fmtNorm = normalizeFormatName(fmt);
        const isAllowed = allowedFormats.some((f) => normalizeFormatName(f) === fmtNorm);
        const isPremFmt = isPremiumFormat(displayName);
        const isOnlyAllowed = isAllowed && allowedFormats.length <= 1;

        const isDisabled = isOnlyAllowed || allSoldOut;

        let title = isAllowed ? `Disable ${displayName}` : `Enable ${displayName}`;
        if (allSoldOut) {
          title = `All showtimes for ${displayName} are sold out`;
        } else if (isOnlyAllowed) {
          title = "At least one format must remain selected";
        }

        return (
          <button
            key={fmt}
            onClick={() => {
              if (!isDisabled) {
                onFormatToggle(fmt);
              }
            }}
            disabled={isDisabled}
            title={title}
            className={`text-[11px] font-semibold px-2 py-0.5 rounded transition flex items-center space-x-1 whitespace-nowrap flex-shrink-0 ${
              allSoldOut
                ? "bg-dark-surface/50 text-gray-500 cursor-not-allowed opacity-60 border border-dark-border"
                : isAllowed
                ? isPremFmt
                  ? isOnlyAllowed
                    ? "bg-brand-purple text-brand-text shadow-sm cursor-not-allowed opacity-90"
                    : "bg-brand-purple hover:bg-brand-purpleHover text-brand-text shadow-sm"
                  : isOnlyAllowed
                  ? "bg-brand-accent text-brand-text shadow-sm cursor-not-allowed opacity-90"
                  : "bg-brand-accent hover:bg-brand-accentHover text-brand-text shadow-sm transition"
                : "bg-dark-surface text-gray-400 hover:text-gray-200 border border-dark-border"
            }`}
          >
            <span>{isAllowed ? "✓" : "✗"}</span>
            <span className={allSoldOut ? "line-through" : ""}>{displayName}</span>
          </button>
        );
      })}
    </>
  );
};
