import { MovieDayStatus, UserMovieStatus, isPremiumFormat } from '../types/movie';
import { resolveAllowedFormats } from '../types/formats';
import { normalizeMpaRating } from '../utils/movie';
import theaters from '../data/amc_theaters.json';
import { cacheRepo } from '../db/repositories/cacheRepo';
import { preferencesRepo } from '../db/repositories/preferencesRepo';
import { setupOffscreenDocument } from '../utils/offscreenSetup';
import type { MovieResponse, ShowtimesResponse } from '../types/schemas';

export async function enrichMoviesWithPreferences(
  rawMovies: MovieResponse[],
  dateStr: string
): Promise<{ movies: MovieResponse[]; total_showings: number }> {
  const [daySelections, userPreferences] = await Promise.all([
    preferencesRepo.getDaySelectionsForDate(dateStr),
    preferencesRepo.getAllMovieStatuses(),
  ]);
  const seenSet = new Set(userPreferences.seen_movies.map((t) => t.toLowerCase()));
  const wontWatchSet = new Set(userPreferences.wont_watch_movies.map((t) => t.toLowerCase()));

  // Fetch cached metadata in parallel so cached ratings & details are populated immediately
  const metadataList = await Promise.all(
    rawMovies.map((m) => cacheRepo.getMovieMetadata(m.title))
  );

  let total_showings = 0;
  const movies: MovieResponse[] = [];

  for (let i = 0; i < rawMovies.length; i++) {
    const m = rawMovies[i]!;
    let meta = metadataList[i];

    // If no metadata record exists yet, but raw AMC showtime already has RT scores or details,
    // seed the cache record with details.
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
      cacheRepo.saveMovieMetadata(m.title, meta).catch(() => {});
    }

    const formats =
      m.all_formats && m.all_formats.length > 0
        ? m.all_formats
        : Object.keys(m.showings_by_format || {});

    for (const formatShowings of Object.values(m.showings_by_format || {})) {
      total_showings += formatShowings.length;
    }

    const titleLower = m.title.toLowerCase();
    let user_status: UserMovieStatus = UserMovieStatus.ACTIVE;
    if (seenSet.has(titleLower)) {
      user_status = UserMovieStatus.SEEN;
    } else if (wontWatchSet.has(titleLower)) {
      user_status = UserMovieStatus.WONT_WATCH;
    }

    const savedDay = daySelections[titleLower];
    let status: MovieDayStatus = MovieDayStatus.INCLUDE;
    let allowed_formats = formats;
    if (savedDay) {
      status =
        savedDay.status ||
        (user_status === UserMovieStatus.ACTIVE ? MovieDayStatus.INCLUDE : MovieDayStatus.EXCLUDE);
      allowed_formats = resolveAllowedFormats(formats, savedDay.allowed_formats);
    } else if (user_status !== UserMovieStatus.ACTIVE) {
      status = MovieDayStatus.EXCLUDE;
    }

    const has_premium_format = formats.some((fmt) => isPremiumFormat(fmt));

    movies.push({
      ...m,
      all_formats: formats,
      allowed_formats,
      status,
      user_status,
      has_premium_format,
      rt_score: meta?.rt_score ?? m.rt_score,
      audience_score: meta?.audience_score ?? m.audience_score,
      imdb_rating: meta?.imdb_rating ?? m.imdb_rating,
      imdb_id: meta?.imdb_id ?? m.imdb_id,
      rated: normalizeMpaRating(m.rated) ?? normalizeMpaRating(meta?.rated) ?? null,
      genre: meta?.genre ?? m.genre,
      plot: meta?.plot ?? m.plot,
      poster_url: meta?.poster_url ?? m.poster_url,
    });
  }

  return { movies, total_showings };
}

export interface FetchShowtimesParams {
  theater_id: string;
  date_str: string;
  force_refresh?: boolean;
}

export async function getShowtimesService(
  params: FetchShowtimesParams
): Promise<ShowtimesResponse> {
  const providerId = 'amc';
  const { theater_id, date_str, force_refresh } = params;

  const theaterObj = theaters.find((t: any) => t.id === theater_id);
  let baseUrl = theaterObj?.showtimes_url;
  if (!baseUrl && theaterObj?.city_slug) {
    baseUrl = `https://www.amctheatres.com/movie-theatres/${theaterObj.city_slug}/${theater_id}/showtimes`;
  }

  if (!force_refresh) {
    const cachedShowtimes = await cacheRepo.getShowtimes(providerId, theater_id, date_str);
    if (cachedShowtimes && Array.isArray(cachedShowtimes.movies) && cachedShowtimes.movies.length > 0) {
      const enriched = await enrichMoviesWithPreferences(cachedShowtimes.movies, date_str);
      const cleanCachedBase = baseUrl ? baseUrl.split('?')[0] : undefined;
      return {
        theater_id: cachedShowtimes.theater_id || theater_id,
        theater_name: cachedShowtimes.theater_name || theaterObj?.name || 'AMC Theatre',
        date: cachedShowtimes.date || date_str,
        movies: enriched.movies,
        total_showings: enriched.total_showings,
        showtimes_url: cleanCachedBase ? `${cleanCachedBase}?date=${date_str}` : undefined,
      };
    }
  }

  if (!baseUrl) {
    throw new Error(
      `Unable to locate showtimes URL for theater "${theaterObj?.name || theater_id}". Theater catalog entry is missing showtimes URL and city.`
    );
  }

  const cleanBase = baseUrl.split('?')[0];
  const url = `${cleanBase}?date=${date_str}`;

  const res = await fetch(url, {
    headers: {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!res.ok) {
    throw new Error(`AMC returned HTTP ${res.status}`);
  }
  const html = await res.text();

  if (html.includes('Incapsula') || html.includes('distil_') || html.includes('captcha')) {
    throw new Error('AMC returned a bot challenge / block page');
  }

  await setupOffscreenDocument();
  const parseResult = await chrome.runtime.sendMessage({
    target: 'offscreen',
    action: 'PARSE_AMC_HTML',
    payload: { html },
  });

  if (!parseResult.success) {
    throw new Error(`Parsing failed: ${parseResult.error}`);
  }

  const rawMovies: MovieResponse[] = parseResult.movies || [];

  // Only persist non-empty schedules into IndexedDB so unposted future dates or temporary
  // site maintenance never permanently cache an empty array for a theater + date.
  if (rawMovies.length > 0) {
    const rawCacheData = {
      theater_id,
      theater_name: theaterObj?.name || 'AMC Theatre',
      date: date_str,
      movies: rawMovies,
    };
    await cacheRepo.saveShowtimes(providerId, theater_id, date_str, rawCacheData);
  }

  const enriched = await enrichMoviesWithPreferences(rawMovies, date_str);

  return {
    theater_id,
    theater_name: theaterObj?.name || 'AMC Theatre',
    date: date_str,
    movies: enriched.movies,
    total_showings: enriched.total_showings,
    showtimes_url: url,
  };
}
