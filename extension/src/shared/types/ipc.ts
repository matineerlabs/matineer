import {
  AMCTheater,
  ShowtimesResponse,
  MovieResponse,
  UserMovieStatus,
  MovieDayStatus,
  SolveSchedulesRequest,
  ScheduleResponse,
  SuggestOptionsRequest,
  SuggestOptionsResponse,
  ClearCacheResponse,
  RemoteStatusResponse,
  TriggerExtensionUpdateResponse,
} from './schemas';

// --- Typed IPC Messages for chrome.runtime.sendMessage ---

// 1. Catalog & Showtimes
export type GetTheatersMessage = {
  action: 'GET_THEATERS';
};
export type GetTheatersResponse = AMCTheater[];

export type GetShowtimesMessage = {
  action: 'GET_SHOWTIMES';
  payload: {
    theater_id: string;
    date_str: string;
    force_refresh?: boolean;
  };
};
export type GetShowtimesResponse = ShowtimesResponse;

// 2. Metadata Stream
export type SubscribeMetadataMessage = {
  action: 'SUBSCRIBE_METADATA';
  payload: {
    theater_id: string;
    date_str: string;
    mdblist_api_key?: string;
  };
};
export type SubscribeMetadataResponse = { success: boolean };

export type CancelMetadataStreamMessage = {
  action: 'CANCEL_METADATA_STREAM';
};
export type CancelMetadataStreamResponse = { success: boolean };

// 3. User Preferences & Selections
export type UpdateMovieStatusMessage = {
  action: 'UPDATE_MOVIE_STATUS';
  payload: {
    title: string;
    status: UserMovieStatus;
  };
};
export type UpdateMovieStatusResponse = { success: boolean };

export type ResetMovieStatusesMessage = {
  action: 'RESET_MOVIE_STATUSES';
  payload: {
    status: UserMovieStatus;
  };
};
export type ResetMovieStatusesResponse = { success: boolean; count: number };

export type UpdateDaySelectionMessage = {
  action: 'UPDATE_DAY_SELECTION';
  payload: {
    date_str: string;
    movie_title: string;
    status: MovieDayStatus;
    allowed_formats?: string[];
  };
};
export type UpdateDaySelectionResponse = { success: boolean };

export type BatchUpdateDaySelectionMessage = {
  action: 'BATCH_UPDATE_DAY_SELECTION';
  payload: {
    date_str: string;
    movie_titles: string[];
    status: MovieDayStatus;
  };
};
export type BatchUpdateDaySelectionResponse = { success: boolean };

export type GetUserPreferencesMessage = {
  action: 'GET_USER_PREFERENCES';
};
export type GetUserPreferencesResponse = {
  seen_movies: string[];
  wont_watch_movies: string[];
};

// 4. Solver
export type SolveSchedulesMessage = {
  action: 'SOLVE_SCHEDULES';
  payload: SolveSchedulesRequest;
};
export type SolveSchedulesResponse = ScheduleResponse[];

export type SuggestOptionsMessage = {
  action: 'SUGGEST_OPTIONS';
  payload: SuggestOptionsRequest;
};
export type SuggestOptionsResponseMessage = SuggestOptionsResponse;

// 5. Cache
export type ClearCacheMessage = {
  action: 'CLEAR_CACHE';
  payload: { target: string };
};
export type ClearCacheResponsePayload = ClearCacheResponse;

// 6. Remote Status & Self-Updater
export type GetRemoteStatusMessage = {
  action: 'GET_REMOTE_STATUS';
  payload: { force_refresh?: boolean };
};
export type GetRemoteStatusResponse = RemoteStatusResponse;

export type TriggerExtensionUpdateMessage = {
  action: 'TRIGGER_EXTENSION_UPDATE';
};
export type TriggerExtensionUpdateResponsePayload = TriggerExtensionUpdateResponse;

// Union of all possible IPC Messages requested by the frontend
export type IpcMessage =
  | GetTheatersMessage
  | GetShowtimesMessage
  | SubscribeMetadataMessage
  | CancelMetadataStreamMessage
  | UpdateMovieStatusMessage
  | ResetMovieStatusesMessage
  | UpdateDaySelectionMessage
  | BatchUpdateDaySelectionMessage
  | GetUserPreferencesMessage
  | SolveSchedulesMessage
  | SuggestOptionsMessage
  | ClearCacheMessage
  | GetRemoteStatusMessage
  | TriggerExtensionUpdateMessage;

// Helper Type for Return mapping
export type IpcResponse<T extends IpcMessage['action']> =
  T extends 'GET_THEATERS' ? GetTheatersResponse :
  T extends 'GET_SHOWTIMES' ? GetShowtimesResponse :
  T extends 'SUBSCRIBE_METADATA' ? SubscribeMetadataResponse :
  T extends 'CANCEL_METADATA_STREAM' ? CancelMetadataStreamResponse :
  T extends 'UPDATE_MOVIE_STATUS' ? UpdateMovieStatusResponse :
  T extends 'RESET_MOVIE_STATUSES' ? ResetMovieStatusesResponse :
  T extends 'UPDATE_DAY_SELECTION' ? UpdateDaySelectionResponse :
  T extends 'BATCH_UPDATE_DAY_SELECTION' ? BatchUpdateDaySelectionResponse :
  T extends 'GET_USER_PREFERENCES' ? GetUserPreferencesResponse :
  T extends 'SOLVE_SCHEDULES' ? SolveSchedulesResponse :
  T extends 'SUGGEST_OPTIONS' ? SuggestOptionsResponseMessage :
  T extends 'CLEAR_CACHE' ? ClearCacheResponsePayload :
  T extends 'GET_REMOTE_STATUS' ? GetRemoteStatusResponse :
  T extends 'TRIGGER_EXTENSION_UPDATE' ? TriggerExtensionUpdateResponsePayload :
  never;
