/**
 * Centralized Domain Enums and Types for Movies, Preferences, Formats, and Timelines.
 * Uses the `as const` object + derived union idiom for type safety, runtime iteration,
 * and zero-overhead JSON serialization.
 */

// --- Movie Day Selection Status ---
export const MovieDayStatus = {
  MUST_SEE: 'must_see',
  INCLUDE: 'include',
  EXCLUDE: 'exclude',
} as const;

export type MovieDayStatus = (typeof MovieDayStatus)[keyof typeof MovieDayStatus];

export const MOVIE_DAY_STATUS_LABELS: Record<MovieDayStatus, string> = {
  [MovieDayStatus.MUST_SEE]: 'Must See',
  [MovieDayStatus.INCLUDE]: 'Include',
  [MovieDayStatus.EXCLUDE]: 'Exclude',
};

// --- User Global Movie Status ---
export const UserMovieStatus = {
  ACTIVE: 'active',
  SEEN: 'seen',
  WONT_WATCH: 'wont_watch',
} as const;

export type UserMovieStatus = (typeof UserMovieStatus)[keyof typeof UserMovieStatus];

export const USER_MOVIE_STATUS_LABELS: Record<UserMovieStatus, string> = {
  [UserMovieStatus.ACTIVE]: 'Active',
  [UserMovieStatus.SEEN]: 'Watched',
  [UserMovieStatus.WONT_WATCH]: "Won't Watch",
};

// --- Timeline Itinerary Item Types ---
export const TimelineItemType = {
  MOVIE: 'movie',
  BREAK: 'break',
  GAP: 'gap',
  FAST_CONNECTION: 'fast_connection',
} as const;

export type TimelineItemType = (typeof TimelineItemType)[keyof typeof TimelineItemType];

// --- Format Classification ---
export {
  FormatTier,
  PREMIUM_FORMAT_REGEX,
  ACCESSIBILITY_FORMAT_REGEX,
  SPECIAL_NON_PREMIUM_PATTERNS,
  isNonPremiumSpecialFormat,
  isAccessibilityFormat,
  isPremiumFormat,
  getFormatTier,
  formatComparator,
} from './formats';
