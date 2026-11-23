import React from "react";
import { Film } from "lucide-react";

export interface MoviePosterProps {
  posterUrl?: string | null;
  title: string;
}

export const MoviePoster: React.FC<MoviePosterProps> = ({ posterUrl, title }) => {
  return (
    <div className="w-12 h-12 rounded-full overflow-hidden bg-dark-surface border border-dark-border flex-shrink-0 flex items-center justify-center">
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      ) : (
        <Film className="w-5 h-5 text-gray-500" />
      )}
    </div>
  );
};
