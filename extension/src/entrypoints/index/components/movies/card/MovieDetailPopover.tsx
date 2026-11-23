import React from "react";
import { Clock, Film, Star } from "lucide-react";
import { Movie } from "../../../types/api";
import { normalizeMpaRating } from "../../../../../shared/utils/movie";

export interface MovieDetailPopoverProps {
  movie: Movie;
  placement?: "bottom" | "top";
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const MovieDetailPopover: React.FC<MovieDetailPopoverProps> = ({
  movie,
  placement = "bottom",
  onMouseEnter,
  onMouseLeave,
}) => {
  const mpaa = normalizeMpaRating(movie.rated);

  const getRtColor = (valStr?: string | null) => {
    if (!valStr) return "text-gray-300";
    const n = parseInt(valStr.replace(/[^\d]/g, ""), 10);
    if (isNaN(n)) return "text-gray-300";
    if (n >= 75) return "text-emerald-400 font-bold";
    if (n >= 60) return "text-amber-300 font-semibold";
    return "text-rose-400 font-medium";
  };

  const getImdbColor = (valStr?: string | null) => {
    if (!valStr) return "text-gray-300";
    const n = parseFloat(valStr);
    if (isNaN(n)) return "text-gray-300";
    if (n > 7.3) return "text-emerald-400 font-bold";
    if (n >= 6.0) return "text-amber-300 font-semibold";
    return "text-rose-400 font-medium";
  };

  const genres = movie.genre
    ? movie.genre
        .split(/[,/•]/)
        .map((g) => g.trim())
        .filter(Boolean)
    : [];

  const formats = movie.all_formats || [];
  const programs = movie.program_labels || [];

  return (
    <div
      role="tooltip"
      aria-label={`${movie.title} Details`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`absolute z-50 w-80 sm:w-96 p-4 rounded-xl bg-dark-card/95 backdrop-blur-md border border-dark-border shadow-2xl space-y-3 pointer-events-auto transition-all ${
        placement === "top" ? "bottom-full mb-2" : "top-full mt-2"
      } left-0`}
    >
      {/* Header: Masked circular AMC poster + Title and Meta */}
      <div className="flex items-start space-x-3.5">
        {/* Masked circular thumbnail */}
        <div className="w-14 h-14 rounded-full overflow-hidden bg-dark-surface border-2 border-dark-border flex-shrink-0 flex items-center justify-center shadow-md">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <Film className="w-6 h-6 text-gray-500" />
          )}
        </div>

        {/* Title, Specs, Badges */}
        <div className="space-y-1 min-w-0 flex-1">
          <h4 className="font-bold text-gray-100 text-sm leading-snug break-words">
            {movie.title}
          </h4>

          {/* Badges Row: Runtime, MPAA, A-List */}
          <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-gray-300">
            {movie.runtime_str && (
              <span className="flex items-center space-x-1 text-gray-400">
                <Clock className="w-3 h-3" />
                <span>{movie.runtime_str}</span>
              </span>
            )}

            {mpaa && (
              <span className="text-[10px] bg-dark-surface text-gray-200 font-bold px-1.5 py-0.2 rounded border border-dark-border">
                {mpaa}
              </span>
            )}

            {movie.is_a_list_eligible === false && (
              <span className="text-[10px] bg-rose-950/60 text-rose-300 font-semibold px-1.5 py-0.2 rounded border border-rose-800/50">
                Excluded from A-List
              </span>
            )}
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <p className="text-[11px] text-gray-400 font-medium truncate">
              {genres.join(" • ")}
            </p>
          )}
        </div>
      </div>

      {/* Ratings Row (RT Critics, RT Audience, IMDb) */}
      {(movie.rt_score || movie.audience_score || movie.imdb_rating) && (
        <div className="flex items-center space-x-2 py-1.5 px-2.5 rounded-lg bg-dark-surface/80 border border-dark-border text-xs">
          {movie.rt_score && (
            <div className="flex items-center space-x-1">
              <span title="Rotten Tomatoes Tomatometer">🍅</span>
              <span className={getRtColor(movie.rt_score)}>{movie.rt_score}</span>
            </div>
          )}
          {movie.audience_score && (
            <div className="flex items-center space-x-1 border-l border-dark-border pl-2">
              <span title="Rotten Tomatoes Popcornmeter">🍿</span>
              <span className={getRtColor(movie.audience_score)}>{movie.audience_score}</span>
            </div>
          )}
          {movie.imdb_rating && (
            <div className="flex items-center space-x-1 border-l border-dark-border pl-2">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className={getImdbColor(movie.imdb_rating)}>{movie.imdb_rating}</span>
            </div>
          )}
        </div>
      )}

      {/* Synopsis / Description */}
      {movie.plot && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Overview
          </p>
          <p className="text-xs text-gray-300 leading-relaxed max-h-36 overflow-y-auto pr-1 scrollbar-thin">
            {movie.plot}
          </p>
        </div>
      )}

      {/* Footer: Programs & Formats */}
      {(programs.length > 0 || formats.length > 0) && (
        <div className="pt-2 border-t border-dark-border/60 flex items-center flex-wrap gap-1">
          {programs.map((prog, idx) => (
            <span
              key={`prog-${idx}`}
              className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-medium"
            >
              ★ {prog}
            </span>
          ))}
          {formats.slice(0, 4).map((fmt, idx) => (
            <span
              key={`fmt-${idx}`}
              className="text-[10px] bg-dark-surface text-gray-400 border border-dark-border px-1.5 py-0.5 rounded"
            >
              {fmt}
            </span>
          ))}
          {formats.length > 4 && (
            <span className="text-[10px] text-gray-500 pl-0.5">
              +{formats.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};
