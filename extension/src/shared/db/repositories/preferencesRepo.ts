import { db } from '../db';
import { MovieDayStatus, UserMovieStatus } from '../../types/movie';

export const SELECTION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const GLOBAL_SELECTION_SCOPE = 'global';

export class PreferencesRepository {

  // --- Movie Status (Seen / Wont Watch) ---

  async setMovieStatus(title: string, status: UserMovieStatus): Promise<void> {
    const titleLower = title.toLowerCase();

    if (status === UserMovieStatus.ACTIVE) {
      // "active" means no special status, so we remove it
      await db.movieStatus.delete(titleLower);
    } else {
      await db.movieStatus.put({
        movie_title: title,
        movie_title_lower: titleLower,
        status: status,
        updated_at: Date.now()
      });
    }
  }

  async getMovieStatus(title: string): Promise<UserMovieStatus> {
    const record = await db.movieStatus.get(title.toLowerCase());
    return record?.status || UserMovieStatus.ACTIVE;
  }

  async getAllMovieStatuses(): Promise<{ seen_movies: string[]; wont_watch_movies: string[] }> {
    const [seenRecords, wontWatchRecords] = await Promise.all([
      db.movieStatus.where('status').equals(UserMovieStatus.SEEN).toArray(),
      db.movieStatus.where('status').equals(UserMovieStatus.WONT_WATCH).toArray(),
    ]);

    return {
      seen_movies: seenRecords.map((r) => r.movie_title),
      wont_watch_movies: wontWatchRecords.map((r) => r.movie_title),
    };
  }

  async resetMovieStatuses(status: UserMovieStatus): Promise<number> {
    const records = await db.movieStatus.where('status').equals(status).primaryKeys();
    if (records.length > 0) {
      await db.movieStatus.bulkDelete(records);
    }
    return records.length;
  }

  // --- Global Movie Selections (Must See / Include / Exclude & Formats, 30-day TTL) ---

  async setDaySelection(_dateStr: string, title: string, status: MovieDayStatus, allowedFormats?: string[] | null): Promise<void> {
    const titleLower = title.toLowerCase();
    const id = titleLower;
    const existing = await db.dayMovieSelections.get(id);
    const cutoff = Date.now() - SELECTION_TTL_MS;
    const activeExistingFormats =
      existing && existing.date_str === GLOBAL_SELECTION_SCOPE && existing.updated_at >= cutoff
        ? existing.allowed_formats || null
        : null;

    const nextFormats =
      allowedFormats === undefined
        ? activeExistingFormats
        : allowedFormats && allowedFormats.length > 0
          ? allowedFormats
          : null;

    if (status === MovieDayStatus.INCLUDE && !nextFormats) {
      // Default state is Include with no specific formats. Remove it to save space.
      await db.dayMovieSelections.delete(id);
    } else {
      await db.dayMovieSelections.put({
        id,
        date_str: GLOBAL_SELECTION_SCOPE,
        movie_title: title,
        movie_title_lower: titleLower,
        status,
        allowed_formats: nextFormats,
        updated_at: Date.now()
      });
    }
  }

  async batchSetDaySelections(_dateStr: string, titles: string[], status: MovieDayStatus): Promise<void> {
    const now = Date.now();
    const titleLowers = titles.map(t => t.toLowerCase());

    await db.transaction('rw', db.dayMovieSelections, async () => {
      const cutoff = now - SELECTION_TTL_MS;
      const existing = await db.dayMovieSelections.where('date_str').equals(GLOBAL_SELECTION_SCOPE).toArray();
      const existingMap = new Map(
        existing.filter((r) => r.updated_at >= cutoff).map((r) => [r.movie_title_lower, r])
      );

      if (status === MovieDayStatus.INCLUDE) {
        const toDelete: string[] = [];
        const toPut: any[] = [];

        for (let i = 0; i < titles.length; i++) {
          const title = titles[i]!;
          const lower = titleLowers[i]!;
          const currentRec = existingMap.get(lower);

          if (currentRec && currentRec.allowed_formats && currentRec.allowed_formats.length > 0) {
            toPut.push({
              id: lower,
              date_str: GLOBAL_SELECTION_SCOPE,
              movie_title: title,
              movie_title_lower: lower,
              status: MovieDayStatus.INCLUDE,
              allowed_formats: currentRec.allowed_formats,
              updated_at: now
            });
          } else {
            toDelete.push(lower);
          }
        }

        if (toDelete.length > 0) {
          await db.dayMovieSelections.bulkDelete(toDelete);
        }
        if (toPut.length > 0) {
          await db.dayMovieSelections.bulkPut(toPut);
        }
      } else {
        const records = titles.map((title, idx) => {
          const lower = titleLowers[idx]!;
          const currentRec = existingMap.get(lower);
          return {
            id: lower,
            date_str: GLOBAL_SELECTION_SCOPE,
            movie_title: title,
            movie_title_lower: lower,
            status,
            allowed_formats: currentRec?.allowed_formats || null,
            updated_at: now
          };
        });

        await db.dayMovieSelections.bulkPut(records);
      }
    });
  }

  async getDaySelectionsForDate(_dateStr: string): Promise<Record<string, { status: MovieDayStatus; allowed_formats?: string[] | null }>> {
    const cutoff = Date.now() - SELECTION_TTL_MS;
    const result: Record<string, { status: MovieDayStatus; allowed_formats?: string[] | null }> = {};

    await db.transaction('rw', db.dayMovieSelections, async () => {
      const allRecords = await db.dayMovieSelections.toArray();
      const expiredIds: string[] = [];

      for (const r of allRecords) {
        if (r.date_str !== GLOBAL_SELECTION_SCOPE || r.updated_at < cutoff) {
          if (r.id) expiredIds.push(r.id);
          continue;
        }
        result[r.movie_title_lower] = {
          status: r.status,
          allowed_formats: r.allowed_formats
        };
      }

      if (expiredIds.length > 0) {
        await db.dayMovieSelections.bulkDelete(expiredIds);
      }
    });

    return result;
  }
}

export const preferencesRepo = new PreferencesRepository();
