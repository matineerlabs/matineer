import { describe, it, expect } from 'vitest';
import { normalizeMovieKey, normalizeMpaRating } from '../movie';

describe('normalizeMpaRating', () => {
  it('accepts standard US MPA ratings', () => {
    expect(normalizeMpaRating('G')).toBe('G');
    expect(normalizeMpaRating('PG')).toBe('PG');
    expect(normalizeMpaRating('PG-13')).toBe('PG-13');
    expect(normalizeMpaRating('pg-13')).toBe('PG-13');
    expect(normalizeMpaRating('PG13')).toBe('PG-13');
    expect(normalizeMpaRating('pg13')).toBe('PG-13');
    expect(normalizeMpaRating('PG 13')).toBe('PG-13');
    expect(normalizeMpaRating('R')).toBe('R');
    expect(normalizeMpaRating('NC-17')).toBe('NC-17');
    expect(normalizeMpaRating('NC17')).toBe('NC-17');
    expect(normalizeMpaRating('NR')).toBe('NR');
  });

  it('normalizes UR to NR', () => {
    expect(normalizeMpaRating('UR')).toBe('NR');
    expect(normalizeMpaRating('Rated UR')).toBe('NR');
  });

  it('extracts embedded MPA ratings', () => {
    expect(normalizeMpaRating('Rated PG-13')).toBe('PG-13');
    expect(normalizeMpaRating('Rated PG13')).toBe('PG-13');
    expect(normalizeMpaRating('US:PG13')).toBe('PG-13');
    expect(normalizeMpaRating('PG13 (for thematic content)')).toBe('PG-13');
    expect(normalizeMpaRating('US: R')).toBe('R');
    expect(normalizeMpaRating('MPA: PG')).toBe('PG');
  });

  it('rejects international and TV ratings', () => {
    expect(normalizeMpaRating('MA 15+')).toBeNull();
    expect(normalizeMpaRating('13+')).toBeNull();
    expect(normalizeMpaRating('M')).toBeNull();
    expect(normalizeMpaRating('ALL')).toBeNull();
    expect(normalizeMpaRating('12A')).toBeNull();
    expect(normalizeMpaRating('18')).toBeNull();
    expect(normalizeMpaRating('TV-MA')).toBeNull();
    expect(normalizeMpaRating('TV-14')).toBeNull();
    expect(normalizeMpaRating(null)).toBeNull();
    expect(normalizeMpaRating(undefined)).toBeNull();
    expect(normalizeMpaRating('')).toBeNull();
  });
});

describe('normalizeMovieKey', () => {
  it('normalizes simple titles', () => {
    expect(normalizeMovieKey('Dune: Part Two')).toBe('dune part two');
  });

  it('strips IMAX', () => {
    expect(normalizeMovieKey('Dune: Part Two The IMAX Experience')).toBe('dune part two');
    expect(normalizeMovieKey('Dune: Part Two IMAX')).toBe('dune part two');
  });

  it('strips Dolby', () => {
    expect(normalizeMovieKey('Dune: Part Two in Dolby Cinema')).toBe('dune part two');
    expect(normalizeMovieKey('Dune: Part Two - Dolby')).toBe('dune part two');
  });
});
