import React from "react";
import { DateOption, Theater } from "../../types/api";
import {
  TheaterSelector,
  DateSelector,
  MarathonControls,
  BreakConfigurator,
} from "./sidebar/index";

export interface SidebarProps {
  theaters: Theater[];
  selectedTheaterId: string;
  onSelectTheater: (theaterId: string) => void;
  favoriteTheaterIds?: string[];
  onToggleFavorite?: (theaterId: string) => void;
  isTheaterModalOpen?: boolean;
  onOpenTheaterModal?: () => void;
  onCloseTheaterModal?: () => void;
  onOpenSettings?: () => void;

  dates?: DateOption[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
  isScraping: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  theaters,
  selectedTheaterId,
  onSelectTheater,
  favoriteTheaterIds = [],
  onToggleFavorite,
  isTheaterModalOpen,
  onOpenTheaterModal,
  onCloseTheaterModal,
  onOpenSettings,
  dates,
  selectedDate,
  onSelectDate,
  isScraping,
}) => {
  return (
    <aside className="w-72 bg-dark-card border-r border-dark-border flex flex-col h-full overflow-y-auto p-4 space-y-5 text-sm flex-shrink-0 relative z-20">
      {/* Brand Header */}
      <div className="pb-3 border-b border-dark-border/80 flex items-center gap-3">
        <img
          src="/icon/128-unbounded.png"
          alt="Matineer Logo"
          className="w-12 h-12 object-contain flex-shrink-0 drop-shadow"
        />
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="text-xl font-black tracking-wider leading-none uppercase">
            Matineer
          </h1>
          <p className="text-[10px] font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase mt-1">
            Movie Marathon Planner
          </p>
        </div>
      </div>

      {/* 0. Theater Location Card with Favorites Dropdown */}
      <TheaterSelector
        theaters={theaters}
        selectedTheaterId={selectedTheaterId}
        onSelectTheater={onSelectTheater}
        favoriteTheaterIds={favoriteTheaterIds}
        onToggleFavorite={onToggleFavorite}
        isTheaterModalOpen={isTheaterModalOpen}
        onOpenTheaterModal={onOpenTheaterModal}
        onCloseTheaterModal={onCloseTheaterModal}
        isScraping={isScraping}
      />

      {/* 1. Date Selection */}
      <DateSelector
        dates={dates}
        selectedDate={selectedDate}
        selectedTheaterId={selectedTheaterId}
        onSelectDate={onSelectDate}
        isScraping={isScraping}
      />

      {/* 2. Scheduling Rules */}
      <MarathonControls onOpenSettings={onOpenSettings} />

      {/* 3. Flexible Activity Breaks */}
      <BreakConfigurator />
    </aside>
  );
};
