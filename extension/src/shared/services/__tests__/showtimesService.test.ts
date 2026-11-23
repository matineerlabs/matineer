import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getShowtimesService } from '../showtimesService';
import { cacheRepo } from '../../db/repositories/cacheRepo';

vi.mock('../../utils/offscreenSetup', () => ({
  setupOffscreenDocument: vi.fn().mockResolvedValue(undefined),
}));

describe('getShowtimesService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws an informative error if theater URL cannot be determined and does not use Denver fallback', async () => {
    // Non-existent theater id
    await expect(
      getShowtimesService({
        theater_id: 'non-existent-theater-xyz',
        date_str: '2026-10-15',
        force_refresh: true,
      })
    ).rejects.toThrow(/Unable to locate showtimes URL for theater "non-existent-theater-xyz"/);
  });

  it('returns cached showtimes when available and force_refresh is false', async () => {
    const cachedData = {
      theater_id: 'amc-custom-1',
      theater_name: 'AMC Custom',
      date: '2026-10-15',
      movies: [
        {
          title: 'Movie 1',
          all_formats: ['Standard'],
          showings_by_format: { Standard: [{ time: '1:00pm' }] },
        },
      ],
      total_showings: 1,
    };

    vi.spyOn(cacheRepo, 'getShowtimes').mockResolvedValue(cachedData as any);

    const result = await getShowtimesService({
      theater_id: 'amc-custom-1',
      date_str: '2026-10-15',
      force_refresh: false,
    });

    expect(result.theater_id).toBe('amc-custom-1');
    expect(result.movies.length).toBe(1);
    expect(result.movies[0]!.title).toBe('Movie 1');
  });

  it('hydrates returned movies with cached ratings metadata immediately', async () => {
    const cachedData = {
      theater_id: 'amc-custom-1',
      theater_name: 'AMC Custom',
      date: '2026-10-15',
      movies: [
        {
          title: 'Gladiator II',
          all_formats: ['Digital'],
          showings_by_format: { Digital: [{ time: '7:00pm' }] },
        },
      ],
      total_showings: 1,
    };

    vi.spyOn(cacheRepo, 'getShowtimes').mockResolvedValue(cachedData as any);
    vi.spyOn(cacheRepo, 'getMovieMetadata').mockImplementation(async (title: string) => {
      if (title === 'Gladiator II') {
        return {
          rt_score: '87%',
          audience_score: '93%',
          imdb_rating: '7.8',
          rated: 'R',
          genre: 'Action, Drama',
          plot: 'Years after witnessing the death of Maximus...',
        };
      }
      return null;
    });

    const result = await getShowtimesService({
      theater_id: 'amc-custom-1',
      date_str: '2026-10-15',
      force_refresh: false,
    });

    expect(result.movies[0]!.rt_score).toBe('87%');
    expect(result.movies[0]!.audience_score).toBe('93%');
    expect(result.movies[0]!.imdb_rating).toBe('7.8');
    expect(result.movies[0]!.rated).toBe('R');
    expect(result.movies[0]!.genre).toBe('Action, Drama');
    expect(result.movies[0]!.plot).toContain('Years after witnessing');
  });

  it('persists strictly raw movies into cacheRepo without mutating cache with user day status', async () => {
    const rawMovies = [
      {
        title: 'Movie Raw',
        all_formats: ['Digital'],
        showings_by_format: { Digital: [{ time: '2:00pm' }] },
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html><body>mock</body></html>',
    } as any);

    (globalThis as any).chrome = {
      runtime: {
        sendMessage: vi.fn().mockResolvedValue({
          success: true,
          movies: rawMovies,
        }),
      },
    };

    const saveSpy = vi.spyOn(cacheRepo, 'saveShowtimes').mockResolvedValue(undefined);

    await getShowtimesService({
      theater_id: 'amc-westminster-promenade-24',
      date_str: '2026-10-15',
      force_refresh: true,
    });

    expect(saveSpy).toHaveBeenCalledTimes(1);
    const savedPayload = saveSpy.mock.calls[0]![3];
    expect(savedPayload.movies).toBe(rawMovies);
    // Raw movies should not contain day status or user status
    expect(savedPayload.movies[0]!.status).toBeUndefined();
    expect(savedPayload.movies[0]!.user_status).toBeUndefined();
  });

  it('does not cache empty (0 movies) responses in IndexedDB', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html><body>No showtimes announced</body></html>',
    } as any);

    (globalThis as any).chrome = {
      runtime: {
        sendMessage: vi.fn().mockResolvedValue({
          success: true,
          movies: [],
        }),
      },
    };

    const saveSpy = vi.spyOn(cacheRepo, 'saveShowtimes').mockResolvedValue(undefined);

    const res = await getShowtimesService({
      theater_id: 'amc-westminster-promenade-24',
      date_str: '2026-12-25',
      force_refresh: true,
    });

    expect(res.movies).toEqual([]);
    expect(res.showtimes_url).toContain('date=2026-12-25');
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
