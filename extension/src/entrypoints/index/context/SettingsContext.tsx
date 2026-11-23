import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AppSettings, DEFAULT_APP_SETTINGS } from "../../../shared/types/settings";
import { loadAppSettings, saveAppSettings } from "../../../shared/utils/storage";
import { resetMovieStatuses } from "../api/client";
import { UserMovieStatus } from "../../../shared/types/movie";

export interface SettingsContextType {
  settings: AppSettings;
  isLoaded: boolean;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  resetHistory: (status: UserMovieStatus) => Promise<number>;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);

export interface SettingsProviderProps {
  children: React.ReactNode;
  initialSettings?: AppSettings;
  onHistoryReset?: (status: UserMovieStatus, count: number) => void;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
  initialSettings,
  onHistoryReset,
}) => {
  const [settings, setSettings] = useState<AppSettings>(initialSettings || DEFAULT_APP_SETTINGS);
  const [isLoaded, setIsLoaded] = useState<boolean>(!!initialSettings);

  useEffect(() => {
    let mounted = true;
    if (!initialSettings) {
      loadAppSettings().then((loaded) => {
        if (mounted) {
          setSettings(loaded);
          setIsLoaded(true);
        }
      });
    }
    return () => {
      mounted = false;
    };
  }, [initialSettings]);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveAppSettings(next).catch((err) => {
        console.error("Failed to save app settings:", err);
      });
      return next;
    });
  }, []);

  const resetHistory = useCallback(async (status: UserMovieStatus): Promise<number> => {
    const count = await resetMovieStatuses(status);
    onHistoryReset?.(status, count);
    return count;
  }, [onHistoryReset]);

  return (
    <SettingsContext.Provider value={{ settings, isLoaded, updateSettings, resetHistory }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
};

export const useOptionalSettings = (): SettingsContextType | null => {
  return useContext(SettingsContext);
};
