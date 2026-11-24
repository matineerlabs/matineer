/**
 * Asynchronous storage adapter wrapping chrome.storage.local / sync with
 * transparent fallback to window.localStorage in non-extension environments.
 */

import { AppSettings, DEFAULT_APP_SETTINGS } from '../types/settings';

export const STORAGE_KEYS = {
  THEATER_ID: "matineer_theater_id",
  FAVORITE_THEATERS: "matineer_favorite_theaters",
  MDBLIST_API_KEY: "matineer_settings_mdblist_api_key",
  MDBLIST_PROMPT_DISMISSED: "matineer_mdblist_prompt_dismissed",

  // Settings keys with matineer_settings_ prefix
  SETTINGS_EARLIEST_START: "matineer_settings_default_earliest_start",
  SETTINGS_LATEST_END: "matineer_settings_default_latest_end",
  SETTINGS_TRAILER_MIN: "matineer_settings_default_trailer_min",
  SETTINGS_MIN_WAIT: "matineer_settings_default_min_wait",
  SETTINGS_MAX_WAIT: "matineer_settings_default_max_wait",
  SETTINGS_PREFER_PREMIUM_FORMATS: "matineer_settings_prefer_premium_formats",
  SETTINGS_SHOW_RATINGS: "matineer_settings_show_ratings",
  SETTINGS_RANK_NON_A_LIST_LAST: "matineer_settings_rank_non_a_list_last",
  SETTINGS_THEME: "matineer_settings_theme",
} as const;

export type StorageArea = "local" | "sync";

function getStorageArea(area: StorageArea = "local"): chrome.storage.StorageArea | null {
  if (typeof chrome !== "undefined" && chrome?.storage?.[area]) {
    return chrome.storage[area];
  }
  return null;
}

export async function getStorageItem<T>(
  key: string,
  defaultValue: T,
  area: StorageArea = "local"
): Promise<T> {
  const chromeStorage = getStorageArea(area);
  if (chromeStorage) {
    try {
      const result = await chromeStorage.get(key);
      if (result && result[key] !== undefined) {
        return result[key] as T;
      }
    } catch (e) {
      console.warn(`[storage] Failed to read ${key} from chrome.storage.${area}:`, e);
    }
  }

  // Fallback to window.localStorage (and migrate if found)
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        try {
          const parsed = JSON.parse(raw);
          // Auto-migrate to chrome.storage
          if (chromeStorage) {
            chromeStorage.set({ [key]: parsed }).catch(() => {});
          }
          return parsed as T;
        } catch {
          if (chromeStorage) {
            chromeStorage.set({ [key]: raw }).catch(() => {});
          }
          return raw as unknown as T;
        }
      }
    } catch {
      // localStorage may be disabled or inaccessible
    }
  }

  return defaultValue;
}

export async function setStorageItem<T>(
  key: string,
  value: T,
  area: StorageArea = "local"
): Promise<void> {
  const chromeStorage = getStorageArea(area);
  if (chromeStorage) {
    try {
      await chromeStorage.set({ [key]: value });
    } catch (e) {
      console.warn(`[storage] Failed to write ${key} to chrome.storage.${area}:`, e);
    }
  }

  // Also mirror to localStorage for fallback persistence
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = typeof value === "string" ? value : JSON.stringify(value);
      window.localStorage.setItem(key, raw);
    } catch {
      // Ignore
    }
  }
}

export async function removeStorageItem(
  key: string,
  area: StorageArea = "local"
): Promise<void> {
  const chromeStorage = getStorageArea(area);
  if (chromeStorage) {
    try {
      await chromeStorage.remove(key);
    } catch (e) {
      console.warn(`[storage] Failed to remove ${key} from chrome.storage.${area}:`, e);
    }
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }
}

/**
 * Loads all consolidated AppSettings.
 */
export async function loadAppSettings(): Promise<AppSettings> {
  const [
    defaultEarliestStart,
    defaultLatestEnd,
    defaultTrailerMin,
    defaultMinWaitMin,
    defaultMaxWaitMin,
    preferPremiumFormats,
    showRatings,
    rankNonAListLast,
    theme,
    mdblistApiKey,
  ] = await Promise.all([
    getStorageItem<string>(STORAGE_KEYS.SETTINGS_EARLIEST_START, DEFAULT_APP_SETTINGS.defaultEarliestStart),
    getStorageItem<string>(STORAGE_KEYS.SETTINGS_LATEST_END, DEFAULT_APP_SETTINGS.defaultLatestEnd),
    getStorageItem<number>(STORAGE_KEYS.SETTINGS_TRAILER_MIN, DEFAULT_APP_SETTINGS.defaultTrailerMin),
    getStorageItem<number>(STORAGE_KEYS.SETTINGS_MIN_WAIT, DEFAULT_APP_SETTINGS.defaultMinWaitMin),
    getStorageItem<number>(STORAGE_KEYS.SETTINGS_MAX_WAIT, DEFAULT_APP_SETTINGS.defaultMaxWaitMin),
    getStorageItem<boolean>(STORAGE_KEYS.SETTINGS_PREFER_PREMIUM_FORMATS, DEFAULT_APP_SETTINGS.preferPremiumFormats),
    getStorageItem<boolean>(STORAGE_KEYS.SETTINGS_SHOW_RATINGS, DEFAULT_APP_SETTINGS.showRatings),
    getStorageItem<boolean>(STORAGE_KEYS.SETTINGS_RANK_NON_A_LIST_LAST, DEFAULT_APP_SETTINGS.rankNonAListLast),
    getStorageItem<'dark' | 'light'>(STORAGE_KEYS.SETTINGS_THEME as any, DEFAULT_APP_SETTINGS.theme),
    getStorageItem<string>(STORAGE_KEYS.MDBLIST_API_KEY, DEFAULT_APP_SETTINGS.mdblistApiKey),
  ]);

  return {
    defaultEarliestStart,
    defaultLatestEnd,
    defaultTrailerMin,
    defaultMinWaitMin,
    defaultMaxWaitMin,
    preferPremiumFormats,
    showRatings,
    rankNonAListLast,
    theme,
    mdblistApiKey,
  };
}

/**
 * Persists an updated AppSettings object.
 */
export async function saveAppSettings(settings: Partial<AppSettings>): Promise<void> {
  const promises: Promise<void>[] = [];

  if (settings.defaultEarliestStart !== undefined) {
    promises.push(setStorageItem(STORAGE_KEYS.SETTINGS_EARLIEST_START, settings.defaultEarliestStart));
  }
  if (settings.defaultLatestEnd !== undefined) {
    promises.push(setStorageItem(STORAGE_KEYS.SETTINGS_LATEST_END, settings.defaultLatestEnd));
  }
  if (settings.defaultTrailerMin !== undefined) {
    promises.push(setStorageItem(STORAGE_KEYS.SETTINGS_TRAILER_MIN, settings.defaultTrailerMin));
  }
  if (settings.defaultMinWaitMin !== undefined) {
    promises.push(setStorageItem(STORAGE_KEYS.SETTINGS_MIN_WAIT, settings.defaultMinWaitMin));
  }
  if (settings.defaultMaxWaitMin !== undefined) {
    promises.push(setStorageItem(STORAGE_KEYS.SETTINGS_MAX_WAIT, settings.defaultMaxWaitMin));
  }
  if (settings.preferPremiumFormats !== undefined) {
    promises.push(setStorageItem(STORAGE_KEYS.SETTINGS_PREFER_PREMIUM_FORMATS, settings.preferPremiumFormats));
  }
  if (settings.showRatings !== undefined) {
    promises.push(setStorageItem(STORAGE_KEYS.SETTINGS_SHOW_RATINGS, settings.showRatings));
  }
  if (settings.rankNonAListLast !== undefined) {
    promises.push(setStorageItem(STORAGE_KEYS.SETTINGS_RANK_NON_A_LIST_LAST, settings.rankNonAListLast));
  }
  if (settings.theme !== undefined) {
    promises.push(setStorageItem(STORAGE_KEYS.SETTINGS_THEME as any, settings.theme));
  }
  if (settings.mdblistApiKey !== undefined) {
    if (settings.mdblistApiKey.trim()) {
      promises.push(setStorageItem(STORAGE_KEYS.MDBLIST_API_KEY, settings.mdblistApiKey.trim()));
    } else {
      promises.push(removeStorageItem(STORAGE_KEYS.MDBLIST_API_KEY));
    }
  }

  await Promise.all(promises);
}
