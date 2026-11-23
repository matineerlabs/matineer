import { MovieDayStatus, isAccessibilityFormat } from '../types/movie';
import { cacheRepo } from '../db/repositories/cacheRepo';
import { preferencesRepo } from '../db/repositories/preferencesRepo';
import { ScheduleOptimizer, createMovieShowing, MovieShowing } from '../utils/scheduleSolver';
import { evaluateConfiguredBreaks } from '../utils/breaks';
import { parseMarathonTime, ActivityBreak } from '../utils/time';
import type { MovieResponse, ScheduleResponse, SolveSchedulesRequest } from '../types/schemas';

export async function solveSchedulesService(
  req: SolveSchedulesRequest
): Promise<ScheduleResponse[]> {
  const providerId = 'amc';
  const theaterId = req.theater_id || '';
  const dateStr = req.date;

  const cachedShowtimes = await cacheRepo.getShowtimes(providerId, theaterId, dateStr);
  if (!cachedShowtimes || !cachedShowtimes.movies) {
    return [];
  }

  const rawMovies: MovieResponse[] = cachedShowtimes.movies;
  const daySelections = await preferencesRepo.getDaySelectionsForDate(dateStr);
  const { seen_movies, wont_watch_movies } = await preferencesRepo.getAllMovieStatuses();
  const excludeTitles = new Set([...seen_movies, ...wont_watch_movies].map((t) => t.toLowerCase()));

  const requiredTitles = new Set<string>();
  const activeShowings: MovieShowing[] = [];

  for (const m of rawMovies) {
    const titleLower = m.title.toLowerCase();
    const conf = daySelections[titleLower];
    const status: MovieDayStatus = conf?.status || (excludeTitles.has(titleLower) ? MovieDayStatus.EXCLUDE : MovieDayStatus.INCLUDE);

    if (status === MovieDayStatus.EXCLUDE) continue;
    if (status === MovieDayStatus.MUST_SEE) requiredTitles.add(m.title);

    let allowedFmts = conf?.allowed_formats;
    if (!allowedFmts || allowedFmts.length === 0) {
      if (req.movie_formats && req.movie_formats[m.title]) {
        allowedFmts = req.movie_formats[m.title];
      } else {
        allowedFmts = m.all_formats || Object.keys(m.showings_by_format || {});
      }
    }
    const allowedSet = new Set((allowedFmts || []).map((f) => f.toLowerCase()));
    const userAllowsAccessibility = Array.from(allowedSet).some((f) => isAccessibilityFormat(f));

    for (const [fmt, items] of Object.entries(m.showings_by_format || {})) {
      const isAllowedFormat = allowedSet.has(fmt.toLowerCase());
      if (!isAllowedFormat) {
        // Never fallback into accessibility formats unless user already opted into one for this movie
        if (!userAllowsAccessibility && isAccessibilityFormat(fmt)) {
          continue;
        }
      }
      for (const item of items) {
        const isSoldOut = typeof item === 'string' ? false : !!item.is_sold_out;
        if (isSoldOut) continue;

        const timeStr = typeof item === 'string' ? item : item.time || (item as any)[0];
        const startMin = parseMarathonTime(timeStr);
        const bookingUrl = typeof item === 'string' ? undefined : item.url || (item as any)[1];
        const bookingUrls =
          typeof item === 'string' ? [] : item.booking_urls || (bookingUrl ? [bookingUrl] : []);

        activeShowings.push(
          createMovieShowing({
            title: m.title,
            theater: theaterId,
            format_name: fmt,
            start_time_str: timeStr,
            start_min: startMin,
            runtime_min: m.runtime_min,
            trailer_min: req.trailer_min || 25,
            poster_url: m.poster_url,
            is_a_list_eligible: m.is_a_list_eligible,
            booking_url: bookingUrl,
            booking_urls: bookingUrls,
            is_format_fallback: !isAllowedFormat,
          })
        );
      }
    }
  }

  let pinnedObj: MovieShowing | null = null;
  if (req.pinned_showing) {
    pinnedObj = createMovieShowing({
      title: req.pinned_showing.title,
      theater: theaterId,
      format_name: req.pinned_showing.format_name,
      start_time_str: req.pinned_showing.time,
      start_min: parseMarathonTime(req.pinned_showing.time),
      runtime_min:
        rawMovies.find((m) => m.title === req.pinned_showing!.title)?.runtime_min || 120,
    });
    requiredTitles.add(pinnedObj.title);
    if (
      !activeShowings.some(
        (s) =>
          s.title === pinnedObj!.title &&
          s.start_min === pinnedObj!.start_min &&
          s.format_name === pinnedObj!.format_name
      )
    ) {
      activeShowings.push(pinnedObj);
    }
  }

  if (activeShowings.length === 0) {
    return [];
  }

  const earliestMin = req.earliest_start
    ? parseMarathonTime(req.earliest_start)
    : parseMarathonTime('9:30am');
  const latestMin = req.latest_end
    ? parseMarathonTime(req.latest_end)
    : parseMarathonTime('10:30pm');

  let itineraryBreaks: ActivityBreak[] = [];
  if (req.breaks && req.breaks.length > 0) {
    const evalBreaks = evaluateConfiguredBreaks(
      req.breaks,
      earliestMin,
      latestMin,
      req.num_movies || 3
    );
    itineraryBreaks = evalBreaks.filter((b) => b.is_active).map((b) => b.activity_break);
  }

  const optimizer = new ScheduleOptimizer({
    showings: activeShowings,
    num_movies: req.num_movies || 3,
    activity_breaks: itineraryBreaks,
    required_titles: requiredTitles,
    pinned_showing: pinnedObj,
    earliest_start_min: earliestMin,
    latest_end_min: latestMin,
    min_consecutive_wait_min: req.min_wait_min ?? 5,
    max_consecutive_wait_min: req.max_wait_min ?? 45,
    prefer_premium_formats: req.prefer_premium_formats ?? true,
    require_all_breaks: true,
  });

  const schedules = optimizer.findSchedulesWithFallback(20, 5);

  return schedules.map((sched, idx) => {
    const timeline_items = sched.timeline_items.map((item) => ({
      item_type: item.item_type,
      label: item.label,
      start_min: item.start_min,
      end_min: item.end_min,
      start_str: item.start_str,
      end_str: item.end_str,
      duration_min: item.duration_min,
      showing: item.showing
        ? {
            title: item.showing.title,
            format_name: item.showing.format_name,
            start_time_str: item.showing.start_time_str,
            feature_start_str: item.showing.feature_start_str,
            end_time_str: item.showing.end_time_str,
            start_min: item.showing.start_min,
            end_min: item.showing.end_min,
            runtime_min: item.showing.runtime_min,
            trailer_min: item.showing.trailer_min,
            booking_url: item.showing.booking_url,
            booking_urls: item.showing.booking_urls,
            poster_url: item.showing.poster_url,
            is_a_list_eligible: item.showing.is_a_list_eligible,
            is_premium: item.showing.is_premium,
            is_format_fallback: item.showing.is_format_fallback,
          }
        : undefined,
    }));

    return {
      schedule_id: idx + 1,
      pattern_description: sched.pattern_description,
      start_time_str: sched.start_time_str,
      end_time_str: sched.end_time_str,
      start_min: sched.start_min,
      end_min: sched.end_min,
      total_wasted_wait_min: sched.total_wasted_wait_min,
      has_premium: sched.has_premium,
      premium_movie_count: sched.premium_showing_count,
      fast_connection_count: sched.fast_connection_count,
      movie_count: sched.showings.length,
      timeline_items,
      is_relaxed: sched.is_relaxed,
      penalty_score: sched.penalty_score,
      relaxations: sched.relaxations,
    };
  });
}
