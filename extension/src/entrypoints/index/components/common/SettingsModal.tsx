import React, { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  Ban,
  Calendar,
  Check,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  Info,
  Key,
  LayoutGrid,
  Loader2,
  RotateCcw,
  Settings,
  Sliders,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { clearCache, verifyMdblistKey } from "../../api/client";
import { useClickOutside } from "../../hooks/useClickOutside";
import { useOptionalSettings } from "../../context/SettingsContext";
import { DEFAULT_APP_SETTINGS, AppSettings } from "../../../../shared/types/settings";
import { UserMovieStatus } from "../../../../shared/types/movie";
import { TimePicker } from "./TimePicker";
import { DualRangeSlider } from "./DualRangeSlider";
import { parseMarathonDayMinutes, minutesToTimeString } from "../../../../shared/utils/time";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey?: string;
  onSaveKey?: (key: string) => void;
  onCacheCleared?: (target: "showtimes" | "metadata" | "all") => void;
  onHistoryReset?: (status: UserMovieStatus, count: number) => void;
}

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  id?: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled = false, id }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? "bg-brand-blue" : "bg-dark-surface border-dark-border"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    <span
      aria-hidden="true"
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? "translate-x-4" : "translate-x-0"
      }`}
    />
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveKey,
  onCacheCleared,
  onHistoryReset,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settingsContext = useOptionalSettings();
  const currentSettings = settingsContext?.settings || DEFAULT_APP_SETTINGS;

  // Draft form state
  const [draftEarliestStart, setDraftEarliestStart] = useState<string>(
    currentSettings.defaultEarliestStart
  );
  const [draftLatestEnd, setDraftLatestEnd] = useState<string>(
    currentSettings.defaultLatestEnd
  );
  const [draftTrailerMin, setDraftTrailerMin] = useState<number>(
    currentSettings.defaultTrailerMin
  );
  const [draftMinWaitMin, setDraftMinWaitMin] = useState<number>(
    currentSettings.defaultMinWaitMin
  );
  const [draftMaxWaitMin, setDraftMaxWaitMin] = useState<number>(
    currentSettings.defaultMaxWaitMin
  );
  const [draftPreferPremium, setDraftPreferPremium] = useState<boolean>(
    currentSettings.preferPremiumFormats
  );
  const [draftShowRatings, setDraftShowRatings] = useState<boolean>(
    currentSettings.showRatings
  );
  const [draftRankNonAListLast, setDraftRankNonAListLast] = useState<boolean>(
    currentSettings.rankNonAListLast
  );
  const [inputKey, setInputKey] = useState<string>(
    apiKey !== undefined ? apiKey : currentSettings.mdblistApiKey
  );

  const [showKey, setShowKey] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);

  // Cache clear feedback
  const [clearingTarget, setClearingTarget] = useState<
    "showtimes" | "metadata" | "all" | null
  >(null);
  const [clearFeedback, setClearFeedback] = useState<{
    target: string;
    message: string;
    isError?: boolean;
  } | null>(null);

  // History reset confirmation and feedback
  const [confirmingReset, setConfirmingReset] = useState<"seen" | "wont_watch" | "showtimes" | "metadata" | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetFeedback, setResetFeedback] = useState<{
    message: string;
    isError?: boolean;
  } | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (clearFeedbackTimerRef.current) clearTimeout(clearFeedbackTimerRef.current);
      if (resetFeedbackTimerRef.current) clearTimeout(resetFeedbackTimerRef.current);
    };
  }, []);

  // Sync draft state whenever opened
  useEffect(() => {
    if (isOpen) {
      setDraftEarliestStart(currentSettings.defaultEarliestStart);
      setDraftLatestEnd(currentSettings.defaultLatestEnd);
      setDraftTrailerMin(currentSettings.defaultTrailerMin);
      setDraftMinWaitMin(currentSettings.defaultMinWaitMin);
      setDraftMaxWaitMin(currentSettings.defaultMaxWaitMin);
      setDraftPreferPremium(currentSettings.preferPremiumFormats);
      setDraftShowRatings(currentSettings.showRatings);
      setDraftRankNonAListLast(currentSettings.rankNonAListLast);
      setInputKey(apiKey !== undefined ? apiKey : currentSettings.mdblistApiKey);

      setShowKey(false);
      setVerifyStatus(null);
      setIsVerifying(false);
      setConfirmingReset(null);
      setResetFeedback(null);
      setClearFeedback(null);
    }
  }, [isOpen, currentSettings, apiKey]);

  // Handle escape key and click outside
  useClickOutside(modalRef, onClose, isOpen);

  if (!isOpen) return null;

  // Time window adjustments
  const handleEarliestStartChange = (val: string) => {
    setDraftEarliestStart(val);
    const startMins = parseMarathonDayMinutes(val);
    const endMins = parseMarathonDayMinutes(draftLatestEnd);
    if (startMins >= endMins) {
      const bumpedMins = Math.min(1560, startMins + 120);
      setDraftLatestEnd(minutesToTimeString(bumpedMins % 1440));
    }
  };

  const handleLatestEndChange = (val: string) => {
    const endMins = parseMarathonDayMinutes(val);
    const startMins = parseMarathonDayMinutes(draftEarliestStart);
    if (endMins <= startMins) {
      const adjustedMins = Math.max(360, endMins - 120);
      setDraftEarliestStart(minutesToTimeString(adjustedMins % 1440));
    }
    setDraftLatestEnd(val);
  };

  const handleTrailerMinChange = (val: number) => {
    setDraftTrailerMin(val);
    const minLimit = val === 0 ? 0 : -val;
    if (draftMinWaitMin < minLimit) {
      setDraftMinWaitMin(minLimit);
    }
  };

  const handleSaveAll = async () => {
    const trimmedKey = inputKey.trim();

    // If key has changed and is not empty, verify it first
    if (trimmedKey && trimmedKey !== currentSettings.mdblistApiKey) {
      setIsVerifying(true);
      setVerifyStatus(null);
      try {
        const res = await verifyMdblistKey(trimmedKey);
        setVerifyStatus(res);
        if (!res.valid) {
          setIsVerifying(false);
          return; // Stop if invalid key
        }
      } catch {
        setVerifyStatus({
          valid: false,
          message: "Network error verifying API key",
        });
        setIsVerifying(false);
        return;
      }
      setIsVerifying(false);
    }

    const updatedSettings: Partial<AppSettings> = {
      defaultEarliestStart: draftEarliestStart,
      defaultLatestEnd: draftLatestEnd,
      defaultTrailerMin: draftTrailerMin,
      defaultMinWaitMin: draftMinWaitMin,
      defaultMaxWaitMin: draftMaxWaitMin,
      preferPremiumFormats: draftPreferPremium,
      showRatings: draftShowRatings,
      rankNonAListLast: draftRankNonAListLast,
      mdblistApiKey: trimmedKey,
    };

    if (settingsContext) {
      await settingsContext.updateSettings(updatedSettings);
    }
    if (onSaveKey) {
      onSaveKey(trimmedKey);
    }

    onClose();
  };

  const handleClearCache = async (target: "showtimes" | "metadata" | "all") => {
    setClearingTarget(target);
    setClearFeedback(null);
    try {
      const res = await clearCache(target);
      const label = target === "showtimes" ? "showtimes cache" : "ratings cache";
      setClearFeedback({ target, message: `Successfully reset ${label}.` });
      onCacheCleared?.(target);
      if (clearFeedbackTimerRef.current) clearTimeout(clearFeedbackTimerRef.current);
      clearFeedbackTimerRef.current = setTimeout(() => {
        setClearFeedback(null);
        clearFeedbackTimerRef.current = null;
      }, 4000);
    } catch (e: any) {
      setClearFeedback({
        target,
        message: e.message || "Failed to clear cache",
        isError: true,
      });
    } finally {
      setClearingTarget(null);
    }
  };

  const handleResetMovieHistory = async (status: UserMovieStatus) => {
    setIsResetting(true);
    setResetFeedback(null);
    try {
      let count = 0;
      if (settingsContext) {
        count = await settingsContext.resetHistory(status);
      }
      const label = status === UserMovieStatus.SEEN ? "watched" : "won't watch";
      onHistoryReset?.(status, count);
      setResetFeedback({
        message: `Successfully reset ${count} ${label} ${count === 1 ? "movie" : "movies"}.`,
      });
      setConfirmingReset(null);
      if (resetFeedbackTimerRef.current) clearTimeout(resetFeedbackTimerRef.current);
      resetFeedbackTimerRef.current = setTimeout(() => {
        setResetFeedback(null);
        resetFeedbackTimerRef.current = null;
      }, 4000);
    } catch (e: any) {
      setResetFeedback({
        message: e.message || "Failed to reset movie history.",
        isError: true,
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-dark-card border border-dark-border rounded-xl shadow-2xl overflow-hidden text-gray-200 max-h-[90vh] flex flex-col"
      >
        {/* Pinned Header */}
        <div className="flex items-center justify-between p-4 px-5 border-b border-dark-border/80 flex-shrink-0 bg-dark-card/95">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-100 leading-tight">
                Settings & Preferences
              </h2>
              <p className="text-xs text-gray-400">
                Configure scheduling defaults, browsing display, and local data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-dark-surface transition"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* SECTION 1: Scheduling Defaults (Exact Order of Sidebar Scheduling Rules Pane) */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-gray-100 font-bold uppercase tracking-wider text-sm pb-1.5 border-b border-dark-border/60">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span>Scheduling Defaults</span>
            </div>
            <p className="text-gray-400 -mt-2 leading-relaxed">
              Default marathon rules applied when Matineer opens.
            </p>

            {/* 1. Time Bounds: Earliest Start & Latest End */}
            <div className="grid grid-cols-2 gap-3">
              <TimePicker
                label="Default Earliest Start"
                value={draftEarliestStart}
                onChange={handleEarliestStartChange}
                stepMinutes={15}
                maxTime={draftLatestEnd}
              />
              <TimePicker
                label="Default Latest End"
                value={draftLatestEnd}
                onChange={handleLatestEndChange}
                stepMinutes={15}
                minTime={draftEarliestStart}
              />
            </div>

            {/* 2. Trailer Duration */}
            <div className="space-y-1.5 bg-dark-surface/60 border border-dark-border/60 rounded-lg p-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300 font-medium">Default Trailer Duration:</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{draftTrailerMin}m</span>
              </div>
              <input
                type="range"
                min={0}
                max={35}
                step={5}
                value={draftTrailerMin}
                onChange={(e) => handleTrailerMinChange(Number(e.target.value))}
                className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="relative w-full text-[10px] text-gray-400 h-4 mt-0.5 select-none pointer-events-none">
                <span className="absolute left-0">0m (Exact)</span>
                <span
                  className="absolute -translate-x-1/2 text-center whitespace-nowrap text-blue-600 dark:text-blue-400 font-medium"
                  style={{ left: `${(25 / 35) * 100}%` }}
                >
                  25m (AMC standard)
                </span>
                <span className="absolute right-0">35m</span>
              </div>
            </div>

            {/* 3. Wait Between Movies */}
            <div className="space-y-2 bg-dark-surface/60 border border-dark-border/60 rounded-lg p-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300 font-medium">Default Wait Between Movies:</span>
                <span className="font-bold text-gray-200">
                  {draftMinWaitMin < 0 ? (
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{draftMinWaitMin}m</span>
                  ) : draftMinWaitMin === 0 ? (
                    <span>0m</span>
                  ) : (
                    <span>+{draftMinWaitMin}m</span>
                  )}{" "}
                  <span className="text-gray-400 font-normal">to</span>{" "}
                  <span>{draftMaxWaitMin}m</span>
                </span>
              </div>

              <div className="py-1">
                <DualRangeSlider
                  minValue={draftMinWaitMin}
                  maxValue={draftMaxWaitMin}
                  minBound={draftTrailerMin === 0 ? 0 : -draftTrailerMin}
                  maxBound={60}
                  step={5}
                  minGap={5}
                  trackBgClass="bg-dark-bg"
                  onMinChange={setDraftMinWaitMin}
                  onMaxChange={setDraftMaxWaitMin}
                />
              </div>
              <p className="text-[11px] text-gray-400 leading-normal">
                Negative values allow arriving during pre-show trailers; positive values provide comfortable transition buffer.
              </p>
            </div>

            {/* 4. Prefer Premium Formats */}
            <div className="flex items-start justify-between p-3 bg-dark-surface/60 border border-dark-border/60 rounded-lg gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-1.5 font-medium text-gray-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Prefer Premium Formats</span>
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  When enabled, optimal schedules prioritize IMAX, Dolby Cinema, PRIME, and 3D showings.
                </p>
              </div>
              <Toggle
                checked={draftPreferPremium}
                onChange={setDraftPreferPremium}
                id="toggle-prefer-premium"
              />
            </div>
          </div>

          {/* SECTION 2: Browsing & Display */}
          <div className="space-y-3 pt-3 border-t border-dark-border/80">
            <div className="flex items-center space-x-2 text-gray-100 font-bold uppercase tracking-wider text-sm pb-1.5 border-b border-dark-border/60">
              <LayoutGrid className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span>Browsing & Display</span>
            </div>

            {/* Display Ratings Data */}
            <div className="flex items-start justify-between p-3 bg-dark-surface/60 border border-dark-border/60 rounded-lg gap-3">
              <div className="space-y-0.5">
                <span className="font-medium text-gray-200">Display Ratings Data</span>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  Fetch and display Rotten Tomatoes and IMDb badges on movie cards. When disabled, no ratings requests are sent.
                </p>
              </div>
              <Toggle
                checked={draftShowRatings}
                onChange={setDraftShowRatings}
                id="toggle-show-ratings"
              />
            </div>

            {/* Rank Non-A-List Movies Last */}
            <div className="flex items-start justify-between p-3 bg-dark-surface/60 border border-dark-border/60 rounded-lg gap-3">
              <div className="space-y-0.5">
                <span className="font-medium text-gray-200">Rank Non-A-List Movies Last</span>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  When enabled, Fathom Events and other screenings excluded from AMC A-List are placed at the bottom of the list.
                </p>
              </div>
              <Toggle
                checked={draftRankNonAListLast}
                onChange={setDraftRankNonAListLast}
                id="toggle-rank-non-a-list-last"
              />
            </div>
          </div>

          {/* SECTION 3: Integrations */}
          <div className="space-y-3 pt-3 border-t border-dark-border/80">
            <div className="flex items-center justify-between pb-1 border-b border-dark-border/40">
              <div className="flex items-center space-x-2 text-gray-100 font-bold uppercase tracking-wider text-sm">
                <Key className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span>Integrations (MDBList API Key)</span>
              </div>
              <a
                href="https://mdblist.com/preferences/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center space-x-1 transition underline decoration-blue-500/40"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <p className="text-gray-400 leading-relaxed text-[11px]">
              A free MDBList API key (1,000 requests/day) enables IMDb ratings and enriches Rotten Tomatoes critic and audience scores.
            </p>

            <div className="relative flex items-center">
              <input
                type={showKey ? "text" : "password"}
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setVerifyStatus(null);
                }}
                aria-label="MDBList API Key"
                placeholder="Paste MDBList API key..."
                className="w-full bg-dark-surface border border-dark-border focus:border-brand-blue rounded-lg px-3 py-2 pr-10 text-xs text-gray-100 placeholder-gray-500 outline-none transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
                className="absolute right-2.5 p-1 rounded text-gray-400 hover:text-gray-100 transition"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-[10px] text-gray-500 leading-normal">
              Metadata fetched via your key is provided by MDBList.
            </p>

            {verifyStatus && (
              <div
                className={`text-xs p-2.5 rounded-lg flex items-center space-x-2 border transition ${
                  verifyStatus.valid
                    ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/40"
                    : "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800/40"
                }`}
              >
                {verifyStatus.valid ? (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                )}
                <span className="leading-snug">{verifyStatus.message}</span>
              </div>
            )}
          </div>

          {/* SECTION 4: Local Data & History */}
          <div className="space-y-3 pt-3 border-t border-dark-border/80">
            <div className="flex items-center space-x-2 text-gray-100 font-bold uppercase tracking-wider text-sm pb-1.5 border-b border-dark-border/60">
              <Database className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span>Local Data & History</span>
            </div>
            <p className="text-gray-400 leading-relaxed text-[11px]">
              Reset movie tracking history or purge local showtimes and ratings caches.
            </p>

            {/* 2x2 Grid of Consistent Reset Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* 1. Reset Watched */}
              <div className="bg-dark-surface/70 border border-dark-border/70 rounded-lg p-3 flex flex-col justify-between space-y-2.5">
                <div>
                  <div className="flex items-center space-x-1.5 text-gray-200 font-semibold mb-1">
                    <Film className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Watched Movies</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">
                    Clear all movies marked as seen.
                  </p>
                </div>

                {confirmingReset === "seen" ? (
                  <div className="flex items-center space-x-1.5 pt-0.5">
                    <button
                      type="button"
                      disabled={isResetting}
                      onClick={() => handleResetMovieHistory(UserMovieStatus.SEEN)}
                      className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-[11px] font-bold py-1.5 px-2 rounded-lg transition shadow-sm"
                    >
                      {isResetting ? "Resetting..." : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingReset(null)}
                      className="px-2 py-1.5 text-[11px] text-gray-400 hover:text-gray-100 rounded-lg hover:bg-dark-border transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingReset("seen")}
                    className="w-full bg-dark-bg hover:bg-dark-hover border border-dark-border hover:border-blue-500/40 text-gray-300 hover:text-gray-100 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition"
                  >
                    <RotateCcw className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>Reset Watched</span>
                  </button>
                )}
              </div>

              {/* 2. Reset Won't Watch */}
              <div className="bg-dark-surface/70 border border-dark-border/70 rounded-lg p-3 flex flex-col justify-between space-y-2.5">
                <div>
                  <div className="flex items-center space-x-1.5 text-gray-200 font-semibold mb-1">
                    <Ban className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Won't Watch</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">
                    Clear all movies marked won't watch.
                  </p>
                </div>

                {confirmingReset === "wont_watch" ? (
                  <div className="flex items-center space-x-1.5 pt-0.5">
                    <button
                      type="button"
                      disabled={isResetting}
                      onClick={() => handleResetMovieHistory(UserMovieStatus.WONT_WATCH)}
                      className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-[11px] font-bold py-1.5 px-2 rounded-lg transition shadow-sm"
                    >
                      {isResetting ? "Resetting..." : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingReset(null)}
                      className="px-2 py-1.5 text-[11px] text-gray-400 hover:text-gray-100 rounded-lg hover:bg-dark-border transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingReset("wont_watch")}
                    className="w-full bg-dark-bg hover:bg-dark-hover border border-dark-border hover:border-amber-500/40 text-gray-300 hover:text-gray-100 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>Reset Won't Watch</span>
                  </button>
                )}
              </div>

              {/* 3. Reset Showtimes Cache */}
              <div className="bg-dark-surface/70 border border-dark-border/70 rounded-lg p-3 flex flex-col justify-between space-y-2.5">
                <div>
                  <div className="flex items-center space-x-1.5 text-gray-200 font-semibold mb-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Showtimes Cache</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">
                    Clear all cached AMC schedules.
                  </p>
                </div>

                {confirmingReset === "showtimes" ? (
                  <div className="flex items-center space-x-1.5 pt-0.5">
                    <button
                      type="button"
                      disabled={clearingTarget !== null}
                      onClick={() => {
                        setConfirmingReset(null);
                        handleClearCache("showtimes");
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-[11px] font-bold py-1.5 px-2 rounded-lg transition shadow-sm"
                    >
                      {clearingTarget === "showtimes" ? "Resetting..." : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingReset(null)}
                      className="px-2 py-1.5 text-[11px] text-gray-400 hover:text-gray-100 rounded-lg hover:bg-dark-border transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={clearingTarget !== null}
                    onClick={() => setConfirmingReset("showtimes")}
                    className="w-full bg-dark-bg hover:bg-dark-hover border border-dark-border hover:border-blue-500/40 text-gray-300 hover:text-gray-100 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
                  >
                    {clearingTarget === "showtimes" ? (
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
                    ) : (
                      <RotateCcw className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    )}
                    <span>Reset Showtimes</span>
                  </button>
                )}
              </div>

              {/* 4. Reset Ratings Cache */}
              <div className="bg-dark-surface/70 border border-dark-border/70 rounded-lg p-3 flex flex-col justify-between space-y-2.5">
                <div>
                  <div className="flex items-center space-x-1.5 text-gray-200 font-semibold mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Ratings Cache</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">
                    Clear cached RT & IMDb scores.
                  </p>
                </div>

                {confirmingReset === "metadata" ? (
                  <div className="flex items-center space-x-1.5 pt-0.5">
                    <button
                      type="button"
                      disabled={clearingTarget !== null}
                      onClick={() => {
                        setConfirmingReset(null);
                        handleClearCache("metadata");
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-[11px] font-bold py-1.5 px-2 rounded-lg transition shadow-sm"
                    >
                      {clearingTarget === "metadata" ? "Resetting..." : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingReset(null)}
                      className="px-2 py-1.5 text-[11px] text-gray-400 hover:text-gray-100 rounded-lg hover:bg-dark-border transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={clearingTarget !== null}
                    onClick={() => setConfirmingReset("metadata")}
                    className="w-full bg-dark-bg hover:bg-dark-hover border border-dark-border hover:border-purple-500/40 text-gray-300 hover:text-gray-100 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
                  >
                    {clearingTarget === "metadata" ? (
                      <Loader2 className="w-3 h-3 animate-spin text-purple-600 dark:text-purple-400" />
                    ) : (
                      <RotateCcw className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    )}
                    <span>Reset Ratings</span>
                  </button>
                )}
              </div>
            </div>

            {(resetFeedback || clearFeedback) && (
              <div
                className={`text-xs p-2.5 rounded-lg flex items-center space-x-2 border transition ${
                  (resetFeedback?.isError || clearFeedback?.isError)
                    ? "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800/40"
                    : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/40"
                }`}
              >
                {(resetFeedback?.isError || clearFeedback?.isError) ? (
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                )}
                <span className="leading-snug">
                  {resetFeedback ? resetFeedback.message : clearFeedback?.message}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pinned Footer Actions */}
        <div className="p-4 px-5 border-t border-dark-border/80 flex items-center justify-end space-x-2 flex-shrink-0 bg-dark-card/95">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-gray-400 hover:text-gray-100 rounded-lg hover:bg-dark-surface transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isVerifying}
            className="bg-brand-blue hover:bg-brand-blueHover disabled:opacity-50 text-brand-text text-xs font-bold px-4 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-md transition"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
