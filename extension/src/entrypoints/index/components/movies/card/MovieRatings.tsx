import React from "react";
import { Star } from "lucide-react";

export interface MovieRatingsProps {
  rtScore?: string | null;
  audienceScore?: string | null;
  imdbRating?: string | null;
  imdbId?: string | null;
  title: string;
  animate?: boolean;
}

export const MovieRatings: React.FC<MovieRatingsProps> = ({
  rtScore,
  audienceScore,
  imdbRating,
  imdbId,
  title,
  animate = false,
}) => {
  const [shouldAnimate, setShouldAnimate] = React.useState(animate);

  React.useEffect(() => {
    if (animate) {
      setShouldAnimate(true);
    }
  }, [animate]);
  if (!rtScore && !audienceScore && !imdbRating) {
    return null;
  }

  const rtSearchUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(
    title
  )}`;
  const imdbUrl = imdbId
    ? `https://www.imdb.com/title/${imdbId}/`
    : `https://www.imdb.com/find/?q=${encodeURIComponent(title)}&s=tt`;

  const getRtColor = (valStr?: string | null) => {
    if (!valStr) return "text-gray-300";
    const n = parseInt(valStr.replace(/[^\d]/g, ""), 10);
    if (isNaN(n)) return "text-gray-300";
    if (n >= 75) return "text-emerald-600 dark:text-emerald-400 font-bold";
    if (n >= 60) return "text-amber-600 dark:text-amber-300 font-semibold";
    return "text-rose-600 dark:text-rose-400 font-medium";
  };

  const getImdbColor = (valStr?: string | null) => {
    if (!valStr) return "text-gray-300";
    const n = parseFloat(valStr);
    if (isNaN(n)) return "text-gray-300";
    if (n > 7.3) return "text-emerald-600 dark:text-emerald-400 font-bold";
    if (n >= 6.0) return "text-amber-600 dark:text-amber-300 font-semibold";
    return "text-rose-600 dark:text-rose-400 font-medium";
  };

  const tooltipParts = [];
  if (rtScore) tooltipParts.push(`Critics: ${rtScore}`);
  if (audienceScore) tooltipParts.push(`Audience: ${audienceScore}`);
  if (imdbRating) tooltipParts.push(`IMDb: ${imdbRating}`);
  const tooltipText = tooltipParts.join(" · ");

  const hasRt = Boolean(rtScore || audienceScore);
  const hasImdb = Boolean(imdbRating);

  return (
    <div
      className={`bg-dark-surface border border-dark-border rounded-md px-2 py-0.5 shadow-sm inline-flex items-center space-x-2 text-[10px] whitespace-nowrap flex-shrink-0 ${
        shouldAnimate ? "animate-ratings-pop" : ""
      }`}
      onAnimationEnd={() => setShouldAnimate(false)}
      title={tooltipText}
    >
      {/* Rotten Tomatoes Section */}
      {hasRt && (
        <a
          href={rtSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 transition hover:opacity-80"
          title={
            [
              rtScore ? `Critics: ${rtScore}` : "",
              audienceScore ? `Audience: ${audienceScore}` : "",
            ]
              .filter(Boolean)
              .join(" · ")
          }
          onClick={(e) => e.stopPropagation()}
        >
          {rtScore && (
            <span className={`flex items-center space-x-0.5 ${getRtColor(rtScore)}`}>
              <span>🍅</span>
              <span>{rtScore}</span>
            </span>
          )}
          {rtScore && audienceScore && (
            <span className="text-slate-600 font-normal select-none">·</span>
          )}
          {audienceScore && (
            <span className={`flex items-center space-x-0.5 ${getRtColor(audienceScore)}`}>
              <span>🍿</span>
              <span>{audienceScore}</span>
            </span>
          )}
        </a>
      )}

      {/* Divider between RT and IMDb */}
      {hasRt && hasImdb && (
        <span className="text-slate-600 font-normal select-none px-0.5">|</span>
      )}

      {/* IMDb Section */}
      {hasImdb && (
        <a
          href={imdbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 transition hover:opacity-80"
          title={`IMDb: ${imdbRating}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400 flex-shrink-0" />
          <span className={getImdbColor(imdbRating)}>{imdbRating}</span>
        </a>
      )}
    </div>
  );
};
