import { describe, it, expect, vi, beforeEach } from 'vitest';
import { streamMetadataService, cancelMetadataStream } from '../metadataService';
import { cacheRepo } from '../../db/repositories/cacheRepo';
import { fetchMetadataSingle } from '../../utils/metadataScraper';

vi.mock('../../db/repositories/cacheRepo', () => ({
  cacheRepo: {
    getShowtimes: vi.fn(),
    getMovieMetadata: vi.fn(),
    saveMovieMetadata: vi.fn(),
  },
}));

vi.mock('../../utils/metadataScraper', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/metadataScraper')>();
  return {
    ...actual,
    fetchMetadataSingle: vi.fn().mockResolvedValue({
      rt_score: '95%',
      audience_score: '90%',
      imdb_rating: '8.5',
      imdb_id: 'tt2104990',
      rated: 'R',
      genre: 'Action',
      plot: 'An epic tale.',
      rt_fetch_attempted: true,
      rt_lookup_done: true,
      imdb_fetch_attempted: true,
      metadata_fetch_attempted: true,
    }),
    enrichCachedImdb: vi.fn().mockResolvedValue('8.5'),
  };
});

describe('metadataService caching, deduplication, cancellation and safe messaging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: vi.fn((_msg: any, cb?: any) => {
          if (cb) cb();
        }),
        lastError: null,
      },
    };
  });

  it('stops processing when cancelMetadataStream is called', async () => {
    (cacheRepo.getShowtimes as any).mockResolvedValue({
      movies: [
        { title: 'Movie 1', runtime_min: 120 },
        { title: 'Movie 2', runtime_min: 100 },
      ],
    });
    (cacheRepo.getMovieMetadata as any).mockResolvedValue(null);

    const streamPromise = streamMetadataService({
      theater_id: 'amc-1',
      date_str: '2026-10-15',
      mdblist_api_key: 'test_key',
    });

    cancelMetadataStream();
    await streamPromise;

    expect(cacheRepo.saveMovieMetadata).not.toHaveBeenCalledWith('Movie 2', expect.anything());
  });

  it('completes with total: 0 without starting when no API key is provided and AMC scores exist', async () => {
    (cacheRepo.getShowtimes as any).mockResolvedValue({
      movies: [
        {
          title: 'AMC Movie With Score',
          rt_score: '84%',
          audience_score: '91%',
          runtime_min: 120,
        },
      ],
    });
    (cacheRepo.getMovieMetadata as any).mockResolvedValue(null);

    await streamMetadataService({
      theater_id: 'amc-1',
      date_str: '2026-10-15',
      // No API key provided
    });

    // Seeding should occur
    expect(cacheRepo.saveMovieMetadata).toHaveBeenCalledWith(
      'AMC Movie With Score',
      expect.objectContaining({
        rt_score: '84%',
        audience_score: '91%',
        rt_fetch_attempted: true,
      })
    );

    // MDBList fetch must NOT be called without an API key
    expect(fetchMetadataSingle).not.toHaveBeenCalled();

    const calls = ((globalThis as any).chrome.runtime.sendMessage as any).mock.calls;
    const actions = calls.map((c: any) => c[0].payload);
    expect(actions).toContainEqual({ type: 'complete', total: 0 });
  });

  it('completes with total: 0 without starting when all movies are already cached and attempted', async () => {
    (cacheRepo.getShowtimes as any).mockResolvedValue({
      movies: [
        { title: 'Cached Movie 1', runtime_min: 120 },
        { title: 'Cached Movie 2', runtime_min: 110 },
      ],
    });
    (cacheRepo.getMovieMetadata as any).mockResolvedValue({
      rt_fetch_attempted: true,
      imdb_fetch_attempted: true,
      rt_score: '90%',
      audience_score: '85%',
      imdb_rating: '7.8',
    });

    await streamMetadataService({
      theater_id: 'amc-1',
      date_str: '2026-10-15',
      mdblist_api_key: 'test_key',
    });

    const calls = ((globalThis as any).chrome.runtime.sendMessage as any).mock.calls;
    const actions = calls.map((c: any) => c[0].payload);

    expect(actions).not.toContainEqual(expect.objectContaining({ type: 'start' }));
    expect(actions).toContainEqual({ type: 'complete', total: 0 });
    expect(fetchMetadataSingle).not.toHaveBeenCalled();
  });

  it('fetches MDBList metadata and updates movies when mdblist_api_key is provided', async () => {
    (cacheRepo.getShowtimes as any).mockResolvedValue({
      movies: [
        { title: 'Gladiator II', rated: 'R', genre: 'Action', runtime_min: 148 },
      ],
    });
    (cacheRepo.getMovieMetadata as any).mockResolvedValue(null);

    await streamMetadataService({
      theater_id: 'amc-1',
      date_str: '2026-10-15',
      mdblist_api_key: 'test_mdblist_key',
    });

    expect(fetchMetadataSingle).toHaveBeenCalledWith(
      'Gladiator II',
      148,
      2026,
      'test_mdblist_key',
      null
    );

    expect(cacheRepo.saveMovieMetadata).toHaveBeenCalledWith(
      'Gladiator II',
      expect.objectContaining({
        rt_score: '95%',
        audience_score: '90%',
        imdb_rating: '8.5',
      })
    );

    const calls = ((globalThis as any).chrome.runtime.sendMessage as any).mock.calls;
    const actions = calls.map((c: any) => c[0].payload);

    expect(actions).toContainEqual({ type: 'start', total: 1 });
    expect(actions).toContainEqual(
      expect.objectContaining({
        type: 'movie_updated',
        title: 'Gladiator II',
        current: 1,
        total: 1,
        rt_score: '95%',
        audience_score: '90%',
        imdb_rating: '8.5',
      })
    );
    expect(actions).toContainEqual({ type: 'complete', total: 1 });
  });

  it('supports legacy omdb_api_key parameter as fallback for mdblist_api_key', async () => {
    (cacheRepo.getShowtimes as any).mockResolvedValue({
      movies: [
        { title: 'Gladiator II', runtime_min: 148 },
      ],
    });
    (cacheRepo.getMovieMetadata as any).mockResolvedValue(null);

    await streamMetadataService({
      theater_id: 'amc-1',
      date_str: '2026-10-15',
      omdb_api_key: 'fallback_key',
    });

    expect(fetchMetadataSingle).toHaveBeenCalledWith(
      'Gladiator II',
      148,
      2026,
      'fallback_key',
      null
    );
  });

  it('deduplicates fetch requests across multiple showtime cards sharing the same normalized movie key', async () => {
    (cacheRepo.getShowtimes as any).mockResolvedValue({
      movies: [
        {
          title: 'Spirited Away (Subtitled)',
          runtime_min: 125,
          rt_score: '97%',
        },
        {
          title: 'Spirited Away (Dubbed)',
          runtime_min: 125,
          audience_score: '96%',
        },
      ],
    });
    (cacheRepo.getMovieMetadata as any).mockResolvedValue(null);

    (fetchMetadataSingle as any).mockResolvedValue({
      title: 'Spirited Away',
      rt_score: '97%',
      audience_score: '96%',
      imdb_rating: '8.6',
      imdb_id: 'tt0245429',
      rt_fetch_attempted: true,
      imdb_fetch_attempted: true,
    });

    await streamMetadataService({
      theater_id: 'amc-1',
      date_str: '2026-10-15',
      mdblist_api_key: 'test_key',
    });

    // Both cards share normalizeMovieKey('spirited away'), so fetchMetadataSingle should be called ONLY ONCE!
    expect(fetchMetadataSingle).toHaveBeenCalledTimes(1);

    // Both cards should have their metadata saved
    expect(cacheRepo.saveMovieMetadata).toHaveBeenCalledWith(
      'Spirited Away (Subtitled)',
      expect.objectContaining({
        imdb_rating: '8.6',
      })
    );
    expect(cacheRepo.saveMovieMetadata).toHaveBeenCalledWith(
      'Spirited Away (Dubbed)',
      expect.objectContaining({
        imdb_rating: '8.6',
      })
    );

    // Safe message emitted for both cards
    const calls = ((globalThis as any).chrome.runtime.sendMessage as any).mock.calls;
    const updateEvents = calls
      .map((c: any) => c[0].payload)
      .filter((p: any) => p?.type === 'movie_updated');

    expect(updateEvents.length).toBe(2);
    expect(updateEvents[0].title).toBe('Spirited Away (Subtitled)');
    expect(updateEvents[0].current).toBe(1);
    expect(updateEvents[0].total).toBe(2);

    expect(updateEvents[1].title).toBe('Spirited Away (Dubbed)');
    expect(updateEvents[1].current).toBe(2);
    expect(updateEvents[1].total).toBe(2);
  });

  it('preserves and merges AMC built-in scores if MDBList fetch returns null for some ratings', async () => {
    (cacheRepo.getShowtimes as any).mockResolvedValue({
      movies: [
        {
          title: 'Movie With AMC Critic Score',
          rt_score: '88%',
          runtime_min: 110,
        },
      ],
    });
    (cacheRepo.getMovieMetadata as any).mockResolvedValue(null);

    // MDBList returns audience and imdb, but rt_score is null
    (fetchMetadataSingle as any).mockResolvedValue({
      title: 'Movie With AMC Critic Score',
      rt_score: null,
      audience_score: '91%',
      imdb_rating: '7.9',
      rt_fetch_attempted: true,
      imdb_fetch_attempted: true,
    });

    await streamMetadataService({
      theater_id: 'amc-1',
      date_str: '2026-10-15',
      mdblist_api_key: 'test_key',
    });

    // Merged record should retain rt_score: '88%' from AMC
    expect(cacheRepo.saveMovieMetadata).toHaveBeenCalledWith(
      'Movie With AMC Critic Score',
      expect.objectContaining({
        rt_score: '88%',
        audience_score: '91%',
        imdb_rating: '7.9',
      })
    );
  });

  it('executes immediately without artificial 1000ms delay', async () => {
    (cacheRepo.getShowtimes as any).mockResolvedValue({
      movies: [
        { title: 'Fast Movie 1', runtime_min: 100 },
        { title: 'Fast Movie 2', runtime_min: 110 },
      ],
    });
    (cacheRepo.getMovieMetadata as any).mockResolvedValue(null);

    const startTime = Date.now();
    await streamMetadataService({
      theater_id: 'amc-1',
      date_str: '2026-10-15',
      mdblist_api_key: 'test_key',
    });
    const duration = Date.now() - startTime;

    // With 2 movies and no 1000ms sleep, execution completes well under 500ms
    expect(duration).toBeLessThan(500);
  });
});
