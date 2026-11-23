import React from "react";
import { ExternalLink, Ticket } from "lucide-react";

export const HeaderBanner: React.FC = () => {
  return (
    <div className="bg-dark-card border border-blue-900/40 rounded-lg p-2 px-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-2 text-sm text-gray-300">
        <span className="text-blue-400">💡</span>
        <span>
          Using A-List? Make sure you're signed into AMC in your browser to auto-apply your free reservations.
        </span>
      </div>
      <a
        href="https://www.amctheatres.com/my-amc"
        target="_blank"
        rel="noopener noreferrer"
        className="bg-brand-blue hover:bg-brand-blueHover text-brand-text text-xs font-semibold px-3 py-1.5 rounded flex items-center space-x-1.5 transition shadow"
      >
        <Ticket className="w-3.5 h-3.5" />
        <span>My AMC</span>
        <ExternalLink className="w-3 h-3 opacity-70" />
      </a>
    </div>
  );
};
