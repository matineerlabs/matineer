import React, { useRef } from "react";
import { Clapperboard, ExternalLink, Film, SlidersHorizontal, Ticket, X } from "lucide-react";
import { useClickOutside } from "../../hooks/useClickOutside";

const FULL_GUIDE_URL = "https://github.com/matineerlabs/matineer#readme";

const FullGuideLink: React.FC = () => (
  <a
    href={FULL_GUIDE_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline underline-offset-2 transition"
  >
    <span>Read the full guide on GitHub</span>
    <ExternalLink className="w-3 h-3" />
  </a>
);

const QuickStartSteps: React.FC = () => (
  <div className="space-y-3 text-left">
    <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-surface/60 border border-dark-border/60">
      <div className="w-6 h-6 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
        1
      </div>
      <div className="space-y-1 text-xs">
        <div className="font-semibold text-gray-200 flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
          <span>Set your schedule rules (Left sidebar)</span>
        </div>
        <p className="text-gray-400 leading-relaxed">
          Pick how many movies you want to see, your time window, how long you&apos;re willing to wait between showings, and any breaks for food or errands.
        </p>
      </div>
    </div>

    <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-surface/60 border border-dark-border/60">
      <div className="w-6 h-6 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
        2
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="font-semibold text-gray-200 flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-blue-400" />
          <span>Narrow down your movies (Available Movies tab)</span>
        </div>
        <p className="text-gray-400 leading-relaxed">
          Every movie starts as <strong className="text-gray-200">Include</strong>, so it&apos;s already in the mix. Mark anything you want to skip as <strong className="text-gray-200">Exclude</strong>, and save <strong className="text-gray-200">Must See</strong> for movies that have to be in every schedule. You can also toggle format chips (like IMAX or Dolby) or pin a specific showtime.
        </p>
      </div>
    </div>

    <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-surface/60 border border-dark-border/60">
      <div className="w-6 h-6 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
        3
      </div>
      <div className="space-y-1 text-xs">
        <div className="font-semibold text-gray-200 flex items-center gap-1.5">
          <Ticket className="w-3.5 h-3.5 text-blue-400" />
          <span>Pick a marathon (Schedules tab)</span>
        </div>
        <p className="text-gray-400 leading-relaxed">
          Matineer finds valid back-to-back combinations, ranks them by least wait time, and gives you direct links to book on AMC.
        </p>
      </div>
    </div>
  </div>
);

interface QuickStartCardProps {
  onDismiss?: () => void;
}

export const QuickStartCard: React.FC<QuickStartCardProps> = ({ onDismiss }) => (
  <div className="bg-dark-card border border-dark-border rounded-lg p-6 sm:p-8 my-4 shadow-sm max-w-2xl mx-auto space-y-5">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
          <Clapperboard className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-100">Welcome to Matineer!</h3>
          <p className="text-xs text-gray-400">
            Choose a date under <strong className="text-gray-200">Date Selection</strong> on the left to load showtimes.
          </p>
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-dark-surface transition flex-shrink-0"
        >
          Dismiss
        </button>
      )}
    </div>

    <QuickStartSteps />

    <div className="pt-3 border-t border-dashed border-dark-border/80">
      <p className="text-[11px] text-gray-400 text-center">
        Pick a date on the left to get started, or <FullGuideLink /> for ratings setup and more tips.
      </p>
    </div>
  </div>
);

interface QuickStartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickStartModal: React.FC<QuickStartModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useClickOutside(modalRef, onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-start-modal-title"
        className="w-full max-w-lg bg-dark-card border border-dark-border rounded-xl shadow-2xl overflow-hidden p-5 space-y-4 text-gray-200"
      >
        <div className="flex items-center justify-between pb-3 border-b border-dark-border/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div>
              <h2 id="quick-start-modal-title" className="text-base font-bold text-gray-100 leading-tight">
                Quick Start Guide
              </h2>
              <p className="text-[11px] text-gray-400">How to plan a movie marathon with Matineer</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-dark-surface transition"
            aria-label="Close quick start guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <QuickStartSteps />

        <div className="pt-3 border-t border-dashed border-dark-border/80 flex items-center justify-between gap-3">
          <span className="text-[11px] text-gray-400">
            <FullGuideLink />
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-brand-blue hover:opacity-90 text-brand-text text-xs font-bold transition shadow"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
