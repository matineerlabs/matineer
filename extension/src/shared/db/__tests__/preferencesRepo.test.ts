import { MovieDayStatus, UserMovieStatus } from '../../types/movie';
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { preferencesRepo, SELECTION_TTL_MS } from '../repositories/preferencesRepo';

describe('PreferencesRepository', () => {
  beforeEach(async () => {
    await db.movieStatus.clear();
    await db.dayMovieSelections.clear();
  });

  describe('Movie Status', () => {
    it('should set and get movie status case-insensitively', async () => {
      await preferencesRepo.setMovieStatus('The Matrix', 'seen');

      const status1 = await preferencesRepo.getMovieStatus('the matrix');
      const status2 = await preferencesRepo.getMovieStatus('THE MATRIX');

      expect(status1).toBe('seen');
      expect(status2).toBe('seen');
    });

    it('should remove status when set to active', async () => {
      await preferencesRepo.setMovieStatus('Dune', 'wont_watch');
      expect(await preferencesRepo.getMovieStatus('Dune')).toBe('wont_watch');

      await preferencesRepo.setMovieStatus('Dune', 'active');
      expect(await preferencesRepo.getMovieStatus('Dune')).toBe('active');
    });

    it('should get all statuses correctly', async () => {
      await preferencesRepo.setMovieStatus('Movie A', 'seen');
      await preferencesRepo.setMovieStatus('Movie B', 'wont_watch');
      await preferencesRepo.setMovieStatus('Movie C', 'seen');

      const all = await preferencesRepo.getAllMovieStatuses();
      expect(all.seen_movies).toContain('Movie A');
      expect(all.seen_movies).toContain('Movie C');
      expect(all.wont_watch_movies).toContain('Movie B');
      expect(all.seen_movies).not.toContain('Movie B');
    });

    it('should reset only seen movies when requested', async () => {
      await preferencesRepo.setMovieStatus('Movie 1', UserMovieStatus.SEEN);
      await preferencesRepo.setMovieStatus('Movie 2', UserMovieStatus.SEEN);
      await preferencesRepo.setMovieStatus('Movie 3', UserMovieStatus.WONT_WATCH);

      const count = await preferencesRepo.resetMovieStatuses(UserMovieStatus.SEEN);
      expect(count).toBe(2);

      const all = await preferencesRepo.getAllMovieStatuses();
      expect(all.seen_movies).toEqual([]);
      expect(all.wont_watch_movies).toEqual(['Movie 3']);
    });

    it('should reset only wont_watch movies when requested', async () => {
      await preferencesRepo.setMovieStatus('Movie A', UserMovieStatus.SEEN);
      await preferencesRepo.setMovieStatus('Movie B', UserMovieStatus.WONT_WATCH);

      const count = await preferencesRepo.resetMovieStatuses(UserMovieStatus.WONT_WATCH);
      expect(count).toBe(1);

      const all = await preferencesRepo.getAllMovieStatuses();
      expect(all.seen_movies).toEqual(['Movie A']);
      expect(all.wont_watch_movies).toEqual([]);
    });

  });

  describe('Global Movie Selections (30-day TTL)', () => {
    it('should set selection globally and retrieve it across different dates', async () => {
      await preferencesRepo.setDaySelection('2023-11-10', 'Avatar', MovieDayStatus.MUST_SEE, ['IMAX']);

      const record = await db.dayMovieSelections.get('avatar');
      expect(record).toBeDefined();
      expect(record?.status).toBe(MovieDayStatus.MUST_SEE);
      expect(record?.allowed_formats).toEqual(['IMAX']);

      const selectionsNextDay = await preferencesRepo.getDaySelectionsForDate('2023-11-11');
      expect(selectionsNextDay['avatar']).toEqual({
        status: MovieDayStatus.MUST_SEE,
        allowed_formats: ['IMAX'],
      });
    });

    it('should preserve allowed_formats when updating status without passing formats', async () => {
      await preferencesRepo.setDaySelection('2023-11-10', 'Avatar', MovieDayStatus.INCLUDE, ['IMAX']);
      await preferencesRepo.setDaySelection('2023-11-11', 'Avatar', MovieDayStatus.MUST_SEE);

      const record = await db.dayMovieSelections.get('avatar');
      expect(record?.status).toBe(MovieDayStatus.MUST_SEE);
      expect(record?.allowed_formats).toEqual(['IMAX']);
    });

    it('should delete selection if set to Include with no formats', async () => {
      await preferencesRepo.setDaySelection('2023-11-10', 'Avatar', MovieDayStatus.EXCLUDE);
      expect(await db.dayMovieSelections.get('avatar')).toBeDefined();

      await preferencesRepo.setDaySelection('2023-11-10', 'Avatar', MovieDayStatus.INCLUDE, null);
      expect(await db.dayMovieSelections.get('avatar')).toBeUndefined();
    });

    it('should batch set selections globally', async () => {
      await preferencesRepo.setDaySelection('2023-11-10', 'Movie A', MovieDayStatus.MUST_SEE);

      await preferencesRepo.batchSetDaySelections('2023-11-10', ['Movie A', 'Movie B', 'Movie C'], MovieDayStatus.EXCLUDE);

      const a = await db.dayMovieSelections.get('movie a');
      const b = await db.dayMovieSelections.get('movie b');

      expect(a?.status).toBe(MovieDayStatus.EXCLUDE);
      expect(b?.status).toBe(MovieDayStatus.EXCLUDE);

      // Setting back to Include should clear them
      await preferencesRepo.batchSetDaySelections('2023-11-11', ['Movie A', 'Movie B'], MovieDayStatus.INCLUDE);

      expect(await db.dayMovieSelections.get('movie a')).toBeUndefined();
      expect(await db.dayMovieSelections.get('movie b')).toBeUndefined();
      expect(await db.dayMovieSelections.get('movie c')).toBeDefined(); // still Exclude
    });

    it('should preserve custom allowed_formats during batch updates', async () => {
      await preferencesRepo.setDaySelection('2023-11-10', 'Movie A', MovieDayStatus.MUST_SEE, ['IMAX', 'Dolby']);

      // Batch update to Exclude
      await preferencesRepo.batchSetDaySelections('2023-11-10', ['Movie A'], MovieDayStatus.EXCLUDE);
      const excluded = await db.dayMovieSelections.get('movie a');
      expect(excluded?.status).toBe(MovieDayStatus.EXCLUDE);
      expect(excluded?.allowed_formats).toEqual(['IMAX', 'Dolby']);

      // Batch update back to Include (should keep custom format preferences!)
      await preferencesRepo.batchSetDaySelections('2023-11-11', ['Movie A'], MovieDayStatus.INCLUDE);
      const included = await db.dayMovieSelections.get('movie a');
      expect(included?.status).toBe(MovieDayStatus.INCLUDE);
      expect(included?.allowed_formats).toEqual(['IMAX', 'Dolby']);
    });

    it('should purge selections older than 30 days and legacy per-date records', async () => {
      await db.dayMovieSelections.bulkPut([
        {
          id: 'fresh movie',
          date_str: 'global',
          movie_title: 'Fresh Movie',
          movie_title_lower: 'fresh movie',
          status: MovieDayStatus.MUST_SEE,
          allowed_formats: ['IMAX'],
          updated_at: Date.now() - 1000,
        },
        {
          id: 'expired movie',
          date_str: 'global',
          movie_title: 'Expired Movie',
          movie_title_lower: 'expired movie',
          status: MovieDayStatus.EXCLUDE,
          allowed_formats: null,
          updated_at: Date.now() - (SELECTION_TTL_MS + 1000),
        },
        {
          id: '2023-11-10|legacy movie',
          date_str: '2023-11-10',
          movie_title: 'Legacy Movie',
          movie_title_lower: 'legacy movie',
          status: MovieDayStatus.MUST_SEE,
          allowed_formats: null,
          updated_at: Date.now() - 1000,
        },
      ]);

      const selections = await preferencesRepo.getDaySelectionsForDate('2023-11-12');
      expect(Object.keys(selections)).toEqual(['fresh movie']);
      expect(await db.dayMovieSelections.get('expired movie')).toBeUndefined();
      expect(await db.dayMovieSelections.get('2023-11-10|legacy movie')).toBeUndefined();
    });
  });
});


