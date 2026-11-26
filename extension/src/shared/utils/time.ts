import type { DateOptionResponse } from '../types/schemas';

export function parseTimeStr(timeStr: string): number {
  if (!timeStr) return 0;
  let cleaned = timeStr.replace(/\(.*?\)/g, '');
  cleaned = cleaned.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, '');

  const match12 = cleaned.match(/^(\d{1,2}):(\d{2})([ap]m)$/);
  if (match12 && match12[1] && match12[2]) {
    let hour = parseInt(match12[1], 10);
    const minute = parseInt(match12[2], 10);
    const period = match12[3];
    if (period === 'pm' && hour !== 12) {
      hour += 12;
    } else if (period === 'am' && hour === 12) {
      hour = 0;
    }
    return hour * 60 + minute;
  }

  const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (match24 && match24[1] && match24[2]) {
    const hour = parseInt(match24[1], 10);
    const minute = parseInt(match24[2], 10);
    return hour * 60 + minute;
  }

  return 0;
}

export function parseMarathonTime(timeStr: string): number {
  if (!timeStr) return 0;
  const mins = parseTimeStr(timeStr);
  if (mins < 360) {
    return mins + 1440;
  }
  return mins;
}

// Aliases for backwards compatibility with UI components
export const parseTimeToMinutes = parseTimeStr;
export const parseMarathonDayMinutes = parseMarathonTime;

export function minutesToTimeStr(minutes: number, includePeriod: boolean = true): string {
  const normMins = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normMins / 60);
  const mins = normMins % 60;
  const period = hours < 12 ? 'am' : 'pm';
  let displayHour = hours % 12;
  if (displayHour === 0) {
    displayHour = 12;
  }
  const minStr = mins.toString().padStart(2, '0');
  return `${displayHour}:${minStr}${includePeriod ? period : ''}`;
}

// Alias for UI component usage
export const minutesToTimeString = minutesToTimeStr;

/**
 * Formats a YYYY-MM-DD date string into a friendly human-readable format like "October 10".
 */
export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-').map(Number);
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    if (y !== undefined && m !== undefined && d !== undefined && !isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/**
 * Formats a Date object as YYYY-MM-DD in the local timezone.
 */
export function formatLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates rolling available date options for the UI date picker.
 */
export function getAvailableDates(numDays: number = 8, baseDate: Date = new Date()): DateOptionResponse[] {
  const dates: DateOptionResponse[] = [];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const isToday = i === 0;
    const displayLabel = isToday
      ? 'Today'
      : d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });

    dates.push({
      date_str: formatLocalDateStr(d),
      display_label: displayLabel,
    });
  }
  return dates;
}

export function parseRuntimeStr(runtimeStr: string): number {
  const cleaned = runtimeStr.trim().toLowerCase();

  const hMatch = cleaned.match(/(\d+)\s*(?:h|hr|hours?)/);
  const mMatch = cleaned.match(/(\d+)\s*(?:m|min|mins|minutes?)/);

  const hours = hMatch && hMatch[1] ? parseInt(hMatch[1], 10) : 0;
  const minutes = mMatch && mMatch[1] ? parseInt(mMatch[1], 10) : 0;

  if (!hMatch && !mMatch) {
    if (/^\d+$/.test(cleaned)) {
      return parseInt(cleaned, 10);
    }
    throw new Error(`Unable to parse runtime: '${runtimeStr}'`);
  }

  return hours * 60 + minutes;
}

export class ActivityBreak {
  name: string;
  window_start_min: number;
  window_end_min: number;
  min_duration_min: number;
  max_duration_min: number | null;
  intended_duration_min: number | null;

  constructor(
    name: string,
    window_start_min: number,
    window_end_min: number,
    min_duration_min: number = 45,
    max_duration_min: number | null = null,
    intended_duration_min: number | null = null
  ) {
    this.name = name;
    this.window_start_min = window_start_min;
    this.window_end_min = window_end_min;
    this.min_duration_min = min_duration_min;
    this.max_duration_min = max_duration_min;
    this.intended_duration_min = intended_duration_min;

    if (this.intended_duration_min !== null) {
      if (this.min_duration_min === 45) {
        this.min_duration_min = Math.max(15, this.intended_duration_min - 10);
      }
      if (this.max_duration_min === null) {
        this.max_duration_min = this.intended_duration_min + 30;
      }
    }
  }

  evaluateGap(gapStartMin: number, gapEndMin: number): number | null {
    const effectiveStart = Math.max(gapStartMin, this.window_start_min);
    const effectiveEnd = Math.min(gapEndMin, this.window_end_min);
    const effectiveDuration = effectiveEnd - effectiveStart;
    const totalGap = gapEndMin - gapStartMin;

    if (effectiveDuration < this.min_duration_min || totalGap < this.min_duration_min) {
      return null;
    }

    if (this.max_duration_min !== null) {
      if (effectiveDuration > this.max_duration_min || totalGap > this.max_duration_min) {
        return null;
      }
    }

    return effectiveDuration;
  }
}

export class BlackoutWindow {
  name: string;
  start_min: number;
  end_min: number;

  constructor(name: string, start_min: number, end_min: number) {
    this.name = name;
    this.start_min = start_min;
    this.end_min = end_min;
  }

  overlapsWith(startMin: number, endMin: number): boolean {
    return Math.max(startMin, this.start_min) < Math.min(endMin, this.end_min);
  }
}
