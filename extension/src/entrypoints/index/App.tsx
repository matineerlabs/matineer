import React, { useEffect, useState, useMemo } from "react";
import { AlertTriangle, Download, Film, HelpCircle, ListOrdered, Loader2, Settings, Info, Moon, Sun, X } from "lucide-react";
import { fetchTheaters, fetchRemoteStatus, triggerExtensionUpdate } from "./api/client";
import type { RemoteStatusResponse } from "../../shared/types/schemas";
import { HeaderBanner } from "./components/layout/HeaderBanner";
import { Sidebar } from "./components/layout/Sidebar";
import { SettingsModal } from "./components/common/SettingsModal";
import { AboutModal } from "./components/common/AboutModal";
import { QuickStartModal } from "./components/common/QuickStartGuide";
import { MoviesTab } from "./components/movies/MoviesTab";
import { SchedulesTab } from "./components/schedules/SchedulesTab";
import { Theater } from "./types/api";
import { useShowtimes, useMoviePreferences, useScheduleSolver, useCurrentDate } from "./hooks";
import { MarathonConfigProvider } from "./context/MarathonConfigContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { UserMovieStatus, MovieDayStatus } from "../../shared/types/movie";
import {
  getStorageItem,
  setStorageItem,
  STORAGE_KEYS,
} from "../../shared/utils/storage";

const AppContent: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  // Navigation
  const [activeTab, setActiveTab] = useState<"movies" | "schedules">("movies");

  // Theaters & Dates
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [theaterId, setTheaterId] = useState<string>("");
  const [isTheaterModalOpen, setIsTheaterModalOpen] = useState<boolean>(false);
  const [favoriteTheaterIds, setFavoriteTheaterIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const todayStr = useCurrentDate();

  // Settings modal & MDBList API Key
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [isQuickStartModalOpen, setIsQuickStartModalOpen] = useState<boolean>(false);
  const [showQuickStart, setShowQuickStart] = useState<boolean>(false);

  // Remote status & version gate
  const [remoteStatus, setRemoteStatus] = useState<RemoteStatusResponse | null>(null);
  const [isStatusDismissed, setIsStatusDismissed] = useState<boolean>(false);
  const [isUpdatingExtension, setIsUpdatingExtension] = useState<boolean>(false);
  const [updateFeedback, setUpdateFeedback] = useState<string>("");

  // 1. Hook: Showtime fetching, caching, and RT/IMDb live streaming
  const {
    movies,
    setMovies,
    showtimesUrl,
    isScraping,
    scrapeStatus,
    setScrapeStatus,
    metadataProgress,
    loadShowtimes,
    handleCancelShowtimesLoading,
    handleCancelMetadata,
  } = useShowtimes(theaterId, selectedDate, settings.mdblistApiKey, settings.showRatings);

  // 2. Hook: Movie preferences, format toggling, seen / won't watch, optimistic sync & pinning
  const {
    pinnedShowing,
    handlePinShowing,
    handleUnpinShowing,
    selectedMoviesCount,
    mustSeeTitles,
    handleMovieStatusChange,
    handleFormatToggle,
    handleUserStatusChange,
    handleExcludeAll,
    handleIncludeAll,
  } = useMoviePreferences(selectedDate, movies, setMovies);

  // 3. Hook: Schedule solver parameters, breaks, and solver execution
  const {
    marathonConfig,
    schedules,
    setSchedules,
    isSolving,
  } = useScheduleSolver({
    theaterId,
    selectedDate,
    movies,
    pinnedShowing,
  });

  // Apply theme class to document body
  useEffect(() => {
    if (settings.theme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  }, [settings.theme]);

  // Initial load: fetch theaters and load preferences asynchronously from chrome.storage
  useEffect(() => {
    Promise.all([
      getStorageItem<string>(STORAGE_KEYS.THEATER_ID, ""),
      getStorageItem<string[]>(STORAGE_KEYS.FAVORITE_THEATERS, []),
      getStorageItem<boolean>(STORAGE_KEYS.QUICK_START_SEEN, false),
      fetchTheaters(),
    ]).then(([savedTheaterId, savedFavorites, quickStartSeen, th]) => {
      setTheaters(th);
      setFavoriteTheaterIds(savedFavorites);

      if (savedTheaterId && th.some((t) => t.id === savedTheaterId)) {
        setTheaterId(savedTheaterId);
        setIsTheaterModalOpen(false);
        setShowQuickStart(false);
      } else {
        setIsTheaterModalOpen(true);
        setShowQuickStart(!quickStartSeen);
      }
    });
  }, []);

  // Check remote status on startup, when theater/date changes, and when the tab regains focus
  useEffect(() => {
    const checkStatus = () => {
      fetchRemoteStatus(false)
        .then((st) => {
          if (st && st.is_outdated) {
            setRemoteStatus((prev) => {
              // If an update newly became available on the store, un-dismiss any prior maintenance notice
              if (st.update_available && !prev?.update_available) {
                setIsStatusDismissed(false);
              }
              return st;
            });
          } else {
            setRemoteStatus(null);
          }
        })
        .catch(() => {});
    };

    checkStatus();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [theaterId, selectedDate]);

  // If the calendar day rolls over past the currently selected date, advance to today
  useEffect(() => {
    if (selectedDate && selectedDate < todayStr) {
      setSelectedDate(todayStr);
      handleUnpinShowing();
    }
  }, [todayStr, selectedDate, handleUnpinShowing]);

  const handleTriggerUpdate = async () => {
    setIsUpdatingExtension(true);
    setUpdateFeedback("");
    try {
      const res = await triggerExtensionUpdate();
      if (res.remote_status) {
        setRemoteStatus(res.remote_status);
      }
      if (!res.reloading) {
        setUpdateFeedback(
          "No automatic store update detected yet. You can also click 'Update' in chrome://extensions (Developer Mode)."
        );
      }
    } catch {
      setUpdateFeedback("Unable to check for updates right now.");
    } finally {
      setIsUpdatingExtension(false);
    }
  };

  const handleToggleFavoriteTheater = (id: string) => {
    setFavoriteTheaterIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((tId) => tId !== id) : [...prev, id];
      setStorageItem(STORAGE_KEYS.FAVORITE_THEATERS, next);
      return next;
    });
  };

  const currentTheater = useMemo(() => {
    return theaters.find((t) => t.id === theaterId);
  }, [theaters, theaterId]);

  const handleSelectTheater = (newTheaterId: string) => {
    if (isScraping) return;
    setActiveTab("movies");
    handleUnpinShowing();
    if (newTheaterId === theaterId) {
      setIsTheaterModalOpen(false);
      return;
    }
    setTheaterId(newTheaterId);
    setStorageItem(STORAGE_KEYS.THEATER_ID, newTheaterId);
    setIsTheaterModalOpen(false);
    setMovies([]);
    setSchedules([]);
    setScrapeStatus("");
  };

  const handleSaveMdblistApiKey = (newKey: string) => {
    updateSettings({ mdblistApiKey: newKey });
    if (theaterId && selectedDate) {
      loadShowtimes(false, newKey);
    }
  };

  const handleHistoryReset = (status: UserMovieStatus) => {
    setMovies((prev) =>
      prev.map((m) => {
        if (m.user_status === status) {
          return {
            ...m,
            user_status: UserMovieStatus.ACTIVE,
            status: MovieDayStatus.INCLUDE,
          };
        }
        return m;
      })
    );
  };

  const dismissQuickStart = () => {
    setShowQuickStart(false);
    setStorageItem(STORAGE_KEYS.QUICK_START_SEEN, true).catch(() => {});
  };

  const handleSelectDate = (dateStr: string) => {
    if (isScraping) return;
    setSelectedDate(dateStr);
    handleUnpinShowing();
    if (dateStr) {
      setActiveTab("movies");
      if (showQuickStart) {
        dismissQuickStart();
      }
    }
  };

  const handleCacheCleared = (target: "showtimes" | "metadata" | "all") => {
    if (target === "showtimes" || target === "all") {
      if (theaterId && selectedDate) {
        loadShowtimes(true);
      }
    } else if (target === "metadata") {
      if (theaterId && selectedDate) {
        loadShowtimes(false);
      }
    }
  };

  return (
    <MarathonConfigProvider value={marathonConfig}>
      <div className="flex h-screen w-screen overflow-x-auto overflow-y-hidden min-w-[960px] bg-dark-bg text-gray-100 justify-center">
        <div className="flex h-full w-full max-w-[1344px] overflow-hidden border-x border-dark-border/30">
          {/* 1. Left Sidebar */}
          <Sidebar
            theaters={theaters}
            selectedTheaterId={theaterId}
            onSelectTheater={handleSelectTheater}
            favoriteTheaterIds={favoriteTheaterIds}
            onToggleFavorite={handleToggleFavoriteTheater}
            isTheaterModalOpen={isTheaterModalOpen}
            onOpenTheaterModal={() => setIsTheaterModalOpen(true)}
            onCloseTheaterModal={() => setIsTheaterModalOpen(false)}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            selectedDate={selectedDate}
            todayStr={todayStr}
            onSelectDate={handleSelectDate}
            isScraping={isScraping}
          />

          {/* 2. Main Content Area */}
          <main className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-4 min-w-0">
            <div className="w-full max-w-5xl flex-1 flex flex-col h-full overflow-hidden space-y-4">
              {/* Top Header Row with Tabs and Utility Controls */}
              <div className="flex items-center justify-between border-b border-dark-border pb-3 flex-shrink-0">
                {/* Left: View Tabs */}
                <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5">
                  <button
                    onClick={() => setActiveTab("movies")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition flex-shrink-0 ${
                      activeTab === "movies"
                        ? "bg-brand-blue text-brand-text shadow-md"
                        : "bg-dark-surface hover:bg-dark-hover text-gray-300"
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>
                      <span className="hidden sm:inline">Available </span>Movies
                      <span className="hidden md:inline"> & Watchlist</span>
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("schedules")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition flex-shrink-0 ${
                      activeTab === "schedules"
                        ? "bg-brand-blue text-brand-text shadow-md"
                        : "bg-dark-surface hover:bg-dark-hover text-gray-300"
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>Schedules</span>
                    {schedules.length > 0 && (
                      <span className="bg-brand-blue/30 text-brand-text px-1.5 py-0.2 rounded-full text-[10px]">
                        {schedules.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Right: Theme Toggle, Settings, and About & Legal */}
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  {/* Distinct Square Theme Toggle Button */}
                  <button
                    type="button"
                    onClick={() =>
                      updateSettings({
                        theme: settings.theme === "light" ? "dark" : "light",
                      })
                    }
                    className="w-8 h-8 rounded-lg bg-dark-card border border-dark-border hover:bg-dark-surface hover:border-gray-500 shadow-sm flex items-center justify-center transition active:scale-95 group"
                    title={
                      settings.theme === "light"
                        ? "Switch to Dark Mode"
                        : "Switch to Light Mode"
                    }
                    aria-label={
                      settings.theme === "light"
                        ? "Switch to Dark Mode"
                        : "Switch to Light Mode"
                    }
                  >
                    {settings.theme === "light" ? (
                      <Moon className="w-4 h-4 text-indigo-600 dark:text-blue-400 transition-transform group-hover:-rotate-12" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-400 transition-transform group-hover:rotate-45" />
                    )}
                  </button>

                  <div className="w-px h-4 bg-dark-border/80" />

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setIsSettingsModalOpen(true)}
                      className="py-1 px-2 rounded-lg hover:bg-dark-surface hover:text-gray-100 flex items-center gap-1.5 transition group"
                    >
                      <Settings className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-400 transition" />
                      <span className="text-xs">Settings</span>
                    </button>

                    <div className="w-px h-3.5 bg-dark-border/80" />

                    <button
                      type="button"
                      onClick={() => setIsQuickStartModalOpen(true)}
                      className="py-1 px-2 rounded-lg hover:bg-dark-surface hover:text-gray-100 flex items-center gap-1.5 transition group"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-400 transition" />
                      <span className="text-xs">Guide</span>
                    </button>

                    <div className="w-px h-3.5 bg-dark-border/80" />

                    <button
                      type="button"
                      onClick={() => setIsAboutModalOpen(true)}
                      className="py-1 px-2 rounded-lg hover:bg-dark-surface hover:text-gray-100 flex items-center gap-1.5 transition group"
                    >
                      <Info className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-400 transition" />
                      <span className="text-xs">About &amp; Legal</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Remote Version Gate / Maintenance Status Banner (Only shown when currentVersion < min_version) */}
              {remoteStatus &&
                remoteStatus.is_outdated &&
                (remoteStatus.update_available || !isStatusDismissed) && (
                  <div className="flex items-start justify-between gap-3 bg-amber-950/60 border border-amber-500/40 text-amber-100 rounded-lg p-3 px-4 text-xs shadow-sm flex-shrink-0">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1 min-w-0">
                        <p className="font-semibold text-amber-200">
                          {remoteStatus.update_available
                            ? `Update Required (v${remoteStatus.min_version} Available)`
                            : `Maintenance Notice (v${remoteStatus.min_version} In Progress)`}
                        </p>
                        <p className="text-amber-100/90 leading-relaxed">
                          {remoteStatus.message ||
                            (remoteStatus.update_available
                              ? `Matineer v${remoteStatus.min_version} is available with support for AMC's latest page layout. Please update to ensure showtimes load properly.`
                              : `AMC recently changed their page layout. A fix (v${remoteStatus.min_version}) is currently rolling out and will be available soon.`)}
                        </p>
                        {updateFeedback && (
                          <p className="text-[11px] text-amber-300/90 pt-0.5">
                            {updateFeedback}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {remoteStatus.update_available ? (
                        <button
                          type="button"
                          onClick={handleTriggerUpdate}
                          disabled={isUpdatingExtension}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
                        >
                          {isUpdatingExtension ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>{isUpdatingExtension ? "Checking..." : "Update Now"}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsStatusDismissed(true)}
                          className="p-1 rounded hover:bg-amber-900/50 text-amber-300 hover:text-white transition"
                          title="Dismiss notice"
                          aria-label="Dismiss notice"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

              {/* A-List Banner (Only shown on schedule booking tab) */}
              {activeTab === "schedules" && <HeaderBanner />}

              {/* Active Tab Scrollable Content */}
              <div className="flex-1 overflow-y-auto pr-1">
                <div className={activeTab === "movies" ? "" : "hidden"}>
                  <MoviesTab
                    movies={movies}
                    isLoading={isScraping}
                    selectedDate={selectedDate}
                    selectedTheaterId={theaterId}
                    theaterName={currentTheater?.name}
                    showtimesUrl={showtimesUrl}
                    metadataProgress={metadataProgress}
                    onCancelLoading={handleCancelShowtimesLoading}
                    onCancelMetadata={handleCancelMetadata}
                    pinnedShowing={pinnedShowing}
                    onOpenTheaterModal={() => setIsTheaterModalOpen(true)}
                    onOpenSettings={() => setIsSettingsModalOpen(true)}
                    onMovieStatusChange={handleMovieStatusChange}
                    onFormatToggle={handleFormatToggle}
                    onUserStatusChange={handleUserStatusChange}
                    onPinShowing={handlePinShowing}
                    onUnpinShowing={handleUnpinShowing}
                    onIncludeAll={handleIncludeAll}
                    onExcludeAll={handleExcludeAll}
                    onRefreshShowtimes={() => loadShowtimes(true)}
                    showQuickStart={showQuickStart}
                    onDismissQuickStart={dismissQuickStart}
                  />
                </div>

                <div className={activeTab === "schedules" ? "" : "hidden"}>
                  <SchedulesTab
                    schedules={schedules}
                    isSolving={isSolving}
                    mustSeeTitles={mustSeeTitles}
                    selectedMoviesCount={selectedMoviesCount}
                    pinnedShowing={pinnedShowing}
                  />
                </div>
              </div>
            </div>
          </main>

          {/* Modals */}
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            apiKey={settings.mdblistApiKey}
            onHistoryReset={handleHistoryReset}
            onSaveKey={handleSaveMdblistApiKey}
            onCacheCleared={handleCacheCleared}
          />
          <AboutModal
            isOpen={isAboutModalOpen}
            onClose={() => setIsAboutModalOpen(false)}
          />
          <QuickStartModal
            isOpen={isQuickStartModalOpen}
            onClose={() => setIsQuickStartModalOpen(false)}
          />
        </div>
      </div>
    </MarathonConfigProvider>
  );
};

export const App: React.FC = () => {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
};

export default App;
