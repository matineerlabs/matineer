import { cacheRepo } from '../db/repositories/cacheRepo';
import { normalizeMpaRating } from './movie';

export const META_LOG_PREFIX = '[Matineer:Meta]';

export function metaLog(...args: any[]) {
  console.log(META_LOG_PREFIX, ...args);
}

export function metaWarn(...args: any[]) {
  console.warn(META_LOG_PREFIX, ...args);
}

export interface MetadataFetchResult {
  title: string;
  matched_title?: string | null;
  year?: string | null;
  rt_score?: string | null;
  audience_score?: string | null;
  imdb_rating?: string | null;
  imdb_id?: string | null;
  rated?: string | null;
  genre?: string | null;
  plot?: string | null;
  poster_url?: string | null;
  rt_fetch_attempted?: boolean;
  rt_lookup_done?: boolean;
  imdb_fetch_attempted?: boolean;
  metadata_fetch_attempted?: boolean;
  cached_at?: number;
}

export interface ParsedMovieQuery {
  primaryQuery: string;
  fallbackQuery: string | null;
  inferredYear: number | null;
  isReRelease: boolean;
  isNonMovieEvent: boolean;
}

const NON_MOVIE_PATTERNS: RegExp[] = [
  // Mystery movies
  /\b(?:screen|scream)\s+unseen\b/i,
  /\bmystery\s+movie\b/i,
  /\bsecret\s+movie\b/i,
  // Live sports / PPV / combat
  /\b(?:ufc\s+\d+|wwe|aew|nfl|nba|mlb|nhl|wrestlemania|boxing|pay-per-view)\b/i,
  // Live broadcasts / opera / theater / drum corps
  /\b(?:the\s+met\s*:\s*live|metropolitan\s+opera|national\s+theatre\s+live|nt\s+live|bolshoi\s+ballet|royal\s+opera|drum\s+corps|dci\s*:)\b/i,
  // Compilations / marathons / rentals
  /\b(?:marathon|double\s+feature|triple\s+feature|trilogy|all-night|oscar\s+nominated\s+short\s+films|short\s+films\s*:|private\s+theatre\s+rental)\b/i,
];

const PRESENTER_PREFIX_REGEX =
  /^(?:studio\s+ghibli\s+fest(?:\s+\d{4})?|fathom\s+events?|big\s+screen\s+classics?|flashback\s+cinema|fan\s+faves?|thrills\s*(?:&|and)\s*chills|amc\s+artisan\s+films?|a24\s*x\s*imax\s+present[s]?)\s*[:\-–]\s*/i;

const RE_RELEASE_INDICATOR_REGEX =
  /\b(?:re-?release|big\s+screen\s+classics?|flashback\s+cinema|fan\s+faves?|studio\s+ghibli\s+fest|4k\s+restoration|restored|remastered|director'?s\s+cut|encore|throwback|classic\s+series)\b/i;

const PAREN_TAG_REGEX =
  /[\(\[][^)\]]*(?:early\s+access|screening|fan\s+event|anniv(?:ersary)?|preview|re-?release|imax|dolby|reald\s*3d|\b3d\b|laser|prime|\bxl\b|sensory\s+friendly|open\s+caption|\boc\b|spanish|en\s+español|subtitled|dubbed|edition|director'?s\s+cut|extended|remastered|4k\s+restoration|live\s+q&a|\bq&a\b|encore|bonus\s+content|\b\d{4}\b)[^)\]]*[\)\]]/gi;

const TRAILING_TAG_REGEX =
  /\s*[:\-–]\s*(?:studio\s+ghibli\s+fest(?:\s+\d{4})?|fathom\s+events?|big\s+screen\s+classics?|flashback\s+cinema|fan\s+faves?|re-?release|live\s+q&a|q&a|fan\s+event|early\s+access|anniversary|extended\s+cut|director'?s\s+cut|encore|bonus\s+content|an?\s+imax\s+experience|imax|dolby|reald\s*3d|3d|laser|xl|prime|\d{4})\s*$/gi;

export function parseAmcTitle(
  rawTitle: string,
  showingYear?: number,
  promoProgram?: string | null
): ParsedMovieQuery {
  const sYear = showingYear || new Date().getFullYear();

  // 1. Pre-Flight Non-Movie Event Detection
  const isNonMovieEvent =
    NON_MOVIE_PATTERNS.some((p) => p.test(rawTitle)) ||
    (Boolean(promoProgram) && NON_MOVIE_PATTERNS.some((p) => p.test(promoProgram!)));

  // 2. Year & Anniversary Extraction (before stripping)
  let inferredYear: number | null = null;
  let isReRelease = false;

  // Explicit year in parens/brackets, e.g. (1975) or [1984] (between 1920 and sYear - 1)
  const explicitYearMatch = rawTitle.match(/[\(\[]\s*(\d{4})\s*[\)\]]/);
  if (explicitYearMatch && explicitYearMatch[1]) {
    const parsedYear = parseInt(explicitYearMatch[1], 10);
    if (parsedYear >= 1920 && parsedYear <= sYear - 1) {
      inferredYear = parsedYear;
      isReRelease = true;
    }
  }

  // Anniversary pattern: e.g. 10th Anniversary, 25th Anniv
  const annivMatch = rawTitle.match(/\b(\d{1,3})\s*(?:st|nd|rd|th)\s+anniv(?:ersary)?\b/i);
  if (annivMatch && annivMatch[1]) {
    const yearsAgo = parseInt(annivMatch[1], 10);
    if (!isNaN(yearsAgo)) {
      inferredYear = sYear - yearsAgo;
      isReRelease = true;
    }
  }

  // Re-release / classic indicators
  if (
    RE_RELEASE_INDICATOR_REGEX.test(rawTitle) ||
    (promoProgram && RE_RELEASE_INDICATOR_REGEX.test(promoProgram))
  ) {
    isReRelease = true;
  }

  // 3. Title Stripping (primaryQuery & fallbackQuery)
  let cleaned = rawTitle.trim();

  // Strip presenter prefixes
  cleaned = cleaned.replace(PRESENTER_PREFIX_REGEX, '').trim();

  // Strip : an imax experience
  cleaned = cleaned.replace(/\s*:\s*(?:an?\s+)?imax\s+experience/gi, '').trim();

  // Strip parenthetical/bracketed format & event tags
  cleaned = cleaned.replace(PAREN_TAG_REGEX, ' ').trim();

  // Strip anniversary pattern outside parens if still present
  cleaned = cleaned.replace(/\b\d{1,3}\s*(?:st|nd|rd|th)\s+anniv(?:ersary)?\b/gi, ' ').trim();

  // Strip trailing dash/colon tags
  cleaned = cleaned.replace(TRAILING_TAG_REGEX, ' ').trim();

  // Clean empty brackets and normalize spaces
  cleaned = cleaned.replace(/[\(\[]\s*[\)\]]/g, ' ').replace(/\s+/g, ' ').trim();

  const primaryQuery = cleaned;
  let fallbackQuery: string | null = null;

  if (primaryQuery.includes(' - ')) {
    const dashIdx = primaryQuery.indexOf(' - ');
    const part1 = primaryQuery.substring(0, dashIdx).trim();
    const part2 = primaryQuery.substring(dashIdx + 3).trim();
    if (part1.length >= 3 && part2.length >= 3) {
      fallbackQuery = part1;
    }
  } else if (primaryQuery.includes(':')) {
    const colonIdx = primaryQuery.indexOf(':');
    const part1 = primaryQuery.substring(0, colonIdx).trim();
    const part2 = primaryQuery.substring(colonIdx + 1).trim();
    if (part1.length >= 3 && part2.length >= 3) {
      if (/\b(?:presents?|fest|classics?|cinema|event|series)\b/i.test(part1)) {
        fallbackQuery = part2;
      } else {
        fallbackQuery = part1;
      }
    }
  }

  if (fallbackQuery === primaryQuery) {
    fallbackQuery = null;
  }

  metaLog(
    `[Parse] "${rawTitle}" -> primaryQuery: "${primaryQuery}", fallbackQuery: ${fallbackQuery ? `"${fallbackQuery}"` : 'none'}, inferredYear: ${inferredYear ?? 'none'}, isReRelease: ${isReRelease}, isNonMovieEvent: ${isNonMovieEvent}`
  );

  return {
    primaryQuery,
    fallbackQuery,
    inferredYear,
    isReRelease,
    isNonMovieEvent,
  };
}

export function cleanTitleVariants(title: string): string[] {
  const parsed = parseAmcTitle(title);
  return [parsed.primaryQuery, ...(parsed.fallbackQuery ? [parsed.fallbackQuery] : [])];
}

export interface CandidateScoreBreakdown {
  total: number;
  titleScore: number;
  yearScore: number;
  bonusScore: number;
  rejectedReason: string | null;
}

export function scoreMdblistCandidateDetailed(
  candidate: any,
  query: string,
  parsed: ParsedMovieQuery,
  showingYear: number
): CandidateScoreBreakdown {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const stripArticle = (s: string) => s.replace(/^(?:the|a|an)\s+/i, '').trim();

  const candTitle = String(candidate?.title || candidate?.name || '').trim();
  const normCand = normalize(candTitle);
  const normQuery = normalize(query);

  let titleScore = 0;
  const isExactTitle = normCand === normQuery;
  const isArticleExact = !isExactTitle && stripArticle(normCand) === stripArticle(normQuery);

  if (isExactTitle) {
    titleScore = 30;
  } else if (isArticleExact) {
    titleScore = 28;
  } else {
    // Check prefix match before colon
    const candLower = candTitle.toLowerCase();
    const queryLower = query.toLowerCase();
    const isPrefixBeforeColon =
      (candLower.startsWith(queryLower + ':') || queryLower.startsWith(candLower + ':')) &&
      candTitle.length >= 4;

    if (isPrefixBeforeColon) {
      titleScore = 18;
    } else {
      // Guard against short-word false positives
      if (normCand.length < 3 || normQuery.length < 3) {
        return {
          total: -999,
          titleScore: 0,
          yearScore: 0,
          bonusScore: 0,
          rejectedReason: 'Title length < 3 chars',
        };
      }

      const candTokens = normCand.split(' ').filter(Boolean);
      const queryTokens = normQuery.split(' ').filter(Boolean);
      const shorterTokens = candTokens.length <= queryTokens.length ? candTokens : queryTokens;
      const longerTokens = candTokens.length > queryTokens.length ? candTokens : queryTokens;
      const commonTokens = shorterTokens.filter((t) => longerTokens.includes(t));

      const tokenOverlap = longerTokens.length > 0 ? commonTokens.length / longerTokens.length : 0;
      const shorterLen = Math.min(normCand.length, normQuery.length);
      const longerLen = Math.max(normCand.length, normQuery.length);
      const charCoverage = longerLen > 0 ? shorterLen / longerLen : 0;
      const isSubstring = normCand.includes(normQuery) || normQuery.includes(normCand);

      if ((isSubstring && (tokenOverlap >= 0.6 || charCoverage >= 0.6)) || tokenOverlap >= 0.6) {
        titleScore = 18;
      } else {
        return {
          total: -999,
          titleScore: 0,
          yearScore: 0,
          bonusScore: 0,
          rejectedReason: `Low token overlap (${Math.round(tokenOverlap * 100)}%) and not qualifying substring`,
        };
      }
    }
  }

  // Era / Year alignment
  let yearScore = 0;
  const cYear = Number(candidate?.year) || null;

  if (parsed.inferredYear !== null) {
    if (cYear === parsed.inferredYear) {
      yearScore = 25;
    } else if (cYear !== null && Math.abs(cYear - parsed.inferredYear) === 1) {
      yearScore = 18;
    } else if (cYear !== null && Math.abs(cYear - parsed.inferredYear) === 2) {
      yearScore = 8;
    } else if (cYear !== null && Math.abs(cYear - parsed.inferredYear) > 2) {
      yearScore = -20;
    }
  } else if (parsed.isReRelease) {
    if (cYear !== null && cYear <= showingYear) {
      yearScore = 10;
    }
  } else {
    // Standard current theatrical release
    if (cYear === showingYear) {
      yearScore = 20;
    } else if (cYear === showingYear - 1) {
      yearScore = 15;
    } else if (cYear === showingYear + 1) {
      yearScore = 10;
    } else if (cYear !== null && Math.abs(cYear - showingYear) === 2) {
      yearScore = 2;
    } else if (cYear !== null && cYear < showingYear - 2) {
      // For exact title matches, soften the penalty to -5 so delayed theatrical releases
      // or indie films from 2-3 years ago still clear the >= 25 threshold.
      yearScore = isExactTitle || isArticleExact ? -5 : -15;
    }
  }

  // Established entry bonus
  let bonusScore = 0;
  const hasImdb = Boolean(candidate?.imdbid || candidate?.ids?.imdb);
  const hasScore = Number(candidate?.score) > 0 || Number(candidate?.score_average) > 0;
  if (hasImdb && hasScore) {
    bonusScore = 5;
  }

  return {
    total: titleScore + yearScore + bonusScore,
    titleScore,
    yearScore,
    bonusScore,
    rejectedReason: null,
  };
}

export function scoreMdblistCandidate(
  candidate: any,
  query: string,
  parsed: ParsedMovieQuery,
  showingYear: number
): number {
  return scoreMdblistCandidateDetailed(candidate, query, parsed, showingYear).total;
}

export async function fetchMetadataSingle(
  title: string,
  runtimeMin: number | null,
  targetYear: number | null,
  mdblistApiKey: string | null,
  promoProgram?: string | null
): Promise<MetadataFetchResult> {
  const sYear = targetYear || new Date().getFullYear();
  const parsed = parseAmcTitle(title, sYear, promoProgram);
  const key = (mdblistApiKey || '').trim();

  metaLog(
    `[Fetch] Resolving "${title}" (runtime: ${runtimeMin ?? 'unknown'}m, showingYear: ${sYear}, hasKey: ${Boolean(key)})`
  );

  // If no API key or if non-movie event, return default result
  if (!key || parsed.isNonMovieEvent) {
    const wasAttempted = Boolean(key || parsed.isNonMovieEvent);
    metaLog(
      `[Fetch] Skipped outbound search for "${title}" (${!key ? 'no MDBList API key configured' : 'identified as non-movie event'})`
    );
    return {
      title,
      matched_title: null,
      year: String(parsed.inferredYear || sYear),
      rt_score: null,
      audience_score: null,
      imdb_rating: null,
      imdb_id: null,
      rated: null,
      genre: null,
      plot: null,
      poster_url: null,
      rt_fetch_attempted: wasAttempted,
      rt_lookup_done: wasAttempted,
      imdb_fetch_attempted: wasAttempted,
      metadata_fetch_attempted: wasAttempted,
      cached_at: Date.now(),
    };
  }

  async function searchMdblist(q: string): Promise<any[]> {
    try {
      metaLog(`[Search] Querying MDBList for "${q}"...`);
      const url = `https://api.mdblist.com/search/movie?query=${encodeURIComponent(q)}&apikey=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) {
        metaWarn(`[Search] MDBList HTTP ${res.status}: ${res.statusText} for query "${q}"`);
        return [];
      }
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.search)) return data.search;
      if (data && Array.isArray(data.results)) return data.results;
      if (data?.error) {
        metaWarn(`[Search] MDBList API returned error for query "${q}": ${data.error}`);
      }
      return [];
    } catch (err: any) {
      metaWarn(`[Search] Network/parse error querying MDBList for "${q}":`, err?.message || err);
      return [];
    }
  }

  let candidates = await searchMdblist(parsed.primaryQuery);
  metaLog(
    `[Search] MDBList returned ${candidates.length} candidate(s) for primary query "${parsed.primaryQuery}"`
  );

  let bestCand: any = null;
  let bestScore = -999;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const breakdown = scoreMdblistCandidateDetailed(c, parsed.primaryQuery, parsed, sYear);
    const cTitle = c.title || c.name || '';
    const cYear = c.year ?? 'N/A';
    const cImdb =
      c.ids?.imdb ||
      c.imdbid ||
      c.imdb_id ||
      (typeof c.imdb === 'string' && c.imdb.startsWith('tt') ? c.imdb : null) ||
      'none';
    const cTmdb = c.ids?.tmdb || c.tmdbid || c.tmdb_id || c.tmdb || 'none';
    const cMdblist =
      c.ids?.mdblist ||
      c.mdblist_id ||
      (c.id !== undefined && c.id !== null ? String(c.id) : null) ||
      (typeof c.slug === 'string' ? c.slug.split('-')[0] : null) ||
      'none';
    metaLog(
      `[Search]   Candidate #${i + 1}: "${cTitle}" (${cYear}) [IMDb: ${cImdb}, TMDb: ${cTmdb}, MDB: ${cMdblist}, MDB Score: ${c.score ?? 'N/A'}] -> Score: ${breakdown.total} (title: +${breakdown.titleScore}, year: ${breakdown.yearScore >= 0 ? '+' : ''}${breakdown.yearScore}, bonus: +${breakdown.bonusScore})${breakdown.rejectedReason ? ` [REJECTED: ${breakdown.rejectedReason}]` : breakdown.total >= 25 ? ' [PASS]' : ' [BELOW THRESHOLD (25)]'}`
    );

    if (breakdown.total > bestScore) {
      bestScore = breakdown.total;
      bestCand = c;
    }
  }

  // If best score < 25 and parsed.fallbackQuery exists, run 1 fallback search
  if (bestScore < 25 && parsed.fallbackQuery) {
    metaLog(
      `[Fallback] Best primary candidate score was ${bestScore} (< 25). Running fallback search for "${parsed.fallbackQuery}"...`
    );
    const fallbackCandidates = await searchMdblist(parsed.fallbackQuery);
    metaLog(
      `[Fallback] MDBList returned ${fallbackCandidates.length} candidate(s) for fallback query "${parsed.fallbackQuery}"`
    );

    for (let i = 0; i < fallbackCandidates.length; i++) {
      const c = fallbackCandidates[i];
      const breakdown = scoreMdblistCandidateDetailed(c, parsed.fallbackQuery, parsed, sYear);
      const cTitle = c.title || c.name || '';
      const cYear = c.year ?? 'N/A';
      const cImdb =
        c.ids?.imdb ||
        c.imdbid ||
        c.imdb_id ||
        (typeof c.imdb === 'string' && c.imdb.startsWith('tt') ? c.imdb : null) ||
        'none';
      const cTmdb = c.ids?.tmdb || c.tmdbid || c.tmdb_id || c.tmdb || 'none';
      const cMdblist =
        c.ids?.mdblist ||
        c.mdblist_id ||
        (c.id !== undefined && c.id !== null ? String(c.id) : null) ||
        (typeof c.slug === 'string' ? c.slug.split('-')[0] : null) ||
        'none';
      metaLog(
        `[Fallback]   Candidate #${i + 1}: "${cTitle}" (${cYear}) [IMDb: ${cImdb}, TMDb: ${cTmdb}, MDB: ${cMdblist}] -> Score: ${breakdown.total} (title: +${breakdown.titleScore}, year: ${breakdown.yearScore >= 0 ? '+' : ''}${breakdown.yearScore}, bonus: +${breakdown.bonusScore})${breakdown.rejectedReason ? ` [REJECTED: ${breakdown.rejectedReason}]` : breakdown.total >= 25 ? ' [PASS]' : ' [BELOW THRESHOLD (25)]'}`
      );

      if (breakdown.total > bestScore) {
        bestScore = breakdown.total;
        bestCand = c;
      }
    }
  }

  if (bestScore >= 25 && bestCand) {
    metaLog(`[Selection] Candidate raw payload:`, JSON.stringify(bestCand));

    const imdbId =
      bestCand.ids?.imdb ||
      bestCand.imdbid ||
      bestCand.imdb_id ||
      (typeof bestCand.imdb === 'string' && bestCand.imdb.startsWith('tt') ? bestCand.imdb : null);

    const tmdbId =
      bestCand.ids?.tmdb ||
      bestCand.tmdbid ||
      bestCand.tmdb_id ||
      bestCand.tmdb;

    const traktId =
      bestCand.ids?.trakt ||
      bestCand.traktid ||
      bestCand.trakt_id ||
      bestCand.trakt;

    const mdblistId =
      bestCand.ids?.mdblist ||
      bestCand.mdblist_id ||
      (bestCand.id !== undefined && bestCand.id !== null ? String(bestCand.id) : null) ||
      (typeof bestCand.slug === 'string' ? bestCand.slug.split('-')[0] : null);

    let detailUrl = '';
    if (imdbId) {
      detailUrl = `https://api.mdblist.com/imdb/movie/${encodeURIComponent(imdbId)}?apikey=${encodeURIComponent(key)}`;
    } else if (tmdbId) {
      detailUrl = `https://api.mdblist.com/tmdb/movie/${encodeURIComponent(String(tmdbId))}?apikey=${encodeURIComponent(key)}`;
    } else if (traktId) {
      detailUrl = `https://api.mdblist.com/trakt/movie/${encodeURIComponent(String(traktId))}?apikey=${encodeURIComponent(key)}`;
    } else if (mdblistId) {
      detailUrl = `https://api.mdblist.com/mdblist/movie/${encodeURIComponent(String(mdblistId))}?apikey=${encodeURIComponent(key)}`;
    }

    metaLog(
      `[Selection] Selected candidate for "${title}": "${bestCand.title || bestCand.name}" (${bestCand.year ?? 'N/A'}) with score ${bestScore} (IMDb: ${imdbId || 'none'}, TMDb: ${tmdbId || 'none'}, MDB ID: ${mdblistId || 'none'}). Detail URL: ${detailUrl ? detailUrl.replace(/apikey=[^&]+/, 'apikey=***') : 'none'}`
    );

    let detail: any = null;
    if (detailUrl) {
      try {
        const dRes = await fetch(detailUrl);
        if (!dRes.ok) {
          metaWarn(
            `[Detail] MDBList HTTP error ${dRes.status} for detail URL: ${detailUrl.replace(/apikey=[^&]+/, 'apikey=***')}`
          );
        } else {
          detail = await dRes.json();
          metaLog(
            `[Detail] Received detail payload for "${bestCand.title || bestCand.name}": runtime=${detail.runtime ?? 'N/A'}m, ratings=${JSON.stringify(detail.ratings?.map((r: any) => `${r.source || r.name}: ${r.value}`) || [])}`
          );
        }
      } catch (e: any) {
        metaWarn(`[Detail] Error fetching MDBList detail for "${title}":`, e?.message || e);
      }
    }

    // Use fetched detail if available, or fall back to candidate data from search response
    const data = detail || bestCand;

    if (data) {
      // Runtime Sanity Guard:
      // If runtimeMin && runtimeMin !== 105 && data.runtime && data.runtime > 0:
      // If title match was NOT exact and !parsed.isReRelease and Math.abs(runtimeMin - data.runtime) > 35,
      // reject match.
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      const normCand = normalize(bestCand.title || bestCand.name || '');
      const normQuery = normalize(parsed.primaryQuery);
      const isExactTitle = normCand === normQuery;

      const detailRuntime = Number(data.runtime) || 0;
      const shouldRejectRuntime =
        Boolean(runtimeMin && runtimeMin !== 105 && detailRuntime > 0) &&
        !isExactTitle &&
        !parsed.isReRelease &&
        Math.abs(runtimeMin! - detailRuntime) > 35;

      if (shouldRejectRuntime) {
        metaWarn(
          `[Detail] REJECTED candidate by runtime sanity guard for "${title}": AMC runtime (${runtimeMin}m) differs from MDB runtime (${detailRuntime}m) by > 35m on non-exact match`
        );
      } else {
        metaLog(
          `[Detail] Runtime guard passed (AMC: ${runtimeMin ?? 'N/A'}m vs MDB: ${detailRuntime ?? 'N/A'}m)`
        );

        let rt_score: string | null = null;
        let audience_score: string | null = null;
        let imdb_rating: string | null = null;

        const ratingsList = Array.isArray(data.ratings) ? data.ratings : [];
        for (const r of ratingsList) {
          const src = String(r.source || r.name || '').toLowerCase().replace(/[^a-z]/g, '');
          const val = r.value !== null && r.value !== undefined && r.value !== '' ? r.value : r.score;
          if (val === null || val === undefined || val === '') continue;

          if (src === 'tomatoes' || src === 'rottentomatoes' || src === 'rt') {
            const cleanVal = Number(String(val).replace('%', ''));
            if (!isNaN(cleanVal)) rt_score = `${Math.round(cleanVal)}%`;
          } else if (
            src === 'popcorn' ||
            src === 'tomatoesaudience' ||
            src === 'audience' ||
            src === 'rtaudience'
          ) {
            const cleanVal = Number(String(val).replace('%', ''));
            if (!isNaN(cleanVal)) audience_score = `${Math.round(cleanVal)}%`;
          } else if (src === 'imdb') {
            imdb_rating = String(r.value !== null && r.value !== undefined && r.value !== '' ? r.value : val);
          }
        }

        let genre: string | null = null;
        if (Array.isArray(data.genres)) {
          genre =
            data.genres
              .map((g: any) => (typeof g === 'string' ? g : g?.title || g?.name))
              .filter(Boolean)
              .join(', ') || null;
        } else if (typeof data.genre === 'string') {
          genre = data.genre || null;
        }

        const resolvedImdbId =
          data.ids?.imdb ||
          data.imdbid ||
          data.imdb_id ||
          imdbId ||
          null;

        const result: MetadataFetchResult = {
          title,
          matched_title: data.title || bestCand.title || title,
          year: String(data.year || bestCand.year || sYear),
          rt_score,
          audience_score,
          imdb_rating,
          imdb_id: resolvedImdbId,
          rated: normalizeMpaRating(data.certification),
          genre,
          plot: data.description || null,
          poster_url: data.poster || bestCand.poster || null,
          rt_fetch_attempted: true,
          rt_lookup_done: true,
          imdb_fetch_attempted: true,
          metadata_fetch_attempted: true,
          cached_at: Date.now(),
        };

        metaLog(
          `[Result] Successfully enriched "${title}": RT Critics: ${rt_score ?? 'N/A'}, RT Audience: ${audience_score ?? 'N/A'}, IMDb: ${imdb_rating ?? 'N/A'} (id: ${result.imdb_id ?? 'none'}), Rated: ${result.rated ?? 'N/A'}`
        );

        return result;
      }
    }
  } else {
    metaLog(
      `[Selection] No candidate reached the >= 25 score threshold for "${title}". Best candidate was "${bestCand?.title || bestCand?.name || 'none'}" with score ${bestScore}. Skipping detail fetch.`
    );
  }

  // Fallback / default when not matched or rejected
  return {
    title,
    matched_title: null,
    year: String(parsed.inferredYear || sYear),
    rt_score: null,
    audience_score: null,
    imdb_rating: null,
    imdb_id: null,
    rated: null,
    genre: null,
    plot: null,
    poster_url: null,
    rt_fetch_attempted: true,
    rt_lookup_done: true,
    imdb_fetch_attempted: true,
    metadata_fetch_attempted: true,
    cached_at: Date.now(),
  };
}

export async function enrichCachedImdb(
  title: string,
  apiKey: string,
  cachedMeta: MetadataFetchResult,
  targetYear: number | null
): Promise<string | null> {
  if (!apiKey || !apiKey.trim()) return null;
  const res = await fetchMetadataSingle(title, null, targetYear, apiKey);
  if (res.imdb_rating) {
    cachedMeta.imdb_rating = res.imdb_rating;
  }
  cachedMeta.imdb_fetch_attempted = true;
  await cacheRepo.saveMovieMetadata(title, cachedMeta);
  return res.imdb_rating ?? null;
}
