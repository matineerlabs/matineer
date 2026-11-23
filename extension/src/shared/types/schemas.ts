import { MovieDayStatus, UserMovieStatus, TimelineItemType } from "./movie";
export * from "./movie";
// --- Theaters & Dates ---
export interface TheaterResponse {
  id: string;
  name: string;
  chain?: string;
  timezone?: string;
  state?: string | null;
  state_code?: string | null;
  city?: string | null;
  address?: string | null;
  postal_code?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  google_maps_url?: string | null;
  city_slug?: string | null;
  showtimes_url?: string | null;
}

export type AMCTheater = TheaterResponse;

export interface SuggestOptionsResponse {
  options?: any[];
}

export interface ClearCacheResponse {
  success: boolean;
  target: string;
  cleared_showtimes?: number;
  cleared_metadata?: number;
  message: string;
}

export interface DateOptionResponse {
  date_str: string;
  display_label: string;
}

// --- Showtimes & Movies ---
export interface ShowingItemResponse {
  time: string;
  url?: string | null;
  booking_urls?: string[];
  program_label?: string | null;
  is_sold_out?: boolean;
}

export interface MovieShowingResponse {
  title: string;
  format_name: string;
  start_time_str: string;
  feature_start_str: string;
  end_time_str: string;
  start_min: number;
  end_min: number;
  runtime_min: number;
  trailer_min?: number;
  booking_url?: string | null;
  booking_urls?: string[];
  poster_url?: string | null;
  is_premium?: boolean;
  is_a_list_eligible?: boolean;
  program_label?: string | null;
  is_format_fallback?: boolean;
}

export interface MovieResponse {
  title: string;
  runtime_min: number;
  runtime_str: string;
  poster_url?: string | null;
  is_a_list_eligible?: boolean;
  has_premium_format?: boolean;
  all_formats?: string[];
  showings_by_format?: Record<string, ShowingItemResponse[]>;
  program_labels?: string[];

  status?: MovieDayStatus;
  user_status?: UserMovieStatus;
  allowed_formats?: string[];

  rated?: string | null;
  genre?: string | null;
  rt_score?: string | null;
  audience_score?: string | null;
  imdb_rating?: string | null;
  imdb_id?: string | null;
  plot?: string | null;
  live_ratings_populated?: boolean;
}

export interface ShowtimesResponse {
  theater_id: string;
  theater_name: string;
  date: string;
  movies: MovieResponse[];
  total_showings: number;
  showtimes_url?: string;
}

export interface RemoteStatusResponse {
  current_version: string;
  min_version: string;
  is_outdated: boolean;
  update_available: boolean;
  message: string;
}

export interface TriggerExtensionUpdateResponse {
  status: 'update_available' | 'no_update' | 'throttled' | 'error';
  reloading: boolean;
  remote_status: RemoteStatusResponse;
}

// --- User Preferences ---
export interface MovieStatusUpdateRequest {
  title: string;
  status: UserMovieStatus;
}

export interface DaySelectionUpdateRequest {
  date_str: string;
  movie_title: string;
  status: MovieDayStatus;
  allowed_formats?: string[] | null;
}

export interface DayBatchUpdateRequest {
  date_str: string;
  movie_titles: string[];
  status: MovieDayStatus;
}

export interface UserPreferencesResponse {
  seen_movies: string[];
  wont_watch_movies: string[];
}

// --- Schedule Optimizer ---
export interface BreakConfigSchema {
  id: string;
  intent: string;
  size: string;
}

export interface PinnedShowingSchema {
  title: string;
  format_name: string;
  time: string;
  url?: string | null;
  booking_urls?: string[];
}

export interface SolveSchedulesRequest {
  theater_id?: string;
  date: string;
  num_movies?: number;
  earliest_start?: string;
  latest_end?: string;
  trailer_min?: number;
  min_wait_min?: number;
  max_wait_min?: number;
  breaks?: BreakConfigSchema[];
  movie_formats?: Record<string, string[]> | null;
  pinned_showing?: PinnedShowingSchema | null;
  prefer_premium_formats?: boolean;
}

export type RelaxationType =
  | "max_wait"
  | "min_wait"
  | "time_window"
  | "break_resized"
  | "break_window"
  | "break_omitted"
  | "break_added"
  | "format_fallback";

export interface ScheduleRelaxation {
  type: RelaxationType;
  description: string;
  target?: string;
  note?: string;
}

export interface TimelineItemResponse {
  item_type: TimelineItemType;
  label: string;
  start_min: number;
  end_min: number;
  start_str: string;
  end_str: string;
  duration_min: number;
  showing?: MovieShowingResponse | null;
}

export interface ScheduleResponse {
  schedule_id: number;
  pattern_description: string;
  start_time_str: string;
  end_time_str: string;
  start_min: number;
  end_min: number;
  total_wasted_wait_min: number;
  has_premium: boolean;
  premium_movie_count?: number;
  fast_connection_count?: number;
  movie_count: number;
  timeline_items: TimelineItemResponse[];
  is_relaxed?: boolean;
  penalty_score?: number;
  relaxations?: ScheduleRelaxation[];
}

// --- Interactive Suggester ---
export interface SuggestOptionsRequest {
  theater_id?: string;
  date: string;
  anchor_title: string;
  anchor_format: string;
  anchor_start_time: string;
  num_movies?: number;
  earliest_start?: string;
  latest_end?: string;
  trailer_min?: number;
  min_wait_min?: number;
  max_wait_min?: number;
  breaks?: BreakConfigSchema[];
  break_intent?: string | null;
  movie_formats?: Record<string, string[]> | null;
}
