import type {
  TheaterResponse,
  DateOptionResponse,
  MovieResponse,
  ShowingItemResponse,
  ShowtimesResponse,
  ScheduleResponse,
  TimelineItemResponse,
  BreakConfigSchema,
  PinnedShowingSchema,
} from '../../../shared/types/schemas';

export type Theater = TheaterResponse;
export type DateOption = DateOptionResponse;
export type Movie = MovieResponse;
export type ShowingItem = ShowingItemResponse;
export type Showing = ShowingItemResponse;
export type TimelineItem = TimelineItemResponse;
export type Schedule = ScheduleResponse;
export type BreakConfig = BreakConfigSchema;
export type PinnedShowing = PinnedShowingSchema;

export interface MetadataProgressState {
  isOpen: boolean;
  status: string;
  current: number;
  total: number;
  currentTitle?: string;
  title?: string;
  subtitle?: string;
  lastMovie?: string;
}

export type {
  ShowtimesResponse,
  ScheduleResponse,
  BreakConfigSchema,
  PinnedShowingSchema,
};
