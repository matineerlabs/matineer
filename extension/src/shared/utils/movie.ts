export {
  isNonPremiumSpecialFormat,
  isPremiumFormat,
  getFormatTier,
  formatComparator,
} from '../types/formats';

export const MPA_RATING_TOKEN_PATTERN = 'PG[-\\s]*13|NC[-\\s]*17|PG|G|R|NR|UR';

const VALID_MPA_RATINGS = new Set(['G', 'PG', 'PG-13', 'R', 'NC-17', 'NR']);

function canonicalizeMpaToken(token: string): string {
  if (/^PG[-\s]*13$/.test(token)) return 'PG-13';
  if (/^NC[-\s]*17$/.test(token)) return 'NC-17';
  if (token === 'UR') return 'NR';
  return token;
}

export function normalizeMpaRating(rawRating: string | null | undefined): string | null {
  if (!rawRating) return null;
  const trimmed = rawRating.trim().toUpperCase();

  if (VALID_MPA_RATINGS.has(trimmed)) {
    return trimmed;
  }

  // Treat 'UR' (Unrated) as 'NR' (Not Rated)
  if (trimmed === 'UR') {
    return 'NR';
  }

  // Check if string contains a standard MPA rating prefix/token
  // e.g. "PG13", "PG 13", "Rated PG-13", "US:PG-13", "MPA: R", "PG-13 (for thematic content)"
  const m = trimmed.match(
    new RegExp(`\\b(?:RATED|US|MPAA?|CERTIFICATION)?[:\\s-]*(${MPA_RATING_TOKEN_PATTERN})\\b`)
  );
  if (m && m[1]) {
    return canonicalizeMpaToken(m[1]);
  }

  // Reject all non-MPA / international / TV ratings (e.g. "MA 15+", "13+", "M", "ALL", "12A", "18", "TV-MA", "TV-14")
  return null;
}

export function normalizeMovieKey(title: string): string {
  if (!title) return '';
  let t = title.trim().toLowerCase();

  const patterns = [
    /[:\-\s]+(?:the\s+|an?\s+)?imax(?:\s+(?:3d|with\s+laser|70mm|experience|\d+mm))*(?:\s+experience)?/gi,
    /[:\-\s]+(?:in\s+)?dolby(?:\s+cinema)?(?:\s+at\s+amc)?/gi,
    /[:\-\s]+(?:reald\s+|disney\s+digital\s+)?3d\b/gi,
    /[:\-\s]+(?:laser\s+at\s+amc|at\s+amc|prime\s+at\s+amc|xl\s+at\s+amc)/gi,
    /[\(\[\{]\s*(?:open\s+caption(?:ed|ing)?|oc|spanish(?:\s+subtitles|\s+dubbed)?|en\s+español|sensory\s+friendly)\s*[\)\]\}]/gi,
    /[:\-\s]+(?:open\s+caption(?:ed|ing)?|sensory\s+friendly)/gi,
    /[\(\[\{]\s*(?:imax|dolby|3d|laser|4dx|screenx|d-box|xl)\s*[\)\]\}]/gi,
    /\s*\(.*?\b(?:3d|imax|dolby|caption|subtitled|version|experience)\b.*?\)/gi,
    /[:\-\s]+(?:an?\s+)?imax\s+experience/gi,
  ];

  for (const pat of patterns) {
    t = t.replace(pat, '');
  }

  t = t.replace(/[^\w\s]/g, '');
  t = t.replace(/\s+/g, ' ').trim();

  return t || title.trim().toLowerCase();
}
