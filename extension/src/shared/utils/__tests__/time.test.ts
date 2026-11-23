import { describe, it, expect } from 'vitest';
import { parseRuntimeStr, getAvailableDates } from '../time';

describe('parseRuntimeStr', () => {
  it('parses runtime strings', () => {
    expect(parseRuntimeStr('1 HR 43 MIN')).toBe(103);
    expect(parseRuntimeStr('2h')).toBe(120);
    expect(parseRuntimeStr('45m')).toBe(45);
    expect(parseRuntimeStr('1h45m')).toBe(105);
    expect(parseRuntimeStr('120')).toBe(120);
  });
});

describe('getAvailableDates', () => {
  it('generates 8 available dates by default with Today as first element', () => {
    const dates = getAvailableDates();
    expect(dates).toHaveLength(8);
    expect(dates[0]!.display_label).toBe('Today');
    expect(dates[0]!.date_str).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('generates arbitrary window size if requested', () => {
    const dates = getAvailableDates(14);
    expect(dates).toHaveLength(14);
    expect(dates[0]!.display_label).toBe('Today');
    expect(dates[13]!.date_str).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
