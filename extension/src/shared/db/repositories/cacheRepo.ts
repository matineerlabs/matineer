import { db } from '../db';
import { normalizeMovieKey } from '../../utils/movie';

export const DEFAULT_SHOWTIMES_TTL_MS = 60 * 60 * 1000; // 1 hour for showtimes / movies
export const DEFAULT_METADATA_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for metadata

export class CacheRepository {
  readonly defaultShowtimesTtlMs: number;
  readonly defaultMetadataTtlMs: number;

  constructor(
    showtimesTtlMs: number = DEFAULT_SHOWTIMES_TTL_MS,
    metadataTtlMs: number = DEFAULT_METADATA_TTL_MS
  ) {
    this.defaultShowtimesTtlMs = showtimesTtlMs;
    this.defaultMetadataTtlMs = metadataTtlMs;
  }

  // --- Showtimes Cache ---

  async saveShowtimes(
    providerId: string,
    theaterId: string,
    dateStr: string,
    moviesJson: any,
    fetchedAt: number = Date.now()
  ): Promise<void> {
    const id = `${providerId}|${theaterId}|${dateStr}`;
    await db.showtimeCache.put({
      id,
      provider_id: providerId,
      theater_id: theaterId,
      date_str: dateStr,
      movies_json: moviesJson,
      fetched_at: fetchedAt,
    });
  }

  async getShowtimes(
    providerId: string,
    theaterId: string,
    dateStr: string,
    ttlMs: number = this.defaultShowtimesTtlMs
  ): Promise<any | null> {
    const id = `${providerId}|${theaterId}|${dateStr}`;
    const record = await db.showtimeCache.get(id);
    if (!record) return null;

    if (ttlMs > 0 && Number.isFinite(ttlMs)) {
      const fetchedTime = record.fetched_at < 1e11 ? record.fetched_at * 1000 : record.fetched_at;
      if (Date.now() - fetchedTime > ttlMs) {
        await db.showtimeCache.delete(id);
        return null;
      }
    }

    return record.movies_json || null;
  }

  // --- Movie Metadata Cache ---

  async saveMovieMetadata(
    title: string,
    metadataJson: any,
    fetchedAt: number = Date.now()
  ): Promise<void> {
    const cleanTitle = title.trim();
    const titleLower = cleanTitle.toLowerCase();
    await db.movieMetadata.put({
      movie_title: cleanTitle,
      movie_title_lower: titleLower,
      metadata_json: metadataJson,
      fetched_at: fetchedAt,
    });
  }

  async getMovieMetadata(
    title: string,
    ttlMs: number = this.defaultMetadataTtlMs
  ): Promise<any | null> {
    if (!title) return null;
    const cleanTitle = title.trim();
    const titleLower = cleanTitle.toLowerCase();
    let record = await db.movieMetadata.get(titleLower);

    // Fallback: If not found by exact lowercase title, search by normalized movie key
    if (!record) {
      const normKey = normalizeMovieKey(cleanTitle);
      if (normKey) {
        const all = await db.movieMetadata.toArray();
        record = all.find((r) => normalizeMovieKey(r.movie_title) === normKey);
      }
    }

    if (!record) return null;

    if (ttlMs > 0 && Number.isFinite(ttlMs)) {
      const fetchedTime = record.fetched_at < 1e11 ? record.fetched_at * 1000 : record.fetched_at;
      if (Date.now() - fetchedTime > ttlMs) {
        await db.movieMetadata.delete(record.movie_title_lower);
        return null;
      }
    }

    return record.metadata_json || null;
  }

  // --- Cache Clearing ---

  async clearCache(target: 'showtimes' | 'metadata' | 'all'): Promise<{ showtimes: number; metadata: number }> {
    let showtimesCleared = 0;
    let metadataCleared = 0;

    await db.transaction('rw', db.showtimeCache, db.movieMetadata, async () => {
      if (target === 'showtimes' || target === 'all') {
        showtimesCleared = await db.showtimeCache.count();
        await db.showtimeCache.clear();
      }

      if (target === 'metadata' || target === 'all') {
        metadataCleared = await db.movieMetadata.count();
        await db.movieMetadata.clear();
      }
    });

    return { showtimes: showtimesCleared, metadata: metadataCleared };
  }

  // --- Prune Expired Records ---

  async pruneExpired(
    showtimesTtlMs: number = this.defaultShowtimesTtlMs,
    metadataTtlMs: number = this.defaultMetadataTtlMs
  ): Promise<{ showtimesPruned: number; metadataPruned: number }> {
    const now = Date.now();
    let showtimesPruned = 0;
    let metadataPruned = 0;

    await db.transaction('rw', db.showtimeCache, db.movieMetadata, async () => {
      if (showtimesTtlMs > 0 && Number.isFinite(showtimesTtlMs)) {
        const threshold = now - showtimesTtlMs;
        const expiredShowtimes = await db.showtimeCache
          .where('fetched_at')
          .below(threshold)
          .primaryKeys();
        if (expiredShowtimes.length > 0) {
          await db.showtimeCache.bulkDelete(expiredShowtimes);
          showtimesPruned = expiredShowtimes.length;
        }
      }

      if (metadataTtlMs > 0 && Number.isFinite(metadataTtlMs)) {
        const threshold = now - metadataTtlMs;
        const expiredMetadata = await db.movieMetadata
          .where('fetched_at')
          .below(threshold)
          .primaryKeys();
        if (expiredMetadata.length > 0) {
          await db.movieMetadata.bulkDelete(expiredMetadata);
          metadataPruned = expiredMetadata.length;
        }
      }
    });

    return { showtimesPruned, metadataPruned };
  }
}

export const cacheRepo = new CacheRepository();
