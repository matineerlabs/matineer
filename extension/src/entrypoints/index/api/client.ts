import { MovieDayStatus, UserMovieStatus } from '../../../shared/types/movie';
import { sendCommand } from "../../../shared/api/ipcClient";
import type {
  TheaterResponse,
  ShowtimesResponse,
  ScheduleResponse,
  RemoteStatusResponse,
  TriggerExtensionUpdateResponse,
} from "../../../shared/types/schemas";
import type { BreakConfig, PinnedShowing } from "../types/api";

export async function fetchTheaters(): Promise<TheaterResponse[]> {
  return sendCommand("GET_THEATERS");
}

export async function fetchShowtimes(
  theaterId: string,
  date: string,
  forceRefresh: boolean = false,
  mdblistApiKey?: string,
  signal?: AbortSignal
): Promise<ShowtimesResponse> {
  return sendCommand(
    "GET_SHOWTIMES",
    {
      theater_id: theaterId,
      date_str: date,
      force_refresh: forceRefresh,
    },
    signal
  );
}

export async function verifyMdblistKey(
  apiKey: string
): Promise<{ valid: boolean; message: string }> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { valid: false, message: "MDBList API key cannot be empty." };
  }

  try {
    const res = await fetch(
      `https://api.mdblist.com/imdb/movie/tt1375666?apikey=${encodeURIComponent(trimmed)}`
    );

    if (res.status === 401 || res.status === 403) {
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore JSON parse failure
      }
      return {
        valid: false,
        message: data?.error || data?.message || "Invalid MDBList API key.",
      };
    }

    if (!res.ok) {
      return { valid: false, message: `MDBList returned HTTP error: ${res.status}` };
    }

    const data = await res.json();
    if (data && (data.title || data.ids || data.response === "True") && !data.error) {
      return { valid: true, message: "MDBList API key verified successfully!" };
    }

    return {
      valid: false,
      message: data?.error || data?.message || "Invalid MDBList API key.",
    };
  } catch (err: any) {
    return {
      valid: false,
      message: err?.message
        ? `Verification failed: ${err.message}`
        : "Network error verifying API key.",
    };
  }
}

export async function clearCache(
  target: "showtimes" | "metadata" | "all" = "showtimes"
): Promise<{
  success: boolean;
  target: string;
  cleared_showtimes?: number;
  cleared_metadata?: number;
  message: string;
}> {
  const res = await sendCommand("CLEAR_CACHE", { target });
  return {
    success: res.success,
    target: target,
    cleared_showtimes: res.cleared_showtimes || 0,
    cleared_metadata: res.cleared_metadata || 0,
    message: res.message
  };
}

export function subscribeMetadataStream(
  theaterId: string,
  date: string,
  mdblistApiKey?: string,
  onEvent?: (event: any) => void
): () => void {
  let isSubscribed = true;
  const listener = (message: any) => {
    if (isSubscribed && message.action === 'METADATA_UPDATE') {
      onEvent?.(message.payload);
    }
  };

  chrome.runtime.onMessage.addListener(listener);

  sendCommand("SUBSCRIBE_METADATA", {
    theater_id: theaterId,
    date_str: date,
    mdblist_api_key: mdblistApiKey
  }).catch(e => console.error("Failed to start metadata stream", e));

  return () => {
    isSubscribed = false;
    chrome.runtime.onMessage.removeListener(listener);
    sendCommand("CANCEL_METADATA_STREAM").catch(() => {});
  };
}

export async function updateMovieStatus(
  title: string,
  status: UserMovieStatus
): Promise<void> {
  await sendCommand("UPDATE_MOVIE_STATUS", {
    title,
    status,
  });
}

export async function resetMovieStatuses(
  status: UserMovieStatus
): Promise<number> {
  const res = await sendCommand("RESET_MOVIE_STATUSES", {
    status,
  });
  return res.count ?? 0;
}

export async function updateDaySelection(date_str: string, movie_title: string, status: MovieDayStatus): Promise<void> {
  await sendCommand("UPDATE_DAY_SELECTION", {
    date_str,
    movie_title,
    status,
  });
}

export async function batchUpdateDay(date_str: string, movie_titles: string[], status: MovieDayStatus): Promise<void> {
  await sendCommand("BATCH_UPDATE_DAY_SELECTION", {
    date_str,
    movie_titles,
    status,
  });
}

export interface SolveParams {
  theater_id: string;
  date: string;
  num_movies: number;
  earliest_start: string;
  latest_end: string;
  trailer_min: number;
  min_wait_min: number;
  max_wait_min: number;
  breaks: BreakConfig[];
  movie_formats?: Record<string, string[]>;
  pinned_showing?: PinnedShowing;
  prefer_premium_formats?: boolean;
}

export async function solveSchedules(
  params: SolveParams,
  signal?: AbortSignal
): Promise<ScheduleResponse[]> {
  return sendCommand("SOLVE_SCHEDULES", params, signal);
}

export async function fetchRemoteStatus(
  forceRefresh: boolean = false
): Promise<RemoteStatusResponse> {
  return sendCommand("GET_REMOTE_STATUS", { force_refresh: forceRefresh });
}

export async function triggerExtensionUpdate(): Promise<TriggerExtensionUpdateResponse> {
  return sendCommand("TRIGGER_EXTENSION_UPDATE");
}
