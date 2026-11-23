import Dexie, { type Table } from 'dexie';
import { MovieDayStatus, UserMovieStatus } from '../types/movie';

// --- Database Interfaces ---

export interface MovieStatus {
  movie_title: string;
  movie_title_lower: string; // for case-insensitive querying
  status: UserMovieStatus;
  updated_at: number; // timestamp
}

export interface DayMovieSelection {
  id?: string; // Compound primary key format: date_str|movie_title_lower
  date_str: string;
  movie_title: string;
  movie_title_lower: string;
  status: MovieDayStatus;
  allowed_formats?: string[] | null;
  updated_at: number;
}

export interface ShowtimeCache {
  id?: string; // provider_id|theater_id|date_str
  provider_id: string;
  theater_id: string;
  date_str: string;
  movies_json: any; // Store as parsed JSON for efficiency
  fetched_at: number;
}

export interface MovieMetadata {
  movie_title: string;
  movie_title_lower: string;
  metadata_json: any;
  fetched_at: number;
}

// --- Database Implementation ---

export class MatineerDB extends Dexie {
  movieStatus!: Table<MovieStatus, string>;
  dayMovieSelections!: Table<DayMovieSelection, string>;
  showtimeCache!: Table<ShowtimeCache, string>;
  movieMetadata!: Table<MovieMetadata, string>;

  constructor() {
    super('MatineerDatabase');

    this.version(1).stores({
      movieStatus: 'movie_title_lower, movie_title, status',
      dayMovieSelections: 'id, [date_str+movie_title_lower], date_str, movie_title_lower, status',
      showtimeCache: 'id, [provider_id+theater_id+date_str], provider_id, theater_id, date_str',
      movieMetadata: 'movie_title_lower, movie_title'
    });

    this.version(2).stores({
      movieStatus: 'movie_title_lower, movie_title, status',
      dayMovieSelections: 'id, date_str, movie_title_lower, status',
      showtimeCache: 'id, provider_id, theater_id, date_str, fetched_at',
      movieMetadata: 'movie_title_lower, movie_title, fetched_at'
    });
  }
}

export const db = new MatineerDB();
