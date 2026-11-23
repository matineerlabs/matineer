import { MovieDayStatus, UserMovieStatus } from '../../types/movie';
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { preferencesRepo } from '../repositories/preferencesRepo';

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

  describe('Day Selections', () => {
    it('should set day selection and retrieve it', async () => {
      await preferencesRepo.setDaySelection('2023-11-10', 'Avatar', MovieDayStatus.MUST_SEE, ['IMAX']);

      const record = await db.dayMovieSelections.get('2023-11-10|avatar');
      expect(record).toBeDefined();
      expect(record?.status).toBe(MovieDayStatus.MUST_SEE);
      expect(record?.allowed_formats).toEqual(['IMAX']);
    });

    it('should delete selection if set to Include with no formats', async () => {
      await preferencesRepo.setDaySelection('2023-11-10', 'Avatar', MovieDayStatus.EXCLUDE);
      expect(await db.dayMovieSelections.get('2023-11-10|avatar')).toBeDefined();

      await preferencesRepo.setDaySelection('2023-11-10', 'Avatar', MovieDayStatus.INCLUDE);
      expect(await db.dayMovieSelections.get('2023-11-10|avatar')).toBeUndefined();
    });

    it('should batch set day selections', async () => {
      await preferencesRepo.setDaySelection('2023-11-10', 'Movie A', MovieDayStatus.MUST_SEE);

      await preferencesRepo.batchSetDaySelections('2023-11-10', ['Movie A', 'Movie B', 'Movie C'], MovieDayStatus.EXCLUDE);

      const a = await db.dayMovieSelections.get('2023-11-10|movie a');
      const b = await db.dayMovieSelections.get('2023-11-10|movie b');

      expect(a?.status).toBe(MovieDayStatus.EXCLUDE);
      expect(b?.status).toBe(MovieDayStatus.EXCLUDE);

      // Setting back to Include should clear them
      await preferencesRepo.batchSetDaySelections('2023-11-10', ['Movie A', 'Movie B'], MovieDayStatus.INCLUDE);

      expect(await db.dayMovieSelections.get('2023-11-10|movie a')).toBeUndefined();
      expect(await db.dayMovieSelections.get('2023-11-10|movie b')).toBeUndefined();
      expect(await db.dayMovieSelections.get('2023-11-10|movie c')).toBeDefined(); // still Exclude
    });

    it('should preserve custom allowed_formats during batch updates', async () => {
      await preferencesRepo.setDaySelection('2023-11-10', 'Movie A', MovieDayStatus.MUST_SEE, ['IMAX', 'Dolby']);

      // Batch update to Exclude
      await preferencesRepo.batchSetDaySelections('2023-11-10', ['Movie A'], MovieDayStatus.EXCLUDE);
      const excluded = await db.dayMovieSelections.get('2023-11-10|movie a');
      expect(excluded?.status).toBe(MovieDayStatus.EXCLUDE);
      expect(excluded?.allowed_formats).toEqual(['IMAX', 'Dolby']);

      // Batch update back to Include (should keep custom format preferences!)
      await preferencesRepo.batchSetDaySelections('2023-11-10', ['Movie A'], MovieDayStatus.INCLUDE);
      const included = await db.dayMovieSelections.get('2023-11-10|movie a');
      expect(included?.status).toBe(MovieDayStatus.INCLUDE);
      expect(included?.allowed_formats).toEqual(['IMAX', 'Dolby']);
    });
  });
});


