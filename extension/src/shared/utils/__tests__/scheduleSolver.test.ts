import { describe, it, expect } from 'vitest';
import { ScheduleOptimizer, createMovieShowing, MovieShowing } from '../scheduleSolver';
import { ActivityBreak, parseMarathonTime } from '../time';
import { TimelineItemType } from '../../types/movie';

function buildSampleShowings(): MovieShowing[] {
  const showings: MovieShowing[] = [];

  // Movie 1: Coyote vs. Acme (runtime 103m)
  const cvaTimes: Array<{ format: string; time: string }> = [
    { format: 'Dolby Cinema at AMC', time: '10:40am' },
    { format: 'Dolby Cinema at AMC', time: '1:20pm' },
    { format: 'Dolby Cinema at AMC', time: '4:15pm' },
    { format: 'Dolby Cinema at AMC', time: '7:00pm' },
    { format: 'Laser at AMC', time: '12:45pm' },
    { format: 'Laser at AMC', time: '3:30pm' },
    { format: 'Laser at AMC', time: '6:15pm' },
  ];
  for (const item of cvaTimes) {
    showings.push(createMovieShowing({
      title: 'Coyote vs. Acme',
      theater: 'AMC Westminster',
      format_name: item.format,
      start_time_str: item.time,
      start_min: parseMarathonTime(item.time),
      runtime_min: 103,
      trailer_min: 20,
      is_a_list_eligible: true
    }));
  }

  // Movie 2: Tony (runtime 106m)
  const tonyTimes: Array<{ format: string; time: string }> = [
    { format: 'Laser at AMC', time: '1:10pm' },
    { format: 'Laser at AMC', time: '1:45pm' }, // 62m gap after 10:40am (ends 12:43pm), perfect for lunch
    { format: 'Laser at AMC', time: '4:00pm' },
    { format: 'Laser at AMC', time: '7:05pm' },
    { format: 'Digital', time: '11:00am' },
    { format: 'Digital', time: '2:15pm' },
    { format: 'Digital', time: '5:30pm' },
  ];
  for (const item of tonyTimes) {
    showings.push(createMovieShowing({
      title: 'Tony',
      theater: 'AMC Westminster',
      format_name: item.format,
      start_time_str: item.time,
      start_min: parseMarathonTime(item.time),
      runtime_min: 106,
      trailer_min: 20,
      is_a_list_eligible: true
    }));
  }

  // Movie 3: Wicked (runtime 160m)
  const wickedTimes: Array<{ format: string; time: string }> = [
    { format: 'Dolby Cinema at AMC', time: '12:00pm' },
    { format: 'Dolby Cinema at AMC', time: '3:45pm' },
    { format: 'Dolby Cinema at AMC', time: '7:30pm' },
    { format: 'Digital', time: '1:00pm' },
    { format: 'Digital', time: '5:00pm' },
  ];
  for (const item of wickedTimes) {
    showings.push(createMovieShowing({
      title: 'Wicked',
      theater: 'AMC Westminster',
      format_name: item.format,
      start_time_str: item.time,
      start_min: parseMarathonTime(item.time),
      runtime_min: 160,
      trailer_min: 20,
      is_a_list_eligible: true
    }));
  }

  return showings;
}

describe('ScheduleOptimizer', () => {
  const allShowings = buildSampleShowings();

  it('solves a valid 2-movie schedule', () => {
    const optimizer = new ScheduleOptimizer({
      showings: allShowings,
      num_movies: 2,
      min_consecutive_wait_min: 5,
      max_consecutive_wait_min: 45
    });

    const schedules = optimizer.findSchedules(5);
    expect(schedules.length).toBeGreaterThan(0);

    const first = schedules[0];
    expect(first).toBeDefined();
    expect(first!.showings.length).toBe(2);
    expect(first!.showings[0]!.end_min).toBeLessThanOrEqual(first!.showings[1]!.start_min + 20); // within feature start
  });

  it('prioritizes premium formats when prefer_premium_formats is true', () => {
    const optimizer = new ScheduleOptimizer({
      showings: allShowings,
      num_movies: 2,
      prefer_premium_formats: true,
      min_consecutive_wait_min: 5,
      max_consecutive_wait_min: 45
    });

    const schedules = optimizer.findSchedules(5);
    expect(schedules.length).toBeGreaterThan(0);
    expect(schedules[0]!.premium_showing_count).toBeGreaterThan(0);
  });

  it('respects required titles in schedules', () => {
    const optimizer = new ScheduleOptimizer({
      showings: allShowings,
      num_movies: 2,
      required_titles: new Set(['Wicked']),
      min_consecutive_wait_min: 5,
      max_consecutive_wait_min: 45
    });

    const schedules = optimizer.findSchedules(5);
    expect(schedules.length).toBeGreaterThan(0);
    for (const sched of schedules) {
      expect(sched.showings.some(s => s.title === 'Wicked')).toBe(true);
    }
  });

  it('accommodates activity breaks like Lunch', () => {
    const lunch = new ActivityBreak(
      'Lunch',
      parseMarathonTime('11:30am'),
      parseMarathonTime('2:30pm'),
      45,
      90
    );

    const optimizer = new ScheduleOptimizer({
      showings: allShowings,
      num_movies: 2,
      activity_breaks: [lunch],
      min_consecutive_wait_min: 5,
      max_consecutive_wait_min: 45,
      require_all_breaks: true
    });

    const schedules = optimizer.findSchedules(5);
    expect(schedules.length).toBeGreaterThan(0);
    const top = schedules[0];
    expect(top).toBeDefined();
    expect(top!.breaks.length).toBe(1);
    expect(top!.breaks[0]![0].name).toBe('Lunch');
    expect(top!.pattern_description).toContain('Lunch');
  });

  it('supports pinned anchor showings', () => {
    const anchor = createMovieShowing({
      title: 'Coyote vs. Acme',
      theater: 'AMC Westminster',
      format_name: 'Dolby Cinema at AMC',
      start_time_str: '10:40am',
      start_min: parseMarathonTime('10:40am'),
      runtime_min: 103,
      trailer_min: 20
    });

    const optimizer = new ScheduleOptimizer({
      showings: allShowings,
      num_movies: 2,
      pinned_showing: anchor,
      min_consecutive_wait_min: 5,
      max_consecutive_wait_min: 45
    });

    const schedules = optimizer.findSchedules(5);
    expect(schedules.length).toBeGreaterThan(0);
    for (const sched of schedules) {
      expect(sched.showings.some(s => s.title === 'Coyote vs. Acme' && s.start_min === anchor.start_min)).toBe(true);
    }
  });

  describe('Flexible / Relaxed Fallback Discovery', () => {
    it('discovers schedules by auto-adding a break or relaxing wait when strict max_wait yields 0 results', () => {
      // Movie A ends at 12:00pm (10:00am + 20m trailer + 100m runtime), Movie B starts at 1:05pm (65m gap during Lunch)
      const showings = [
        createMovieShowing({
          title: 'Movie A',
          format_name: 'IMAX',
          start_time_str: '10:00am',
          start_min: parseMarathonTime('10:00am'),
          runtime_min: 100,
          trailer_min: 20,
        }),
        createMovieShowing({
          title: 'Movie B',
          format_name: 'IMAX',
          start_time_str: '1:05pm',
          start_min: parseMarathonTime('1:05pm'),
          runtime_min: 100,
          trailer_min: 20,
        }),
      ];

      const optimizer = new ScheduleOptimizer({
        showings,
        num_movies: 2,
        min_consecutive_wait_min: 0,
        max_consecutive_wait_min: 15, // Strict max wait is 15m, no breaks configured
      });

      expect(optimizer.findSchedules()).toHaveLength(0);

      const fallback = optimizer.findSchedulesWithFallback(5, 3);
      expect(fallback).toHaveLength(1);
      expect(fallback[0]!.is_relaxed).toBe(true);
      expect(fallback[0]!.showings).toHaveLength(2);
      expect(fallback[0]!.relaxations.some((r) => r.type === 'break_added')).toBe(true);
      expect(fallback[0]!.breaks[0]![0].name).toBe('Lunch');
    });

    it('discovers schedules by removing a required break when only tight connections exist', () => {
      // Movie A ends at 12:00pm, Movie B starts at 12:10pm (10m gap, cannot fit 60m Lunch)
      const showings = [
        createMovieShowing({
          title: 'Movie A',
          format_name: 'Dolby',
          start_time_str: '10:00am',
          start_min: parseMarathonTime('10:00am'),
          runtime_min: 100,
          trailer_min: 20,
        }),
        createMovieShowing({
          title: 'Movie B',
          format_name: 'Dolby',
          start_time_str: '12:10pm',
          start_min: parseMarathonTime('12:10pm'),
          runtime_min: 100,
          trailer_min: 20,
        }),
      ];

      const lunch = new ActivityBreak('Lunch', 660, 870, 50, 85);
      const optimizer = new ScheduleOptimizer({
        showings,
        num_movies: 2,
        activity_breaks: [lunch],
        min_consecutive_wait_min: 0,
        max_consecutive_wait_min: 15,
        require_all_breaks: true,
      });

      expect(optimizer.findSchedules()).toHaveLength(0);

      const fallback = optimizer.findSchedulesWithFallback(5, 3);
      expect(fallback).toHaveLength(1);
      expect(fallback[0]!.is_relaxed).toBe(true);
      expect(fallback[0]!.relaxations.some((r) => r.type === 'break_omitted')).toBe(true);
    });

    it('discovers schedules using fallback formats and slightly relaxed time windows', () => {
      const showings = [
        createMovieShowing({
          title: 'Movie A',
          format_name: 'IMAX',
          start_time_str: '9:15am', // 15m before 9:30am earliest_start
          start_min: parseMarathonTime('9:15am'),
          runtime_min: 100,
          trailer_min: 20,
        }),
        createMovieShowing({
          title: 'Movie B',
          format_name: 'Digital',
          start_time_str: '11:25am', // 10m after Movie A ends (11:15am), marked as format fallback
          start_min: parseMarathonTime('11:25am'),
          runtime_min: 100,
          trailer_min: 20,
          is_format_fallback: true,
        }),
      ];

      const optimizer = new ScheduleOptimizer({
        showings,
        num_movies: 2,
        earliest_start_min: parseMarathonTime('9:30am'),
        latest_end_min: parseMarathonTime('10:00pm'),
        min_consecutive_wait_min: 0,
        max_consecutive_wait_min: 15,
      });

      expect(optimizer.findSchedules()).toHaveLength(0);

      const fallback = optimizer.findSchedulesWithFallback(5, 3);
      expect(fallback).toHaveLength(1);
      expect(fallback[0]!.is_relaxed).toBe(true);
      expect(fallback[0]!.relaxations.some((r) => r.type === 'time_window')).toBe(true);
      expect(fallback[0]!.relaxations.some((r) => r.type === 'format_fallback')).toBe(true);
    });
    it('always supplements strict schedules up to maxSupplement without increasing total count when filters tighten', () => {
      // Movie A at 10:00am (ends 12:00pm), Movie B at 12:10pm (10m gap), Movie C at 12:25pm (25m gap)
      const showings = [
        createMovieShowing({
          title: 'Movie A',
          format_name: 'IMAX',
          start_time_str: '10:00am',
          start_min: parseMarathonTime('10:00am'),
          runtime_min: 100,
          trailer_min: 20,
        }),
        createMovieShowing({
          title: 'Movie B',
          format_name: 'IMAX',
          start_time_str: '12:10pm',
          start_min: parseMarathonTime('12:10pm'),
          runtime_min: 100,
          trailer_min: 20,
        }),
        createMovieShowing({
          title: 'Movie C',
          format_name: 'IMAX',
          start_time_str: '12:25pm',
          start_min: parseMarathonTime('12:25pm'),
          runtime_min: 100,
          trailer_min: 20,
        }),
      ];

      const optimizer = new ScheduleOptimizer({
        showings,
        num_movies: 2,
        min_consecutive_wait_min: 0,
        max_consecutive_wait_min: 15, // A->B (10m) is strict; A->C (25m) is +10m relaxed
      });

      const results = optimizer.findSchedulesWithFallback(20, 5);
      expect(results).toHaveLength(2);
      expect(results[0]!.is_relaxed).toBe(false);
      expect(results[1]!.is_relaxed).toBe(true);
      expect(results[1]!.relaxations[0]!.note).toBe('+10m over max wait');
    });
  });

  it('folds pre-break gaps into the break so there is never a wait before a break', () => {
    // Movie A ends at 4:58pm (2:45pm + 25m trailers + 108m runtime), Movie B starts at 6:30pm.
    // Dinner window starts at 5:00pm (2m after Movie A ends).
    const showings = [
      createMovieShowing({
        title: 'Clayface',
        format_name: 'Digital',
        start_time_str: '2:45pm',
        start_min: parseMarathonTime('2:45pm'),
        runtime_min: 108,
        trailer_min: 25,
      }),
      createMovieShowing({
        title: 'Drummer Boy',
        format_name: 'Digital',
        start_time_str: '6:30pm',
        start_min: parseMarathonTime('6:30pm'),
        runtime_min: 129,
        trailer_min: 25,
      }),
    ];

    const dinner = new ActivityBreak(
      'Dinner',
      parseMarathonTime('5:00pm'),
      parseMarathonTime('8:30pm'),
      50,
      95
    );

    const strictOptimizer = new ScheduleOptimizer({
      showings,
      num_movies: 2,
      activity_breaks: [dinner],
      min_consecutive_wait_min: 5,
      max_consecutive_wait_min: 15,
      require_all_breaks: true,
    });

    const strictSchedules = strictOptimizer.findSchedules();
    expect(strictSchedules).toHaveLength(1);
    const strictItems = strictSchedules[0]!.timeline_items;
    expect(strictItems.map((i) => i.item_type)).toEqual([
      TimelineItemType.MOVIE,
      TimelineItemType.BREAK,
      TimelineItemType.MOVIE,
    ]);
    expect(strictItems[1]!.start_min).toBe(parseMarathonTime('4:58pm'));
    expect(strictItems[1]!.end_min).toBe(parseMarathonTime('6:30pm'));
    expect(strictItems[1]!.duration_min).toBe(92);
    expect(strictSchedules[0]!.total_wasted_wait_min).toBe(0);

    // Also verify auto-added relaxed break folds the pre-window 2m into the break
    const relaxedOptimizer = new ScheduleOptimizer({
      showings,
      num_movies: 2,
      min_consecutive_wait_min: 5,
      max_consecutive_wait_min: 15,
    });
    const relaxedSchedules = relaxedOptimizer.findSchedulesWithFallback(5, 3);
    expect(relaxedSchedules).toHaveLength(1);
    const relaxedItems = relaxedSchedules[0]!.timeline_items;
    expect(relaxedItems.map((i) => i.item_type)).toEqual([
      TimelineItemType.MOVIE,
      TimelineItemType.BREAK,
      TimelineItemType.MOVIE,
    ]);
    expect(relaxedItems[1]!.start_min).toBe(parseMarathonTime('4:58pm'));
    expect(relaxedItems[1]!.duration_min).toBe(92);
    expect(relaxedSchedules[0]!.total_wasted_wait_min).toBe(0);
  });
});
