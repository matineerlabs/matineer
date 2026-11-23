import { cacheRepo } from '../db/repositories/cacheRepo';
import { fetchMetadataSingle, parseAmcTitle, metaLog } from '../utils/metadataScraper';
import { normalizeMovieKey, normalizeMpaRating } from '../utils/movie';
import type { MovieResponse } from '../types/schemas';

export interface MetadataStreamParams {
  theater_id: string;
  date_str: string;
  mdblist_api_key?: string;
  omdb_api_key?: string;
}

let activeSessionId = 0;

export function cancelMetadataStream(): void {
  activeSessionId++;
}

function safeSendMessage(message: any) {
  try {
    chrome.runtime.sendMessage(message, () => {
      // Consume lastError to prevent "Unchecked runtime.lastError" console spam
      if (chrome.runtime.lastError) {
        // No-op: client may have closed or navigated away
      }
    });
  } catch {
    // Context destroyed
  }
}

export async function streamMetadataService(params: MetadataStreamParams): Promise<void> {
  const sessionId = ++activeSessionId;
  const { theater_id, date_str } = params;
  const providerId = 'amc';
  const apiKey = (params.mdblist_api_key ?? params.omdb_api_key ?? '').trim();
  const hasApiKey = Boolean(apiKey);
  const showingYear = parseInt(date_str?.slice(0, 4) || '', 10) || new Date().getFullYear();

  const cachedShowtimes = await cacheRepo.getShowtimes(providerId, theater_id, date_str);
  if (!cachedShowtimes || !cachedShowtimes.movies) {
    if (sessionId === activeSessionId) {
      safeSendMessage({
        action: 'METADATA_UPDATE',
        payload: { type: 'complete', total: 0 },
      });
    }
    return;
  }

  const movies: MovieResponse[] = cachedShowtimes.movies;
  metaLog(
    `[Stream] Initiated stream for theater="${theater_id}", date="${date_str}", hasApiKey=${hasApiKey}, totalMovies=${movies.length}`
  );

  // Pre-filter movies that actually require fetching
  const existingMetas = new Map<string, any>();
  const moviesNeedingFetch: MovieResponse[] = [];

  for (const m of movies) {
    if (sessionId !== activeSessionId) return;
    let meta = await cacheRepo.getMovieMetadata(m.title);

    // If no metadata record exists yet, seed the cache with AMC's built-in details
    if (!meta && (m.rt_score || m.audience_score || m.rated || m.genre || m.plot)) {
      meta = {
        title: m.title,
        rt_score: m.rt_score ?? null,
        audience_score: m.audience_score ?? null,
        rated: normalizeMpaRating(m.rated) ?? null,
        genre: m.genre ?? null,
        plot: m.plot ?? null,
        poster_url: m.poster_url ?? null,
        rt_fetch_attempted: Boolean(m.rt_score && m.audience_score),
        rt_lookup_done: Boolean(m.rt_score && m.audience_score),
        imdb_fetch_attempted: false,
        cached_at: Date.now(),
      };
      await cacheRepo.saveMovieMetadata(m.title, meta);
    }

    if (meta) {
      existingMetas.set(m.title, meta);
    }

    // Determine if movie needs fetch:
    // Only fetch from MDBList if hasApiKey is true!
    // A movie needs fetch when hasApiKey is true AND !meta?.imdb_fetch_attempted AND (!meta?.imdb_rating || !meta?.rt_score || !meta?.audience_score).
    const needsFetch = Boolean(
      hasApiKey &&
      !meta?.imdb_fetch_attempted &&
      (!meta?.imdb_rating || !meta?.rt_score || !meta?.audience_score)
    );

    if (needsFetch) {
      moviesNeedingFetch.push(m);
    }
  }

  metaLog(
    `[Stream] Pre-filter: ${moviesNeedingFetch.length}/${movies.length} movies need MDBList fetch (${movies.length - moviesNeedingFetch.length} satisfied in cache)`
  );

  if (sessionId !== activeSessionId) return;

  if (moviesNeedingFetch.length === 0) {
    metaLog(`[Stream] No movies require fetching. Stream complete.`);
    safeSendMessage({
      action: 'METADATA_UPDATE',
      payload: { type: 'complete', total: 0 },
    });
    return;
  }

  const total = moviesNeedingFetch.length;
  safeSendMessage({
    action: 'METADATA_UPDATE',
    payload: { type: 'start', total },
  });

  // Group movies needing fetch by normalizeMovieKey(m.title)
  const groups = new Map<string, MovieResponse[]>();
  for (const m of moviesNeedingFetch) {
    const parsedTitle = parseAmcTitle(m.title).primaryQuery;
    const key = normalizeMovieKey(parsedTitle) || normalizeMovieKey(m.title);
    const list = groups.get(key) || [];
    list.push(m);
    groups.set(key, list);
  }

  metaLog(
    `[Stream] Deduplicated ${moviesNeedingFetch.length} movie card(s) into ${groups.size} unique fetch group(s):`,
    Array.from(groups.keys())
  );

  let current = 0;

  for (const [_key, group] of groups) {
    if (sessionId !== activeSessionId) return;

    // Fetch from MDBList only once for the group
    const rep = group[0];
    if (!rep) continue;
    const promoProgram =
      rep.program_labels && rep.program_labels.length > 0 ? rep.program_labels[0] : null;

    metaLog(
      `[Stream] Processing group "${_key}" (represented by "${rep.title}", ${group.length} card(s))`
    );

    let fetched: any = null;
    try {
      fetched = await fetchMetadataSingle(
        rep.title,
        rep.runtime_min,
        showingYear,
        apiKey,
        promoProgram
      );
    } catch (err) {
      console.warn(`Failed to fetch metadata for ${rep.title}:`, err);
    }

    for (const m of group) {
      if (sessionId !== activeSessionId) return;
      current++;

      const existing = existingMetas.get(m.title) || (await cacheRepo.getMovieMetadata(m.title));

      let updatedMeta: any;
      if (fetched) {
        updatedMeta = {
          title: m.title,
          matched_title: fetched.matched_title || existing?.matched_title || m.title,
          year: fetched.year || existing?.year || String(showingYear),
          rt_score: fetched.rt_score ?? existing?.rt_score ?? m.rt_score ?? null,
          audience_score:
            fetched.audience_score ?? existing?.audience_score ?? m.audience_score ?? null,
          imdb_rating: fetched.imdb_rating ?? existing?.imdb_rating ?? m.imdb_rating ?? null,
          imdb_id: fetched.imdb_id ?? existing?.imdb_id ?? m.imdb_id ?? null,
          // Prioritize AMC's first-party MPA rating, fallback to MDBList only if valid MPA
          rated:
            normalizeMpaRating(m.rated) ??
            normalizeMpaRating(fetched.rated) ??
            normalizeMpaRating(existing?.rated) ??
            null,
          genre: fetched.genre ?? existing?.genre ?? m.genre ?? null,
          plot: fetched.plot ?? existing?.plot ?? m.plot ?? null,
          poster_url: fetched.poster_url ?? existing?.poster_url ?? m.poster_url ?? null,
          rt_fetch_attempted: true,
          rt_lookup_done: true,
          imdb_fetch_attempted: true,
          cached_at: Date.now(),
        };
      } else {
        updatedMeta = {
          title: m.title,
          rt_score: existing?.rt_score ?? m.rt_score ?? null,
          audience_score: existing?.audience_score ?? m.audience_score ?? null,
          imdb_rating: existing?.imdb_rating ?? m.imdb_rating ?? null,
          imdb_id: existing?.imdb_id ?? m.imdb_id ?? null,
          rated: normalizeMpaRating(m.rated) ?? normalizeMpaRating(existing?.rated) ?? null,
          genre: existing?.genre ?? m.genre ?? null,
          plot: existing?.plot ?? m.plot ?? null,
          poster_url: existing?.poster_url ?? m.poster_url ?? null,
          rt_fetch_attempted: true,
          rt_lookup_done: true,
          imdb_fetch_attempted: true,
          cached_at: Date.now(),
        };
      }

      await cacheRepo.saveMovieMetadata(m.title, updatedMeta);

      metaLog(
        `[Stream] Broadcasting update for "${m.title}": RT Critics=${updatedMeta.rt_score ?? 'N/A'}, RT Audience=${updatedMeta.audience_score ?? 'N/A'}, IMDb=${updatedMeta.imdb_rating ?? 'N/A'}`
      );

      safeSendMessage({
        action: 'METADATA_UPDATE',
        payload: {
          type: 'movie_updated',
          title: m.title,
          current,
          total,
          rt_score: updatedMeta.rt_score,
          audience_score: updatedMeta.audience_score,
          imdb_rating: updatedMeta.imdb_rating,
          imdb_id: updatedMeta.imdb_id,
          rated: updatedMeta.rated,
          genre: updatedMeta.genre,
          plot: updatedMeta.plot,
        },
      });
    }
  }

  if (sessionId === activeSessionId) {
    metaLog(`[Stream] Metadata stream complete for theater="${theater_id}", date="${date_str}"`);
    safeSendMessage({
      action: 'METADATA_UPDATE',
      payload: { type: 'complete', total },
    });
  }
}
