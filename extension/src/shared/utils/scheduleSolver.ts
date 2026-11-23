import { TimelineItemType, isPremiumFormat } from '../types/movie';
import { BREAK_INTENTS_MAP, isBreakIntent } from '../types/breaks';
import type { ScheduleRelaxation } from '../types/schemas';
import { normalizeMovieKey } from './movie';
import { ActivityBreak, BlackoutWindow, minutesToTimeStr } from './time';

export interface MovieShowing {
  title: string;
  theater: string;
  format_name: string;
  start_time_str: string;
  start_min: number;
  runtime_min: number;
  trailer_min: number;
  booking_url?: string | null;
  booking_urls: string[];
  poster_url?: string | null;
  is_a_list_eligible: boolean;
  is_required: boolean;
  is_pinned: boolean;
  is_format_fallback?: boolean;
  program_label?: string | null;

  movie_key: string;
  is_premium: boolean;
  feature_start_min: number;
  end_min: number;
  feature_start_str: string;
  end_time_str: string;
  overlapsWith(other: MovieShowing): boolean;
}

export function createMovieShowing(params: Partial<MovieShowing>): MovieShowing {
  const title = params.title || '';
  const theater = params.theater || '';
  const format_name = params.format_name || '';
  const start_time_str = params.start_time_str || '';
  const start_min = params.start_min || 0;
  const runtime_min = params.runtime_min || 0;
  const trailer_min = params.trailer_min ?? 25;

  const movie_key = params.movie_key || normalizeMovieKey(title);

  let is_premium = params.is_premium;
  if (is_premium === undefined) {
    is_premium = isPremiumFormat(format_name);
  }

  const feature_start_min = start_min + trailer_min;
  const end_min = start_min + trailer_min + runtime_min;
  const feature_start_str = minutesToTimeStr(feature_start_min);
  const end_time_str = minutesToTimeStr(end_min);

  let booking_urls = params.booking_urls ? [...params.booking_urls] : [];
  let booking_url = params.booking_url;
  if (!booking_urls.length && booking_url) {
    booking_urls = [booking_url];
  } else if (booking_urls.length && !booking_url) {
    booking_url = booking_urls[0];
  } else if (booking_urls.length) {
    booking_urls = Array.from(new Set(booking_urls)).sort();
  }

  const showing: MovieShowing = {
    title,
    theater,
    format_name,
    start_time_str,
    start_min,
    runtime_min,
    trailer_min,
    booking_url,
    booking_urls,
    poster_url: params.poster_url,
    is_a_list_eligible: params.is_a_list_eligible ?? true,
    is_required: params.is_required || false,
    is_pinned: params.is_pinned || false,
    is_format_fallback: params.is_format_fallback || false,
    program_label: params.program_label,

    movie_key,
    is_premium,
    feature_start_min,
    end_min,
    feature_start_str,
    end_time_str,
    overlapsWith(other: MovieShowing) {
      return Math.max(this.start_min, other.start_min) < Math.min(this.end_min, other.end_min);
    },
  };

  return showing;
}

export interface ScheduleItem {
  item_type: TimelineItemType;
  label: string;
  start_min: number;
  end_min: number;
  duration_min: number;
  showing?: MovieShowing;
  activity_break?: ActivityBreak;
  start_str: string;
  end_str: string;
}

export class Schedule {
  showings: MovieShowing[];
  breaks: [ActivityBreak, number, number][]; // [brk, start, end]
  total_wasted_wait_min: number;
  net_wait_min: number;
  total_break_min: number;
  pattern_description: string;
  matched_required_count: number;
  is_relaxed: boolean;
  penalty_score: number;
  relaxations: ScheduleRelaxation[];

  constructor(
    showings: MovieShowing[],
    breaks: [ActivityBreak, number, number][] = [],
    total_wasted_wait_min = 0,
    net_wait_min = 0,
    total_break_min = 0,
    pattern_description = "",
    matched_required_count = 0,
    is_relaxed = false,
    penalty_score = 0,
    relaxations: ScheduleRelaxation[] = []
  ) {
    this.showings = showings;
    this.breaks = breaks;
    this.total_wasted_wait_min = total_wasted_wait_min;
    this.net_wait_min = net_wait_min;
    this.total_break_min = total_break_min;
    this.pattern_description = pattern_description;
    this.matched_required_count = matched_required_count;
    this.is_relaxed = is_relaxed;
    this.penalty_score = penalty_score;
    this.relaxations = relaxations;
  }

  get signature(): string {
    return this.showings
      .map((s) => `${s.movie_key}@${s.start_min}:${s.format_name}`)
      .join("|");
  }

  get start_min() {
    return this.showings.length ? this.showings[0]!.start_min : 0;
  }
  get end_min() {
    return this.showings.length ? this.showings[this.showings.length - 1]!.end_min : 0;
  }
  get total_span_min() {
    return this.end_min - this.start_min;
  }
  get start_time_str() {
    return minutesToTimeStr(this.start_min);
  }
  get end_time_str() {
    return minutesToTimeStr(this.end_min);
  }
  get premium_showing_count() {
    return this.showings.filter(s => s.is_premium).length;
  }
  get has_premium() {
    return this.premium_showing_count > 0;
  }
  get fast_connection_count() {
    let count = 0;
    for (let i = 0; i < this.showings.length - 1; i++) {
      const curr = this.showings[i];
      const next = this.showings[i + 1];
      if (curr && next && next.start_min < curr.end_min) {
        count++;
      }
    }
    return count;
  }

  get timeline_items(): ScheduleItem[] {
    if (!this.showings.length) return [];

    const items: ScheduleItem[] = [];
    for (let i = 0; i < this.showings.length; i++) {
      const showing = this.showings[i];
      if (!showing) continue;
      items.push({
        item_type: TimelineItemType.MOVIE,
        label: showing.title,
        start_min: showing.start_min,
        end_min: showing.end_min,
        duration_min: showing.end_min - showing.start_min,
        showing,
        start_str: minutesToTimeStr(showing.start_min),
        end_str: minutesToTimeStr(showing.end_min)
      });

      if (i < this.showings.length - 1) {
        const next_showing = this.showings[i + 1];
        if (!next_showing) continue;
        const gap_start = showing.end_min;
        const gap_end = next_showing.start_min;
        const total_gap = gap_end - gap_start;

        let matched_break: [ActivityBreak, number, number] | null = null;
        for (const b of this.breaks) {
          const [, b_start, b_end] = b;
          if (b_start >= gap_start && b_end <= gap_end) {
            matched_break = b;
            break;
          }
        }

        if (matched_break) {
          const [brk, b_start, b_end] = matched_break;
          if (b_start > gap_start) {
            items.push({
              item_type: TimelineItemType.GAP,
              label: "Buffer",
              start_min: gap_start,
              end_min: b_start,
              duration_min: b_start - gap_start,
              start_str: minutesToTimeStr(gap_start),
              end_str: minutesToTimeStr(b_start)
            });
          }
          items.push({
            item_type: TimelineItemType.BREAK,
            label: brk.name,
            start_min: b_start,
            end_min: b_end,
            duration_min: b_end - b_start,
            activity_break: brk,
            start_str: minutesToTimeStr(b_start),
            end_str: minutesToTimeStr(b_end)
          });
          if (gap_end > b_end) {
            items.push({
              item_type: TimelineItemType.GAP,
              label: "Buffer",
              start_min: b_end,
              end_min: gap_end,
              duration_min: gap_end - b_end,
              start_str: minutesToTimeStr(b_end),
              end_str: minutesToTimeStr(gap_end)
            });
          }
        } else {
          if (total_gap > 0) {
            items.push({
              item_type: TimelineItemType.GAP,
              label: "Buffer",
              start_min: gap_start,
              end_min: gap_end,
              duration_min: total_gap,
              start_str: minutesToTimeStr(gap_start),
              end_str: minutesToTimeStr(gap_end)
            });
          } else if (total_gap < 0) {
            items.push({
              item_type: TimelineItemType.FAST_CONNECTION,
              label: "Quick Connection",
              start_min: gap_end,
              end_min: gap_start,
              duration_min: total_gap,
              start_str: minutesToTimeStr(gap_end),
              end_str: minutesToTimeStr(gap_start)
            });
          }
        }
      }
    }
    return items;
  }
}

interface RelaxedGapEvaluation {
  is_valid: boolean;
  matched_break: [ActivityBreak, number, number] | null;
  consumed_configured_break: ActivityBreak | null;
  is_auto_break: boolean;
  wasted_wait: number;
  net_wait: number;
  penalty: number;
  relaxations: ScheduleRelaxation[];
}

// Maximum relaxation constants
const RELAX_EARLIEST_START_DELTA_MIN = 30;
const RELAX_LATEST_END_DELTA_MIN = 45;
const RELAX_MIN_WAIT_DELTA_MIN = 10;
const RELAX_MAX_WAIT_DELTA_MIN = 20;
const RELAX_BREAK_WINDOW_DELTA_MIN = 45;

export class ScheduleOptimizer {
  showings: MovieShowing[];
  num_movies: number;
  activity_breaks: ActivityBreak[];
  blackout_windows: BlackoutWindow[];
  required_titles: Set<string>;
  excluded_titles: Set<string>;
  exclude_non_a_list: boolean;
  prefer_premium_formats: boolean;
  pinned_showing: MovieShowing | null;
  earliest_start_min: number | null;
  latest_end_min: number | null;
  min_consecutive_wait_min: number;
  max_consecutive_wait_min: number | null;
  require_all_breaks: boolean;

  constructor(options: {
    showings: MovieShowing[],
    num_movies?: number,
    activity_breaks?: ActivityBreak[],
    blackout_windows?: BlackoutWindow[],
    required_titles?: Set<string>,
    excluded_titles?: Set<string>,
    exclude_non_a_list?: boolean,
    prefer_premium_formats?: boolean,
    pinned_showing?: MovieShowing | null,
    earliest_start_min?: number | null,
    latest_end_min?: number | null,
    min_consecutive_wait_min?: number,
    max_consecutive_wait_min?: number | null,
    require_all_breaks?: boolean,
  }) {
    this.showings = options.showings;
    this.num_movies = options.num_movies ?? 3;
    // Order windowed breaks (e.g. Lunch/Dinner) before full-day breaks so unrestricted breaks don't steal meal slots
    this.activity_breaks = [...(options.activity_breaks || [])].sort((a, b) => {
      const spanA = a.window_end_min - a.window_start_min;
      const spanB = b.window_end_min - b.window_start_min;
      return spanA - spanB;
    });
    this.blackout_windows = options.blackout_windows || [];
    this.required_titles = options.required_titles || new Set();
    this.excluded_titles = options.excluded_titles || new Set();
    this.exclude_non_a_list = options.exclude_non_a_list ?? false;
    this.prefer_premium_formats = options.prefer_premium_formats ?? true;
    this.pinned_showing = options.pinned_showing || null;
    this.earliest_start_min = options.earliest_start_min ?? null;
    this.latest_end_min = options.latest_end_min ?? null;
    this.min_consecutive_wait_min = options.min_consecutive_wait_min ?? 5;
    this.max_consecutive_wait_min = options.max_consecutive_wait_min ?? 45;
    this.require_all_breaks = options.require_all_breaks ?? false;
  }

  _is_same_showing(s1: MovieShowing, s2: MovieShowing): boolean {
    return s1.title === s2.title && s1.start_min === s2.start_min && s1.format_name === s2.format_name;
  }

  _filter_candidate_showings(relaxed = false): MovieShowing[] {
    const valid: MovieShowing[] = [];
    const normalized_excluded = new Set(Array.from(this.excluded_titles).map(normalizeMovieKey));

    const earliestBound =
      this.earliest_start_min !== null
        ? relaxed
          ? Math.max(360, this.earliest_start_min - RELAX_EARLIEST_START_DELTA_MIN)
          : this.earliest_start_min
        : null;
    const latestBound =
      this.latest_end_min !== null
        ? relaxed
          ? Math.min(1560, this.latest_end_min + RELAX_LATEST_END_DELTA_MIN)
          : this.latest_end_min
        : null;

    for (const s of this.showings) {
      if (this.exclude_non_a_list && !s.is_a_list_eligible) continue;
      if (normalized_excluded.has(s.movie_key)) continue;
      if (!relaxed && s.is_format_fallback && (!this.pinned_showing || !this._is_same_showing(s, this.pinned_showing))) {
        continue;
      }
      if (earliestBound !== null && s.start_min < earliestBound) continue;
      if (latestBound !== null && s.end_min > latestBound) continue;

      let overlap_blackout = false;
      for (const bw of this.blackout_windows) {
        if (bw.overlapsWith(s.start_min, s.end_min)) {
          overlap_blackout = true;
          break;
        }
      }
      if (overlap_blackout) continue;
      valid.push(s);
    }
    return valid.sort((a, b) => {
      if (a.start_min !== b.start_min) return a.start_min - b.start_min;
      return a.end_min - b.end_min;
    });
  }

  _evaluate_gap(
    first: MovieShowing,
    second: MovieShowing,
    available_breaks: ActivityBreak[]
  ): [boolean, [ActivityBreak, number, number] | null, number, number] {
    if (second.start_min < first.start_min + first.runtime_min) {
      return [false, null, 0, 0];
    }
    if (second.feature_start_min < first.end_min) {
      return [false, null, 0, 0];
    }

    const gap_start = first.end_min;
    const gap_end = second.start_min;
    const total_gap = gap_end - gap_start;

    let matched_break: [ActivityBreak, number, number] | null = null;
    if (total_gap > 0) {
      for (const brk of available_breaks) {
        const effective_dur = brk.evaluateGap(gap_start, gap_end);
        if (effective_dur !== null) {
          const b_start = Math.max(gap_start, brk.window_start_min);
          const b_end = b_start + effective_dur;
          matched_break = [brk, b_start, b_end];
          break;
        }
      }
    }

    if (matched_break) {
      const wait_after = gap_end - matched_break[2];
      if (wait_after < 0 || wait_after > (this.max_consecutive_wait_min ?? 0)) {
        return [false, null, 0, 0];
      }
      return [true, matched_break, wait_after, total_gap];
    }

    if (total_gap < this.min_consecutive_wait_min) {
      return [false, null, 0, 0];
    }
    if (total_gap < 0 && second.feature_start_min < first.end_min) {
      return [false, null, 0, 0];
    }

    if (this.max_consecutive_wait_min !== null && total_gap > this.max_consecutive_wait_min) {
      return [false, null, 0, 0];
    }

    const wasted_gap = Math.max(0, total_gap);
    return [true, null, wasted_gap, total_gap];
  }

  _get_intent_duration_bounds(brk: ActivityBreak): [number, number] {
    if (isBreakIntent(brk.name)) {
      const def = BREAK_INTENTS_MAP[brk.name];
      let minD = brk.min_duration_min;
      let maxD = brk.max_duration_min ?? 180;
      for (const [lo, hi] of Object.values(def.sizeRanges)) {
        if (lo < minD) minD = lo;
        if (hi > maxD) maxD = hi;
      }
      return [minD, maxD];
    }
    return [Math.max(15, brk.min_duration_min - 15), (brk.max_duration_min ?? 90) + 30];
  }

  _evaluate_gap_relaxed(
    first: MovieShowing,
    second: MovieShowing,
    available_breaks: ActivityBreak[],
    used_break_names: Set<string>,
    auto_breaks_used: number,
    max_auto_breaks: number
  ): RelaxedGapEvaluation {
    const invalid: RelaxedGapEvaluation = {
      is_valid: false,
      matched_break: null,
      consumed_configured_break: null,
      is_auto_break: false,
      wasted_wait: 0,
      net_wait: 0,
      penalty: 0,
      relaxations: [],
    };

    // Physical non-overlap invariants (never relaxed)
    if (second.start_min < first.start_min + first.runtime_min) return invalid;
    if (second.feature_start_min < first.end_min) return invalid;

    const gap_start = first.end_min;
    const gap_end = second.start_min;
    const total_gap = gap_end - gap_start;

    const strictMinWait = this.min_consecutive_wait_min;
    const strictMaxWait = this.max_consecutive_wait_min ?? 45;
    const relaxedMinWait = Math.max(-second.trailer_min, strictMinWait - RELAX_MIN_WAIT_DELTA_MIN);
    const relaxedMaxWait = Math.min(60, strictMaxWait + RELAX_MAX_WAIT_DELTA_MIN);

    // 1. Try strict configured break match first (0 penalty)
    if (total_gap > 0) {
      for (const brk of available_breaks) {
        const effective_dur = brk.evaluateGap(gap_start, gap_end);
        if (effective_dur !== null) {
          const b_start = Math.max(gap_start, brk.window_start_min);
          const b_end = b_start + effective_dur;
          const wait_after = gap_end - b_end;
          if (wait_after >= 0 && wait_after <= strictMaxWait) {
            return {
              is_valid: true,
              matched_break: [brk, b_start, b_end],
              consumed_configured_break: brk,
              is_auto_break: false,
              wasted_wait: wait_after + Math.max(0, b_start - gap_start),
              net_wait: total_gap,
              penalty: 0,
              relaxations: [],
            };
          }
        }
      }

      // 2. Try relaxed configured break match (resized duration, shifted window, or extra buffer)
      for (const brk of available_breaks) {
        const isWindowed = brk.window_end_min - brk.window_start_min < 600;
        const wStart = isWindowed
          ? Math.max(0, brk.window_start_min - RELAX_BREAK_WINDOW_DELTA_MIN)
          : brk.window_start_min;
        const wEnd = isWindowed
          ? brk.window_end_min + RELAX_BREAK_WINDOW_DELTA_MIN
          : brk.window_end_min;

        const [intentMinDur, intentMaxDur] = this._get_intent_duration_bounds(brk);
        const overlapStart = Math.max(gap_start, wStart);
        const overlapEnd = Math.min(gap_end, wEnd);
        const overlapDur = overlapEnd - overlapStart;

        if (overlapDur >= intentMinDur && total_gap >= intentMinDur) {
          const b_dur = Math.min(overlapDur, intentMaxDur);
          const b_start = overlapStart;
          const b_end = b_start + b_dur;
          const leftoverWait = total_gap - b_dur;

          if (leftoverWait >= 0 && leftoverWait <= relaxedMaxWait) {
            let penalty = 0;
            const relaxations: ScheduleRelaxation[] = [];

            if (b_dur < brk.min_duration_min) {
              const diff = brk.min_duration_min - b_dur;
              penalty += 8 + diff * 0.5;
              relaxations.push({
                type: 'break_resized',
                description: `${brk.name} shortened to ${b_dur}m`,
                target: brk.name,
                note: `${diff}m shorter`,
              });
            } else if (brk.max_duration_min !== null && b_dur > brk.max_duration_min) {
              const diff = b_dur - brk.max_duration_min;
              penalty += 8 + diff * 0.5;
              relaxations.push({
                type: 'break_resized',
                description: `${brk.name} extended to ${b_dur}m`,
                target: brk.name,
                note: `${diff}m longer`,
              });
            }

            if (b_start < brk.window_start_min || b_end > brk.window_end_min) {
              const shiftMin =
                Math.max(0, brk.window_start_min - b_start) +
                Math.max(0, b_end - brk.window_end_min);
              penalty += 5 + shiftMin * 1.0;
              relaxations.push({
                type: 'break_window',
                description: `${brk.name} shifted (${minutesToTimeStr(b_start)}–${minutesToTimeStr(b_end)})`,
                target: brk.name,
                note: 'outside usual window',
              });
            }

            if (leftoverWait > strictMaxWait) {
              const extraWait = leftoverWait - strictMaxWait;
              penalty += extraWait * 1.5;
              relaxations.push({
                type: 'max_wait',
                description: `+${extraWait}m extra wait around ${brk.name}`,
                target: second.title,
                note: `+${extraWait}m over max wait`,
              });
            }

            return {
              is_valid: true,
              matched_break: [brk, b_start, b_end],
              consumed_configured_break: brk,
              is_auto_break: false,
              wasted_wait: leftoverWait,
              net_wait: total_gap,
              penalty,
              relaxations,
            };
          }
        }
      }
    }

    // 3. Direct connection without a break (strict or relaxed wait)
    if (total_gap >= relaxedMinWait && total_gap <= relaxedMaxWait) {
      let penalty = 0;
      const relaxations: ScheduleRelaxation[] = [];

      if (total_gap < strictMinWait) {
        const diff = strictMinWait - total_gap;
        penalty += 6 + diff * 2.0;
        relaxations.push({
          type: 'min_wait',
          description: `${diff}m tighter connection into ${second.title}`,
          target: second.title,
          note: `${diff}m under min wait`,
        });
      } else if (total_gap > strictMaxWait) {
        const diff = total_gap - strictMaxWait;
        penalty += 6 + diff * 1.5;
        relaxations.push({
          type: 'max_wait',
          description: `${total_gap}m wait (+${diff}m) before ${second.title}`,
          target: second.title,
          note: `+${diff}m over max wait`,
        });
      }

      return {
        is_valid: true,
        matched_break: null,
        consumed_configured_break: null,
        is_auto_break: false,
        wasted_wait: Math.max(0, total_gap),
        net_wait: total_gap,
        penalty,
        relaxations,
      };
    }

    // 4. Auto-add an unrequested break to rescue a larger gap (> relaxedMaxWait)
    if (total_gap > relaxedMaxWait && auto_breaks_used < max_auto_breaks) {
      // Check Meal windows first (Lunch: 11:00am-2:30pm, Dinner: 5:00pm-8:30pm)
      const mealCandidates: Array<'Lunch' | 'Dinner'> = ['Lunch', 'Dinner'];
      for (const mealIntent of mealCandidates) {
        if (used_break_names.has(mealIntent)) continue;
        if (available_breaks.some((b) => b.name === mealIntent)) continue;

        const def = BREAK_INTENTS_MAP[mealIntent];
        const overlapStart = Math.max(gap_start, def.windowStart);
        const overlapEnd = Math.min(gap_end, def.windowEnd);
        const overlapDur = overlapEnd - overlapStart;

        if (overlapDur >= 30 && total_gap <= 110 + strictMaxWait) {
          const b_dur = Math.min(overlapDur, 110);
          const leftoverWait = total_gap - b_dur;
          if (leftoverWait >= 0 && leftoverWait <= strictMaxWait) {
            const synthBreak = new ActivityBreak(
              mealIntent,
              def.windowStart,
              def.windowEnd,
              b_dur,
              b_dur
            );
            return {
              is_valid: true,
              matched_break: [synthBreak, overlapStart, overlapStart + b_dur],
              consumed_configured_break: null,
              is_auto_break: true,
              wasted_wait: leftoverWait,
              net_wait: total_gap,
              penalty: 25,
              relaxations: [
                {
                  type: 'break_added',
                  description: `Added ${b_dur}m ${mealIntent} break`,
                  target: mealIntent,
                  note: 'auto-added',
                },
              ],
            };
          }
        }
      }

      // Auto Quick Breather (20m - 60m)
      if (total_gap >= 20 && total_gap <= 60) {
        const synthBreak = new ActivityBreak('Quick Breather', 0, 1800, total_gap, total_gap);
        return {
          is_valid: true,
          matched_break: [synthBreak, gap_start, gap_end],
          consumed_configured_break: null,
          is_auto_break: true,
          wasted_wait: 0,
          net_wait: total_gap,
          penalty: 25,
          relaxations: [
            {
              type: 'break_added',
              description: `Added ${total_gap}m Quick Breather`,
              target: 'Quick Breather',
              note: 'auto-added',
            },
          ],
        };
      }

      // Auto Intermission (61m - 180m)
      if (total_gap > 60 && total_gap <= 180) {
        const synthBreak = new ActivityBreak('Intermission', 0, 1800, total_gap, total_gap);
        return {
          is_valid: true,
          matched_break: [synthBreak, gap_start, gap_end],
          consumed_configured_break: null,
          is_auto_break: true,
          wasted_wait: 0,
          net_wait: total_gap,
          penalty: 55,
          relaxations: [
            {
              type: 'break_added',
              description: `Added ${total_gap}m Intermission`,
              target: 'Intermission',
              note: 'auto-added',
            },
          ],
        };
      }
    }

    return invalid;
  }

  _determine_pattern(schedule_showings: MovieShowing[], breaks: [ActivityBreak, number, number][]): string {
    if (!breaks.length) {
      return `${schedule_showings.length} movies back-to-back`;
    }

    const segments: string[] = [];
    let curr_count = 0;

    for (let i = 0; i < schedule_showings.length; i++) {
      curr_count++;
      if (i < schedule_showings.length - 1) {
        const curr_s = schedule_showings[i];
        const next_s = schedule_showings[i + 1];
        if (!curr_s || !next_s) continue;
        const gap_start = curr_s.end_min;
        const gap_end = next_s.start_min;
        let found_b = null;
        for (const b_item of breaks) {
          if (b_item[1] >= gap_start && b_item[2] <= gap_end) {
            found_b = b_item;
            break;
          }
        }
        if (found_b) {
          segments.push(`${curr_count} movie${curr_count > 1 ? 's' : ''}`);
          segments.push(`${found_b[0].name}`);
          curr_count = 0;
        }
      }
    }
    if (curr_count > 0) {
      segments.push(`${curr_count} movie${curr_count > 1 ? 's' : ''}`);
    }
    return segments.join(" → ");
  }

  findSchedules(topN: number = 20): Schedule[] {
    const candidates = this._filter_candidate_showings(false);
    const valid_schedules: Schedule[] = [];

    if (this.pinned_showing && !candidates.some(s => this._is_same_showing(s, this.pinned_showing!))) {
      return [];
    }

    const candidate_keys = new Set(candidates.map(s => s.movie_key));
    if (candidate_keys.size < this.num_movies) return [];

    const normalized_required = new Set(Array.from(this.required_titles).map(normalizeMovieKey));
    if (normalized_required.size > this.num_movies) return [];

    for (const req of normalized_required) {
      if (!candidate_keys.has(req)) return [];
    }

    if (this.pinned_showing) {
      const pinned_key = this.pinned_showing.movie_key;
      if (!normalized_required.has(pinned_key) && normalized_required.size >= this.num_movies) {
        return [];
      }
    }

    const backtrack = (
      current_showings: MovieShowing[],
      used_movie_keys: Set<string>,
      used_breaks: [ActivityBreak, number, number][],
      remaining_breaks: ActivityBreak[],
      total_wasted: number,
      total_net: number
    ) => {
      if (current_showings.length === this.num_movies) {
        if (this.pinned_showing && !current_showings.some(s => this._is_same_showing(s, this.pinned_showing!))) {
          return;
        }
        if (this.require_all_breaks && used_breaks.length < this.activity_breaks.length) {
          return;
        }

        let matched_req = 0;
        for (const mk of used_movie_keys) {
          if (normalized_required.has(mk)) matched_req++;
        }
        if (matched_req < normalized_required.size) return;

        let total_break_time = 0;
        for (const b of used_breaks) {
          total_break_time += (b[2] - b[1]);
        }
        const pattern = this._determine_pattern(current_showings, used_breaks);

        valid_schedules.push(new Schedule(
          [...current_showings],
          [...used_breaks],
          total_wasted,
          total_net,
          total_break_time,
          pattern,
          matched_req,
          false,
          0,
          []
        ));
        return;
      }

      let matched_so_far = 0;
      for (const mk of used_movie_keys) {
        if (normalized_required.has(mk)) matched_so_far++;
      }
      const remaining_req = normalized_required.size - matched_so_far;
      const remaining_slots = this.num_movies - current_showings.length;
      if (remaining_req > remaining_slots) return;

      const last_showing: MovieShowing | undefined = current_showings[current_showings.length - 1];

      for (const s of candidates) {
        const s_key = s.movie_key;
        if (used_movie_keys.has(s_key)) continue;

        if (last_showing) {
          const [is_valid, matched_break, wasted, net] = this._evaluate_gap(last_showing, s, remaining_breaks);
          if (!is_valid) continue;

          const new_used_breaks = [...used_breaks];
          const new_remaining_breaks = [...remaining_breaks];
          if (matched_break !== null) {
            new_used_breaks.push(matched_break);
            const r_idx = new_remaining_breaks.indexOf(matched_break[0]);
            if (r_idx > -1) new_remaining_breaks.splice(r_idx, 1);
          }

          current_showings.push(s);
          used_movie_keys.add(s_key);
          backtrack(current_showings, used_movie_keys, new_used_breaks, new_remaining_breaks, total_wasted + wasted, total_net + net);
          current_showings.pop();
          used_movie_keys.delete(s_key);
        } else {
          current_showings.push(s);
          used_movie_keys.add(s_key);
          backtrack(current_showings, used_movie_keys, used_breaks, remaining_breaks, 0, 0);
          current_showings.pop();
          used_movie_keys.delete(s_key);
        }
      }
    };

    backtrack([], new Set(), [], [...this.activity_breaks], 0, 0);

    if (this.prefer_premium_formats) {
      valid_schedules.sort((a, b) => {
        if (a.matched_required_count !== b.matched_required_count) return b.matched_required_count - a.matched_required_count;
        if (a.premium_showing_count !== b.premium_showing_count) return b.premium_showing_count - a.premium_showing_count;
        if (a.net_wait_min !== b.net_wait_min) return a.net_wait_min - b.net_wait_min;
        return a.end_min - b.end_min;
      });
    } else {
      valid_schedules.sort((a, b) => {
        if (a.matched_required_count !== b.matched_required_count) return b.matched_required_count - a.matched_required_count;
        if (a.net_wait_min !== b.net_wait_min) return a.net_wait_min - b.net_wait_min;
        return a.end_min - b.end_min;
      });
    }

    return valid_schedules.slice(0, topN);
  }

  findRelaxedSchedules(topN: number = 20, excludeSignatures: Set<string> = new Set()): Schedule[] {
    if (topN <= 0) return [];

    const candidates = this._filter_candidate_showings(true);
    if (this.pinned_showing && !candidates.some(s => this._is_same_showing(s, this.pinned_showing!))) {
      return [];
    }

    const candidate_keys = new Set(candidates.map(s => s.movie_key));
    if (candidate_keys.size < this.num_movies) return [];

    const normalized_required = new Set(Array.from(this.required_titles).map(normalizeMovieKey));
    if (normalized_required.size > this.num_movies) return [];

    for (const req of normalized_required) {
      if (!candidate_keys.has(req)) return [];
    }

    if (this.pinned_showing) {
      const pinned_key = this.pinned_showing.movie_key;
      if (!normalized_required.has(pinned_key) && normalized_required.size >= this.num_movies) {
        return [];
      }
    }

    const bestBySignature = new Map<string, Schedule>();
    const maxAutoBreaks = Math.max(1, this.num_movies - 2);

    const backtrack = (
      current_showings: MovieShowing[],
      used_movie_keys: Set<string>,
      used_breaks: [ActivityBreak, number, number][],
      used_break_names: Set<string>,
      remaining_breaks: ActivityBreak[],
      auto_breaks_used: number,
      total_wasted: number,
      total_net: number,
      running_penalty: number,
      running_relaxations: ScheduleRelaxation[]
    ) => {
      if (current_showings.length === this.num_movies) {
        if (this.pinned_showing && !current_showings.some(s => this._is_same_showing(s, this.pinned_showing!))) {
          return;
        }

        let matched_req = 0;
        for (const mk of used_movie_keys) {
          if (normalized_required.has(mk)) matched_req++;
        }
        if (matched_req < normalized_required.size) return;

        let final_penalty = running_penalty;
        const final_relaxations = [...running_relaxations];

        // Evaluate earliest_start and latest_end window relaxations
        const firstShowing = current_showings[0]!;
        const lastShowing = current_showings[current_showings.length - 1]!;

        if (this.earliest_start_min !== null && firstShowing.start_min < this.earliest_start_min) {
          const diff = this.earliest_start_min - firstShowing.start_min;
          final_penalty += 5 + diff * 1.0;
          final_relaxations.push({
            type: 'time_window',
            description: `Starts ${diff}m earlier (${firstShowing.start_time_str})`,
            target: 'start',
            note: `${diff}m early`,
          });
        }

        if (this.latest_end_min !== null && lastShowing.end_min > this.latest_end_min) {
          const diff = lastShowing.end_min - this.latest_end_min;
          final_penalty += 5 + diff * 1.0;
          final_relaxations.push({
            type: 'time_window',
            description: `Ends ${diff}m later (${lastShowing.end_time_str})`,
            target: 'end',
            note: `${diff}m late`,
          });
        }

        // Evaluate omitted user-configured breaks
        if (this.require_all_breaks && remaining_breaks.length > 0) {
          for (const omitted of remaining_breaks) {
            final_penalty += 35;
            final_relaxations.push({
              type: 'break_omitted',
              description: `Removed ${omitted.name} break`,
              target: omitted.name,
              note: `No ${omitted.name}`,
            });
          }
        }

        // Only collect schedules that actually needed a relaxation (or weren't already in strict results)
        if (final_penalty === 0 && final_relaxations.length === 0) {
          return;
        }

        let total_break_time = 0;
        for (const b of used_breaks) {
          total_break_time += (b[2] - b[1]);
        }
        const pattern = this._determine_pattern(current_showings, used_breaks);

        const sched = new Schedule(
          [...current_showings],
          [...used_breaks],
          total_wasted,
          total_net,
          total_break_time,
          pattern,
          matched_req,
          true,
          Math.round(final_penalty * 10) / 10,
          final_relaxations
        );

        const sig = sched.signature;
        if (excludeSignatures.has(sig)) return;

        const existing = bestBySignature.get(sig);
        if (!existing || sched.penalty_score < existing.penalty_score) {
          bestBySignature.set(sig, sched);
        }
        return;
      }

      let matched_so_far = 0;
      for (const mk of used_movie_keys) {
        if (normalized_required.has(mk)) matched_so_far++;
      }
      const remaining_req = normalized_required.size - matched_so_far;
      const remaining_slots = this.num_movies - current_showings.length;
      if (remaining_req > remaining_slots) return;

      const last_showing: MovieShowing | undefined = current_showings[current_showings.length - 1];

      for (const s of candidates) {
        const s_key = s.movie_key;
        if (used_movie_keys.has(s_key)) continue;

        let step_penalty = 0;
        const step_relaxations: ScheduleRelaxation[] = [];

        if (s.is_format_fallback && (!this.pinned_showing || !this._is_same_showing(s, this.pinned_showing))) {
          step_penalty += 40;
          const fmtLabel = !s.format_name || s.format_name.toLowerCase() === 'undefined' ? 'Digital' : s.format_name;
          step_relaxations.push({
            type: 'format_fallback',
            description: `${s.title} in ${fmtLabel}`,
            target: s.title,
            note: 'unselected format',
          });
        }

        if (last_showing) {
          const gapEval = this._evaluate_gap_relaxed(
            last_showing,
            s,
            remaining_breaks,
            used_break_names,
            auto_breaks_used,
            maxAutoBreaks
          );
          if (!gapEval.is_valid) continue;

          const new_used_breaks = [...used_breaks];
          const new_used_names = new Set(used_break_names);
          const new_remaining_breaks = [...remaining_breaks];
          let next_auto_used = auto_breaks_used;

          if (gapEval.matched_break !== null) {
            new_used_breaks.push(gapEval.matched_break);
            new_used_names.add(gapEval.matched_break[0].name);
            if (gapEval.consumed_configured_break) {
              const r_idx = new_remaining_breaks.indexOf(gapEval.consumed_configured_break);
              if (r_idx > -1) new_remaining_breaks.splice(r_idx, 1);
            }
            if (gapEval.is_auto_break) {
              next_auto_used++;
            }
          }

          current_showings.push(s);
          used_movie_keys.add(s_key);
          backtrack(
            current_showings,
            used_movie_keys,
            new_used_breaks,
            new_used_names,
            new_remaining_breaks,
            next_auto_used,
            total_wasted + gapEval.wasted_wait,
            total_net + gapEval.net_wait,
            running_penalty + step_penalty + gapEval.penalty,
            [...running_relaxations, ...gapEval.relaxations, ...step_relaxations]
          );
          current_showings.pop();
          used_movie_keys.delete(s_key);
        } else {
          current_showings.push(s);
          used_movie_keys.add(s_key);
          backtrack(
            current_showings,
            used_movie_keys,
            used_breaks,
            used_break_names,
            remaining_breaks,
            auto_breaks_used,
            0,
            0,
            running_penalty + step_penalty,
            [...running_relaxations, ...step_relaxations]
          );
          current_showings.pop();
          used_movie_keys.delete(s_key);
        }
      }
    };

    backtrack([], new Set(), [], new Set(), [...this.activity_breaks], 0, 0, 0, 0, []);

    const relaxed_schedules = Array.from(bestBySignature.values());
    relaxed_schedules.sort((a, b) => {
      if (a.matched_required_count !== b.matched_required_count) {
        return b.matched_required_count - a.matched_required_count;
      }
      if (a.penalty_score !== b.penalty_score) {
        return a.penalty_score - b.penalty_score;
      }
      if (this.prefer_premium_formats && a.premium_showing_count !== b.premium_showing_count) {
        return b.premium_showing_count - a.premium_showing_count;
      }
      if (a.total_wasted_wait_min !== b.total_wasted_wait_min) {
        return a.total_wasted_wait_min - b.total_wasted_wait_min;
      }
      return a.end_min - b.end_min;
    });

    return relaxed_schedules.slice(0, topN);
  }

  findSchedulesWithFallback(topN: number = 20, maxSupplement: number = 5): Schedule[] {
    const strictSchedules = this.findSchedules(topN);
    if (strictSchedules.length >= topN || maxSupplement <= 0) {
      return strictSchedules;
    }

    const excludeSignatures = new Set(strictSchedules.map((s) => s.signature));
    const needed = Math.min(maxSupplement, topN - strictSchedules.length);
    const relaxedSchedules = this.findRelaxedSchedules(needed, excludeSignatures);
    return [...strictSchedules, ...relaxedSchedules];
  }
}
