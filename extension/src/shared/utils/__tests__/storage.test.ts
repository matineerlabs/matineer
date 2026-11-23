import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  STORAGE_KEYS,
} from "../storage";

describe("storage utility", () => {
  beforeEach(() => {
    localStorage.clear();
    delete (globalThis as any).chrome;
  });

  afterEach(() => {
    localStorage.clear();
    delete (globalThis as any).chrome;
  });

  it("reads and writes to localStorage when chrome.storage is not available", async () => {
    await setStorageItem("test_key", "hello_world");
    const val = await getStorageItem("test_key", "");
    expect(val).toBe("hello_world");

    await removeStorageItem("test_key");
    const removedVal = await getStorageItem("test_key", "default");
    expect(removedVal).toBe("default");
  });

  it("handles complex JSON objects in localStorage fallback", async () => {
    const favorites = ["th-1", "th-2", "th-3"];
    await setStorageItem(STORAGE_KEYS.FAVORITE_THEATERS, favorites);

    const val = await getStorageItem<string[]>(STORAGE_KEYS.FAVORITE_THEATERS, []);
    expect(val).toEqual(favorites);
  });

  it("uses chrome.storage.local when available", async () => {
    const mockStorage: Record<string, any> = {};
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
          set: vi.fn(async (obj: Record<string, any>) => {
            Object.assign(mockStorage, obj);
          }),
          remove: vi.fn(async (key: string) => {
            delete mockStorage[key];
          }),
        },
      },
    };

    await setStorageItem("theater", "amc-123");
    expect((globalThis as any).chrome.storage.local.set).toHaveBeenCalledWith({
      theater: "amc-123",
    });

    const val = await getStorageItem("theater", "");
    expect(val).toBe("amc-123");

    await removeStorageItem("theater");
    expect((globalThis as any).chrome.storage.local.remove).toHaveBeenCalledWith("theater");
  });

  it("migrates existing localStorage items to chrome.storage.local", async () => {
    localStorage.setItem("legacy_key", JSON.stringify(["fav-1", "fav-2"]));

    const mockStorage: Record<string, any> = {};
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
          set: vi.fn(async (obj: Record<string, any>) => {
            Object.assign(mockStorage, obj);
          }),
        },
      },
    };

    const val = await getStorageItem<string[]>("legacy_key", []);
    expect(val).toEqual(["fav-1", "fav-2"]);
    expect((globalThis as any).chrome.storage.local.set).toHaveBeenCalledWith({
      legacy_key: ["fav-1", "fav-2"],
    });
  });

  describe("AppSettings persistence", () => {
    it("loads default settings when nothing is stored", async () => {
      const { loadAppSettings } = await import("../storage");
      const { DEFAULT_APP_SETTINGS } = await import("../../types/settings");
      const settings = await loadAppSettings();
      expect(settings).toEqual(DEFAULT_APP_SETTINGS);
      expect(settings.mdblistApiKey).toBe("");
    });

    it("saves and loads updated settings with matineer_settings_ prefix", async () => {
      const { loadAppSettings, saveAppSettings, STORAGE_KEYS } = await import("../storage");
      await saveAppSettings({
        preferPremiumFormats: false,
        defaultTrailerMin: 30,
        showRatings: false,
        rankNonAListLast: true,
      });

      const loaded = await loadAppSettings();
      expect(loaded.preferPremiumFormats).toBe(false);
      expect(loaded.defaultTrailerMin).toBe(30);
      expect(loaded.showRatings).toBe(false);
      expect(loaded.rankNonAListLast).toBe(true);

      // Verify prefix in storage
      const rawStored = localStorage.getItem(STORAGE_KEYS.SETTINGS_PREFER_PREMIUM_FORMATS);
      expect(rawStored).toBe("false");
    });

    it("saves and loads mdblistApiKey with matineer_settings_ prefix and removes when empty", async () => {
      const { loadAppSettings, saveAppSettings, STORAGE_KEYS } = await import("../storage");
      await saveAppSettings({
        mdblistApiKey: "test-mdblist-key-123",
      });

      const loaded = await loadAppSettings();
      expect(loaded.mdblistApiKey).toBe("test-mdblist-key-123");
      expect(localStorage.getItem(STORAGE_KEYS.MDBLIST_API_KEY)).toBe("test-mdblist-key-123");

      // Clearing with empty or whitespace string
      await saveAppSettings({
        mdblistApiKey: "   ",
      });

      const cleared = await loadAppSettings();
      expect(cleared.mdblistApiKey).toBe("");
      expect(localStorage.getItem(STORAGE_KEYS.MDBLIST_API_KEY)).toBeNull();
    });
  });
});
