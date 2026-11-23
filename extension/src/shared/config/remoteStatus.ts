import { getStorageItem, setStorageItem } from '../utils/storage';
import type { RemoteStatusResponse } from '../types/schemas';

export const REMOTE_STATUS_URL =
  'https://raw.githubusercontent.com/matineerlabs/matineer/status/status.json';

export const REMOTE_STATUS_STORAGE_KEY = 'matineer_remote_status_cache';
export const REMOTE_STATUS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface RemoteStatusPayload {
  min_version: string;
  update_available: boolean;
  message: string;
}

interface CachedRemoteStatus {
  payload: RemoteStatusPayload;
  fetched_at: number;
}

export const DEFAULT_REMOTE_STATUS_PAYLOAD: RemoteStatusPayload = {
  min_version: '1.0.0',
  update_available: false,
  message: '',
};

/**
 * Compares two semver strings (e.g. "1.0.0" vs "1.0.1").
 * Returns true if currentVersion is strictly below minVersion.
 */
export function isVersionBelowMinimum(currentVersion: string, minVersion: string): boolean {
  const parseParts = (v: string): number[] =>
    String(v || '0.0.0')
      .trim()
      .replace(/^v/i, '')
      .split('.')
      .map((part) => {
        const n = parseInt(part, 10);
        return Number.isNaN(n) ? 0 : n;
      });

  const curr = parseParts(currentVersion);
  const min = parseParts(minVersion);
  const maxLen = Math.max(curr.length, min.length, 3);

  for (let i = 0; i < maxLen; i++) {
    const c = curr[i] ?? 0;
    const m = min[i] ?? 0;
    if (c < m) return true;
    if (c > m) return false;
  }

  return false;
}

/**
 * Validates and sanitizes raw JSON parsed from status.json.
 */
export function sanitizeRemoteStatusPayload(raw: unknown): RemoteStatusPayload {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_REMOTE_STATUS_PAYLOAD };
  }
  const obj = raw as Record<string, unknown>;

  const minVersionRaw = typeof obj.min_version === 'string' ? obj.min_version.trim() : '';
  const min_version = /^\d+\.\d+\.\d+$/.test(minVersionRaw)
    ? minVersionRaw
    : DEFAULT_REMOTE_STATUS_PAYLOAD.min_version;

  const update_available = Boolean(obj.update_available);

  const message =
    typeof obj.message === 'string' ? obj.message.trim().slice(0, 500) : '';

  return {
    min_version,
    update_available,
    message,
  };
}

export function getCurrentExtensionVersion(): string {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
      const manifest = chrome.runtime.getManifest();
      if (manifest?.version) {
        return manifest.version;
      }
    }
  } catch {
    // Fallback outside extension context
  }
  return '1.0.0';
}

export async function getRemoteStatus(forceRefresh: boolean = false): Promise<RemoteStatusResponse> {
  const currentVersion = getCurrentExtensionVersion();
  let payload: RemoteStatusPayload | null = null;

  if (!forceRefresh) {
    const cached = await getStorageItem<CachedRemoteStatus | null>(
      REMOTE_STATUS_STORAGE_KEY,
      null
    );
    if (
      cached &&
      cached.payload &&
      typeof cached.fetched_at === 'number' &&
      Date.now() - cached.fetched_at < REMOTE_STATUS_CACHE_TTL_MS
    ) {
      payload = sanitizeRemoteStatusPayload(cached.payload);
    }
  }

  if (!payload) {
    try {
      const cacheBuster = forceRefresh ? `?t=${Date.now()}` : '';
      const res = await fetch(`${REMOTE_STATUS_URL}${cacheBuster}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const rawJson = await res.json();
        payload = sanitizeRemoteStatusPayload(rawJson);
        await setStorageItem<CachedRemoteStatus>(REMOTE_STATUS_STORAGE_KEY, {
          payload,
          fetched_at: Date.now(),
        });
      }
    } catch {
      // Network error or offline: fall back to any cached value or default
    }
  }

  if (!payload) {
    const fallbackCache = await getStorageItem<CachedRemoteStatus | null>(
      REMOTE_STATUS_STORAGE_KEY,
      null
    );
    payload = fallbackCache?.payload
      ? sanitizeRemoteStatusPayload(fallbackCache.payload)
      : { ...DEFAULT_REMOTE_STATUS_PAYLOAD };
  }

  const isOutdated = isVersionBelowMinimum(currentVersion, payload.min_version);

  return {
    current_version: currentVersion,
    min_version: payload.min_version,
    is_outdated: isOutdated,
    update_available: isOutdated && payload.update_available,
    message: isOutdated ? payload.message : '',
  };
}
