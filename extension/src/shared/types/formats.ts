/**
 * Domain types, constants, and utilities for movie showing formats.
 */

export const FormatTier = {
  PREMIUM: 'premium',
  STANDARD: 'standard',
  ACCESSIBILITY: 'accessibility',
} as const;

export type FormatTier = (typeof FormatTier)[keyof typeof FormatTier];

export const PREMIUM_FORMAT_REGEX = /dolby|imax|prime|4dx|screenx|\bxl\b/i;
export const ACCESSIBILITY_FORMAT_REGEX = /open caption|closed caption|audio described|sensory/i;

export const SPECIAL_NON_PREMIUM_PATTERNS: readonly RegExp[] = [
  /fan faves/i,
  /sensory friendly/i,
  /.*spoken with english subtitles.*/i,
  /.*with english subtitles.*/i,
  /open caption/i,
] as const;

/**
 * Normalizes a format string for case-insensitive matching, treating empty or
 * literal "undefined" values as "digital".
 */
export function normalizeFormatName(formatName?: string | null): string {
  const trimmed = formatName?.trim() || '';
  if (!trimmed || trimmed.toLowerCase() === 'undefined') {
    return 'digital';
  }
  return trimmed.toLowerCase();
}

/**
 * Intersects available formats with saved format preferences, falling back to
 * all available formats when no saved preferences exist or the overlap is empty.
 */
export function resolveAllowedFormats(
  availableFormats: string[],
  savedFormats?: string[] | null
): string[] {
  if (!savedFormats || savedFormats.length === 0) {
    return availableFormats;
  }
  const savedSet = new Set(savedFormats.map(normalizeFormatName));
  const intersected = availableFormats.filter((f) => savedSet.has(normalizeFormatName(f)));
  return intersected.length > 0 ? intersected : availableFormats;
}

/**
 * Checks if a format name represents a special or accessibility showing
 * that should not be classified as a premium experience.
 */
export function isNonPremiumSpecialFormat(formatName?: string | null): boolean {
  if (!formatName) return false;
  const cleaned = formatName.trim();
  return SPECIAL_NON_PREMIUM_PATTERNS.some((p) => p.test(cleaned));
}

/**
 * Checks if a format name represents an accessibility showing (e.g. Open/Closed Caption, Audio Described, Sensory Friendly).
 */
export function isAccessibilityFormat(formatName?: string | null): boolean {
  if (!formatName) return false;
  return ACCESSIBILITY_FORMAT_REGEX.test(formatName.trim());
}

/**
 * Checks if a format name represents a premium experience (e.g. IMAX, Dolby, Prime, 4DX, ScreenX).
 * Returns false if the format is explicitly a non-premium special format.
 */
export function isPremiumFormat(formatName?: string | null): boolean {
  if (!formatName || formatName.toLowerCase() === 'undefined' || isNonPremiumSpecialFormat(formatName)) {
    return false;
  }
  return PREMIUM_FORMAT_REGEX.test(formatName.trim());
}

/**
 * Categorizes a format into its respective FormatTier.
 */
export function getFormatTier(formatName?: string | null): FormatTier {
  if (!formatName || formatName.toLowerCase() === 'undefined') {
    return FormatTier.STANDARD;
  }
  if (isAccessibilityFormat(formatName)) {
    return FormatTier.ACCESSIBILITY;
  }
  if (isPremiumFormat(formatName)) {
    return FormatTier.PREMIUM;
  }
  return FormatTier.STANDARD;
}

/**
 * Comparator function to sort formats in UI display:
 * Premium formats come first, followed by alphabetical ordering for other formats.
 */
export function formatComparator(a: string, b: string): number {
  const isPremA = isPremiumFormat(a);
  const isPremB = isPremiumFormat(b);
  if (isPremA && !isPremB) return -1;
  if (!isPremA && isPremB) return 1;
  return a.localeCompare(b);
}
