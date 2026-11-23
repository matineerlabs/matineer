import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { SchedulesTab } from '../SchedulesTab';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('SchedulesTab component', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root!.unmount();
      });
      root = null;
    }
    if (container) {
      container.remove();
      container = null;
    }
  });

  it('renders solving state when isSolving is true and schedules are empty', () => {
    act(() => {
      root!.render(<SchedulesTab schedules={[]} isSolving={true} />);
    });

    expect(container!.textContent).toContain('Finding Marathon Schedules...');
    expect(container!.textContent).not.toContain('No valid schedules found');
  });

  it('renders empty constraint message when not solving and no schedules found', () => {
    act(() => {
      root!.render(<SchedulesTab schedules={[]} isSolving={false} />);
    });

    expect(container!.textContent).toContain('No valid schedules found matching the constraints');
  });

  it('renders deficit message when fewer movies are included than target marathon count', () => {
    act(() => {
      root!.render(
        <SchedulesTab
          schedules={[]}
          isSolving={false}
          numMovies={3}
          selectedMoviesCount={1}
        />
      );
    });

    expect(container!.textContent).toContain('At least 3 movies must be selected');
    expect(container!.textContent).toContain('mark at least 2 more movies');
  });

  it('renders warning when too many Must-See movies are selected', () => {
    act(() => {
      root!.render(
        <SchedulesTab
          schedules={[]}
          isSolving={false}
          numMovies={2}
          mustSeeTitles={['Movie A', 'Movie B', 'Movie C']}
        />
      );
    });

    expect(container!.textContent).toContain('Too many Must-See movies selected (3) for a 2-movie marathon');
    expect(container!.textContent).toContain('Movie A, Movie B, Movie C');
  });

  it('renders pinned screening explanation when pinned showing cannot be accommodated', () => {
    act(() => {
      root!.render(
        <SchedulesTab
          schedules={[]}
          isSolving={false}
          numMovies={3}
          pinnedShowing={{
            title: 'Dune: Part Two',
            time: '2:00pm',
            format_name: 'IMAX',
          }}
        />
      );
    });

    expect(container!.textContent).toContain('No valid schedules could accommodate your pinned screening:');
    expect(container!.textContent).toContain('Dune: Part Two @ 2:00pm (IMAX)');
  });

  it('renders Must-See constraint message when Must-See titles cannot connect', () => {
    act(() => {
      root!.render(
        <SchedulesTab
          schedules={[]}
          isSolving={false}
          numMovies={3}
          mustSeeTitles={['Oppenheimer']}
        />
      );
    });

    expect(container!.textContent).toContain('No valid schedules could accommodate your Must-See movie:');
    expect(container!.textContent).toContain('Oppenheimer');
  });

  it('does not render header bar when schedules are empty', () => {
    act(() => {
      root!.render(<SchedulesTab schedules={[]} isSolving={false} />);
    });

    expect(container!.textContent).not.toContain('Optimal Marathon Schedules');
  });

  it('renders schedules and delays recalculating spinner to avoid flicker', () => {
    vi.useFakeTimers();
    try {
      const mockSchedule: any = {
        schedule_id: 'test-sched-1',
        start_min: 600,
        end_min: 960,
        start_time_str: '10:00 AM',
        end_time_str: '4:00 PM',
        total_wasted_wait_min: 30,
        has_premium: false,
        premium_movie_count: 0,
        timeline_items: [],
        screenings: [],
      };

      act(() => {
        root!.render(<SchedulesTab schedules={[mockSchedule]} isSolving={false} />);
      });

      expect(container!.textContent).toContain('#1');
      expect(container!.textContent).toContain('10:00 AM – 4:00 PM');
      expect(container!.textContent).not.toContain('Recalculating...');

      act(() => {
        root!.render(<SchedulesTab schedules={[mockSchedule]} isSolving={true} />);
      });

      // Does not flicker on immediately
      expect(container!.textContent).not.toContain('Recalculating...');

      // Appears once solving takes longer than threshold
      act(() => {
        vi.advanceTimersByTime(260);
      });

      expect(container!.textContent).toContain('Recalculating...');
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders hairline divider when close matches are included alongside exact matches', () => {
    const strictSched: any = {
      schedule_id: 1,
      start_min: 600,
      end_min: 800,
      start_time_str: '10:00am',
      end_time_str: '1:20pm',
      total_wasted_wait_min: 10,
      has_premium: false,
      timeline_items: [],
      is_relaxed: false,
    };
    const relaxedSched: any = {
      schedule_id: 2,
      start_min: 555,
      end_min: 800,
      start_time_str: '9:15am',
      end_time_str: '1:20pm',
      total_wasted_wait_min: 10,
      has_premium: false,
      timeline_items: [],
      is_relaxed: true,
      relaxations: [{ type: 'time_window', description: 'Starts 15m earlier', target: 'start', note: '15m early' }],
    };

    act(() => {
      root!.render(<SchedulesTab schedules={[strictSched, relaxedSched]} isSolving={false} />);
    });

    expect(container!.textContent).toContain('Closest options slightly outside your filters');
    expect(container!.textContent).toContain('15m early');
  });
});
