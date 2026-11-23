import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { cacheRepo, DEFAULT_METADATA_TTL_MS, DEFAULT_SHOWTIMES_TTL_MS } from '../repositories/cacheRepo';
import { db } from '../db';

describe('CacheRepository', () => {
  beforeEach(async () => {
    await db.showtimeCache.clear();
    await db.movieMetadata.clear();
  });

  describe('Showtimes Cache', () => {
    it('should save and get showtimes within TTL', async () => {
      const mockMovies = [{ title: 'Movie A', all_formats: ['Standard'] }];

      await cacheRepo.saveShowtimes('amc', 'th-123', '2023-11-10', mockMovies);

      const retrieved = await cacheRepo.getShowtimes('amc', 'th-123', '2023-11-10');
      expect(retrieved).toEqual(mockMovies);
    });

    it('should return null and delete expired showtimes (older than default 1 hour)', async () => {
      const mockMovies = [{ title: 'Movie A' }];
      const staleTimestamp = Date.now() - (DEFAULT_SHOWTIMES_TTL_MS + 5000);

      await cacheRepo.saveShowtimes('amc', 'th-123', '2023-11-10', mockMovies, staleTimestamp);
      expect(await db.showtimeCache.count()).toBe(1);

      const retrieved = await cacheRepo.getShowtimes('amc', 'th-123', '2023-11-10');
      expect(retrieved).toBeNull();
      expect(await db.showtimeCache.count()).toBe(0);
    });

    it('should respect custom TTL parameter in getShowtimes', async () => {
      const mockMovies = [{ title: 'Movie A' }];
      const halfHourAgo = Date.now() - 30 * 60 * 1000;

      await cacheRepo.saveShowtimes('amc', 'th-123', '2023-11-10', mockMovies, halfHourAgo);

      // Default 1 hour TTL: still valid
      const retrievedDefault = await cacheRepo.getShowtimes('amc', 'th-123', '2023-11-10');
      expect(retrievedDefault).toEqual(mockMovies);

      // Re-save half hour ago
      await cacheRepo.saveShowtimes('amc', 'th-123', '2023-11-10', mockMovies, halfHourAgo);

      // With strict 15 min TTL, it is expired
      const retrievedStrict = await cacheRepo.getShowtimes('amc', 'th-123', '2023-11-10', 15 * 60 * 1000);
      expect(retrievedStrict).toBeNull();
    });
  });

  describe('Movie Metadata', () => {
    it('should save and get metadata case-insensitively within TTL', async () => {
      const mockMeta = { rated: 'PG-13', runtime: 155 };

      await cacheRepo.saveMovieMetadata('Dune Part Two', mockMeta);

      const retrieved1 = await cacheRepo.getMovieMetadata('dune part two');
      const retrieved2 = await cacheRepo.getMovieMetadata('DUNE PART TWO');

      expect(retrieved1).toEqual(mockMeta);
      expect(retrieved2).toEqual(mockMeta);
    });

    it('should match metadata despite leading/trailing whitespace or format descriptors', async () => {
      const mockMeta = { rt_score: '93%', audience_score: '95%' };

      await cacheRepo.saveMovieMetadata('Dune: Part Two', mockMeta);

      // Whitespace trimming
      const retrievedTrimmed = await cacheRepo.getMovieMetadata('  Dune: Part Two  ');
      expect(retrievedTrimmed).toEqual(mockMeta);

      // Format variant normalization fallback (IMAX Experience)
      const retrievedVariant = await cacheRepo.getMovieMetadata('Dune: Part Two The IMAX Experience');
      expect(retrievedVariant).toEqual(mockMeta);
    });

    it('should return null and delete expired metadata (older than default 24 hours)', async () => {
      const mockMeta = { rated: 'PG-13', runtime: 155 };
      const staleTimestamp = Date.now() - (DEFAULT_METADATA_TTL_MS + 5000);

      await cacheRepo.saveMovieMetadata('Dune Part Two', mockMeta, staleTimestamp);
      expect(await db.movieMetadata.count()).toBe(1);

      const retrieved = await cacheRepo.getMovieMetadata('Dune Part Two');
      expect(retrieved).toBeNull();
      expect(await db.movieMetadata.count()).toBe(0);
    });

    it('should respect custom TTL parameter in getMovieMetadata', async () => {
      const mockMeta = { rated: 'PG-13', runtime: 155 };
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

      await cacheRepo.saveMovieMetadata('Oppenheimer', mockMeta, twoHoursAgo);

      // With 1 hour TTL override, it expires
      const retrievedStrict = await cacheRepo.getMovieMetadata('Oppenheimer', 60 * 60 * 1000);
      expect(retrievedStrict).toBeNull();
    });
  });

  describe('Cache Clearing', () => {
    it('should clear specific caches', async () => {
      await cacheRepo.saveShowtimes('amc', 'th-123', 'date1', []);
      await cacheRepo.saveShowtimes('amc', 'th-123', 'date2', []);
      await cacheRepo.saveMovieMetadata('M1', {});

      let res = await cacheRepo.clearCache('showtimes');
      expect(res.showtimes).toBe(2);
      expect(res.metadata).toBe(0);

      expect(await db.showtimeCache.count()).toBe(0);
      expect(await db.movieMetadata.count()).toBe(1);

      res = await cacheRepo.clearCache('all');
      expect(res.metadata).toBe(1);
      expect(await db.movieMetadata.count()).toBe(0);
    });
  });

  describe('Pruning Expired Records', () => {
    it('should prune expired records while keeping fresh records', async () => {
      const now = Date.now();
      const fresh = now;
      const staleShowtime = now - (DEFAULT_SHOWTIMES_TTL_MS + 10000);
      const staleMeta = now - (DEFAULT_METADATA_TTL_MS + 10000);

      await cacheRepo.saveShowtimes('amc', 'th-1', 'fresh-date', [], fresh);
      await cacheRepo.saveShowtimes('amc', 'th-1', 'stale-date', [], staleShowtime);

      await cacheRepo.saveMovieMetadata('Fresh Movie', {}, fresh);
      await cacheRepo.saveMovieMetadata('Stale Movie', {}, staleMeta);

      const result = await cacheRepo.pruneExpired();
      expect(result.showtimesPruned).toBe(1);
      expect(result.metadataPruned).toBe(1);

      expect(await db.showtimeCache.count()).toBe(1);
      expect(await db.movieMetadata.count()).toBe(1);

      const freshShowtimes = await cacheRepo.getShowtimes('amc', 'th-1', 'fresh-date');
      expect(freshShowtimes).not.toBeNull();

      const freshMeta = await cacheRepo.getMovieMetadata('Fresh Movie');
      expect(freshMeta).not.toBeNull();
    });
  });
});
