import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isVersionBelowMinimum,
  sanitizeRemoteStatusPayload,
  getRemoteStatus,
  REMOTE_STATUS_STORAGE_KEY,
} from '../remoteStatus';
import * as storage from '../../utils/storage';

describe('remoteStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('isVersionBelowMinimum', () => {
    it('returns false when current version equals min version', () => {
      expect(isVersionBelowMinimum('1.0.0', '1.0.0')).toBe(false);
      expect(isVersionBelowMinimum('1.2.3', '1.2.3')).toBe(false);
    });

    it('returns false when current version is greater than min version', () => {
      expect(isVersionBelowMinimum('1.0.1', '1.0.0')).toBe(false);
      expect(isVersionBelowMinimum('1.1.0', '1.0.9')).toBe(false);
      expect(isVersionBelowMinimum('2.0.0', '1.9.9')).toBe(false);
    });

    it('returns true when current version is strictly below min version', () => {
      expect(isVersionBelowMinimum('1.0.0', '1.0.1')).toBe(true);
      expect(isVersionBelowMinimum('1.0.9', '1.1.0')).toBe(true);
      expect(isVersionBelowMinimum('1.9.9', '2.0.0')).toBe(true);
    });
  });

  describe('sanitizeRemoteStatusPayload', () => {
    it('returns safe defaults for invalid or malformed input', () => {
      expect(sanitizeRemoteStatusPayload(null)).toEqual({
        min_version: '1.0.0',
        update_available: false,
        message: '',
      });

      expect(sanitizeRemoteStatusPayload({ min_version: 'not-a-semver', update_available: 1 })).toEqual({
        min_version: '1.0.0',
        update_available: true,
        message: '',
      });
    });

    it('preserves valid semver and trims message', () => {
      expect(
        sanitizeRemoteStatusPayload({
          min_version: '1.0.2',
          update_available: false,
          message: '  AMC layout changed. Fix in progress!  ',
        })
      ).toEqual({
        min_version: '1.0.2',
        update_available: false,
        message: 'AMC layout changed. Fix in progress!',
      });
    });
  });

  describe('getRemoteStatus', () => {
    it('suppresses message and update_available when currentVersion >= min_version', async () => {
      (globalThis as any).chrome = {
        runtime: {
          getManifest: () => ({ version: '1.0.1' }),
        },
      };

      vi.spyOn(storage, 'getStorageItem').mockResolvedValue(null);
      vi.spyOn(storage, 'setStorageItem').mockResolvedValue(undefined);
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          min_version: '1.0.1',
          update_available: true,
          message: 'Update v1.0.1 is required.',
        }),
      } as any);

      const status = await getRemoteStatus(true);
      expect(status.current_version).toBe('1.0.1');
      expect(status.min_version).toBe('1.0.1');
      expect(status.is_outdated).toBe(false);
      expect(status.update_available).toBe(false);
      expect(status.message).toBe('');
    });

    it('surfaces maintenance message without update button when currentVersion < min_version and update_available is false', async () => {
      (globalThis as any).chrome = {
        runtime: {
          getManifest: () => ({ version: '1.0.0' }),
        },
      };

      vi.spyOn(storage, 'getStorageItem').mockResolvedValue(null);
      vi.spyOn(storage, 'setStorageItem').mockResolvedValue(undefined);
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          min_version: '1.0.1',
          update_available: false,
          message: 'AMC updated their layout. Fix v1.0.1 is under review.',
        }),
      } as any);

      const status = await getRemoteStatus(true);
      expect(status.is_outdated).toBe(true);
      expect(status.update_available).toBe(false);
      expect(status.message).toBe('AMC updated their layout. Fix v1.0.1 is under review.');
    });

    it('surfaces update_available true when currentVersion < min_version and update_available is true', async () => {
      (globalThis as any).chrome = {
        runtime: {
          getManifest: () => ({ version: '1.0.0' }),
        },
      };

      vi.spyOn(storage, 'getStorageItem').mockResolvedValue({
        payload: {
          min_version: '1.0.1',
          update_available: true,
          message: 'v1.0.1 is now live on the Chrome Web Store!',
        },
        fetched_at: Date.now(),
      });

      const status = await getRemoteStatus(false);
      expect(status.is_outdated).toBe(true);
      expect(status.update_available).toBe(true);
      expect(status.message).toBe('v1.0.1 is now live on the Chrome Web Store!');
    });
  });
});
