import { db } from '../db';
import { MovieDayStatus, UserMovieStatus } from '../../types/movie';

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

  // --- Day Selections ---

  async setDaySelection(dateStr: string, title: string, status: MovieDayStatus, allowedFormats?: string[] | null): Promise<void> {
    const titleLower = title.toLowerCase();
    const id = `${dateStr}|${titleLower}`;

    if (status === MovieDayStatus.INCLUDE && (!allowedFormats || allowedFormats.length === 0)) {
      // Default state is Include with no specific formats. We can remove it to save space.
      await db.dayMovieSelections.delete(id);
    } else {
      await db.dayMovieSelections.put({
        id: id,
        date_str: dateStr,
        movie_title: title,
        movie_title_lower: titleLower,
        status: status,
        allowed_formats: allowedFormats || null,
        updated_at: Date.now()
      });
    }
  }

  async batchSetDaySelections(dateStr: string, titles: string[], status: MovieDayStatus): Promise<void> {
    const now = Date.now();
    const titleLowers = titles.map(t => t.toLowerCase());

    await db.transaction('rw', db.dayMovieSelections, async () => {
      if (status === MovieDayStatus.INCLUDE) {
        // Fetch existing records to check if they have allowed_formats preserved
        const existing = await db.dayMovieSelections.where('date_str').equals(dateStr).toArray();
        const existingMap = new Map(existing.map(r => [r.movie_title_lower, r]));

        const toDelete: string[] = [];
        const toPut: any[] = [];

        for (let i = 0; i < titles.length; i++) {
          const title = titles[i]!;
          const lower = titleLowers[i]!;
          const id = `${dateStr}|${lower}`;
          const currentRec = existingMap.get(lower);

          if (currentRec && currentRec.allowed_formats && currentRec.allowed_formats.length > 0) {
            // Keep allowed_formats intact, just update status
            toPut.push({
              id,
              date_str: dateStr,
              movie_title: title,
              movie_title_lower: lower,
              status: MovieDayStatus.INCLUDE,
              allowed_formats: currentRec.allowed_formats,
              updated_at: now
            });
          } else {
            // Clean unconfigured Include can be deleted to save space
            toDelete.push(id);
          }
        }

        if (toDelete.length > 0) {
          await db.dayMovieSelections.bulkDelete(toDelete);
        }
        if (toPut.length > 0) {
          await db.dayMovieSelections.bulkPut(toPut);
        }
      } else {
        // For EXCLUDE, MUST_SEE, etc.
        const existing = await db.dayMovieSelections.where('date_str').equals(dateStr).toArray();
        const existingMap = new Map(existing.map(r => [r.movie_title_lower, r]));

        const records = titles.map((title, idx) => {
          const lower = titleLowers[idx]!;
          const currentRec = existingMap.get(lower);
          return {
            id: `${dateStr}|${lower}`,
            date_str: dateStr,
            movie_title: title,
            movie_title_lower: lower,
            status: status,
            allowed_formats: currentRec?.allowed_formats || null,
            updated_at: now
          };
        });

        await db.dayMovieSelections.bulkPut(records);
      }
    });
  }

  async getDaySelectionsForDate(dateStr: string): Promise<Record<string, { status: MovieDayStatus; allowed_formats?: string[] | null }>> {
    const records = await db.dayMovieSelections.where('date_str').equals(dateStr).toArray();
    const result: Record<string, { status: MovieDayStatus; allowed_formats?: string[] | null }> = {};
    for (const r of records) {
      result[r.movie_title_lower] = {
        status: r.status,
        allowed_formats: r.allowed_formats
      };
    }
    return result;
  }
}

export const preferencesRepo = new PreferencesRepository();
