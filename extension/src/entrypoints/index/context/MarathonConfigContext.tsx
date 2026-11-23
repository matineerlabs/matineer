import React, { createContext, useContext } from "react";
import { BreakConfig } from "../types/api";

export interface MarathonConfigContextType {
  numMovies: number;
  onNumMoviesChange: (n: number) => void;
  earliestStart: string;
  onEarliestStartChange: (s: string) => void;
  latestEnd: string;
  onLatestEndChange: (s: string) => void;
  trailerMin: number;
  onTrailerMinChange: (n: number) => void;
  minWaitMin: number;
  onMinWaitMinChange: (n: number) => void;
  maxWaitMin: number;
  onMaxWaitMinChange: (n: number) => void;
  breaks: BreakConfig[];
  onAddBreak: (intent: BreakConfig["intent"]) => void;
  onRemoveBreak: (id: string) => void;
  onUpdateBreakSize: (id: string, size: string) => void;
}

export const MarathonConfigContext = createContext<MarathonConfigContextType | null>(null);

export interface MarathonConfigProviderProps {
  value: MarathonConfigContextType;
  children: React.ReactNode;
}

export const MarathonConfigProvider: React.FC<MarathonConfigProviderProps> = ({
  value,
  children,
}) => {
  return (
    <MarathonConfigContext.Provider value={value}>
      {children}
    </MarathonConfigContext.Provider>
  );
};

export const useMarathonConfig = (): MarathonConfigContextType => {
  const ctx = useContext(MarathonConfigContext);
  if (!ctx) {
    throw new Error("useMarathonConfig must be used within a MarathonConfigProvider");
  }
  return ctx;
};

export const useOptionalMarathonConfig = (): MarathonConfigContextType | null => {
  return useContext(MarathonConfigContext);
};
