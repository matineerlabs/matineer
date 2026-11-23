import React from "react";
import { Pin } from "lucide-react";
import { Movie, PinnedShowing } from "../../../types/api";

export interface PinnedBadgeProps {
  movie: Movie;
  pinnedShowing: PinnedShowing | null;
  onUnpinShowing?: (title: string) => void;
}

export const PinnedBadge: React.FC<PinnedBadgeProps> = ({
  movie,
  pinnedShowing,
  onUnpinShowing,
}) => {
  if (
    !pinnedShowing ||
    pinnedShowing.title.trim().toLowerCase() !== movie.title.trim().toLowerCase()
  ) {
    return null;
  }

  const pinnedFmtNorm =
    !pinnedShowing.format_name ||
    pinnedShowing.format_name.toLowerCase() === "undefined"
      ? "digital"
      : pinnedShowing.format_name.trim().toLowerCase();

  const allowedFormats = movie.allowed_formats || [];
  const isPinFormatAllowed = allowedFormats.some(
    (f) =>
      (!f || f.toLowerCase() === "undefined"
        ? "digital"
        : f.trim().toLowerCase()) === pinnedFmtNorm
  );

  if (!isPinFormatAllowed) {
    return null;
  }

  return (
    <div className="flex items-center space-x-1.5 text-[10px] leading-none bg-blue-100 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-800/80 text-blue-800 dark:text-blue-200 font-semibold px-2 py-0.5 rounded shadow-sm">
      <Pin className="w-2.5 h-2.5 fill-current text-blue-600 dark:text-blue-400 -rotate-45 flex-shrink-0" />
      <span>Pinned: {pinnedShowing.time}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onUnpinShowing?.(movie.title);
        }}
        className="text-blue-600 dark:text-blue-300 hover:text-white ml-0.5 hover:bg-blue-600 dark:hover:bg-blue-800/50 rounded px-1 transition text-[11px] leading-none"
        title="Unpin this showtime"
      >
        ✕
      </button>
    </div>
  );
};
