import theaters from '../shared/data/amc_theaters.json';
/// <reference types="wxt/vite-builder-env" />
import type { IpcMessage } from '../shared/types/ipc';
import { preferencesRepo } from '../shared/db/repositories/preferencesRepo';
import { cacheRepo } from '../shared/db/repositories/cacheRepo';
import { getShowtimesService } from '../shared/services/showtimesService';
import { solveSchedulesService } from '../shared/services/solverService';
import { streamMetadataService, cancelMetadataStream } from '../shared/services/metadataService';
import { getRemoteStatus } from '../shared/config/remoteStatus';

const BACKGROUND_ACTIONS = new Set<string>([
  'GET_THEATERS',
  'GET_SHOWTIMES',
  'SOLVE_SCHEDULES',
  'SUBSCRIBE_METADATA',
  'CANCEL_METADATA_STREAM',
  'UPDATE_MOVIE_STATUS',
  'UPDATE_DAY_SELECTION',
  'BATCH_UPDATE_DAY_SELECTION',
  'GET_USER_PREFERENCES',
  'RESET_MOVIE_STATUSES',
  'CLEAR_CACHE',
  'GET_REMOTE_STATUS',
  'TRIGGER_EXTENSION_UPDATE',
]);

export default defineBackground(() => {
  // Automatically apply pending CWS updates when downloaded ONLY if the user's
  // currently running version is outdated (< min_version).
  if (typeof chrome !== 'undefined' && chrome.runtime?.onUpdateAvailable) {
    chrome.runtime.onUpdateAvailable.addListener(async () => {
      try {
        const status = await getRemoteStatus(true);
        if (status.is_outdated) {
          chrome.runtime.reload();
        }
      } catch {
        // Ignore errors; update will apply on next browser/extension restart
      }
    });
  }
  // IPC Message Router
  chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
    // If explicitly directed to another target (e.g. 'offscreen'), ignore
    if (message?.target && message.target !== 'background') {
      return false;
    }

    // Ignore messages that are not actions meant for the background worker (e.g. METADATA_UPDATE)
    if (!message || !message.action || !BACKGROUND_ACTIONS.has(message.action)) {
      return false;
    }

    (async () => {
      try {
        switch (message.action) {
          case 'GET_THEATERS':
            sendResponse(theaters.map((t: any) => ({ ...t, chain: 'AMC' })));
            break;

          case 'GET_SHOWTIMES': {
            const data = await getShowtimesService(message.payload);
            sendResponse(data);
            break;
          }

          case 'SOLVE_SCHEDULES': {
            const results = await solveSchedulesService(message.payload);
            sendResponse(results);
            break;
          }

          case 'SUBSCRIBE_METADATA': {
            sendResponse({ success: true });
            // Run streaming asynchronously in the background
            streamMetadataService(message.payload).catch((err) => {
              console.error('Metadata stream error:', err);
            });
            return;
          }

          case 'CANCEL_METADATA_STREAM': {
            cancelMetadataStream();
            sendResponse({ success: true });
            break;
          }

          case 'UPDATE_MOVIE_STATUS':
            await preferencesRepo.setMovieStatus(message.payload.title, message.payload.status);
            sendResponse({ success: true });
            break;

          case 'UPDATE_DAY_SELECTION':
            await preferencesRepo.setDaySelection(
              message.payload.date_str,
              message.payload.movie_title,
              message.payload.status,
              message.payload.allowed_formats
            );
            sendResponse({ success: true });
            break;

          case 'BATCH_UPDATE_DAY_SELECTION':
            await preferencesRepo.batchSetDaySelections(
              message.payload.date_str,
              message.payload.movie_titles,
              message.payload.status
            );
            sendResponse({ success: true });
            break;

          case 'GET_USER_PREFERENCES': {
            const prefs = await preferencesRepo.getAllMovieStatuses();
            sendResponse(prefs);
            break;
          }

          case 'RESET_MOVIE_STATUSES': {
            const count = await preferencesRepo.resetMovieStatuses(message.payload.status);
            sendResponse({ success: true, count });
            break;
          }

          case 'CLEAR_CACHE': {
            const target = message.payload.target as 'showtimes' | 'metadata' | 'all';
            const result = await cacheRepo.clearCache(target);
            sendResponse({
              success: true,
              target,
              cleared_showtimes: result.showtimes,
              cleared_metadata: result.metadata,
              message: `Cleared cache for ${target}`,
            });
            break;
          }

          case 'GET_REMOTE_STATUS': {
            const force = Boolean(message.payload?.force_refresh);
            const status = await getRemoteStatus(force);
            sendResponse(status);
            break;
          }

          case 'TRIGGER_EXTENSION_UPDATE': {
            const remoteStatus = await getRemoteStatus(true);
            if (typeof chrome !== 'undefined' && chrome.runtime?.requestUpdateCheck) {
              chrome.runtime.requestUpdateCheck((checkStatus) => {
                if (checkStatus === 'update_available') {
                  sendResponse({
                    status: 'update_available',
                    reloading: true,
                    remote_status: remoteStatus,
                  });
                  setTimeout(() => {
                    chrome.runtime.reload();
                  }, 150);
                } else {
                  sendResponse({
                    status: (checkStatus as any) || 'no_update',
                    reloading: false,
                    remote_status: remoteStatus,
                  });
                }
              });
            } else {
              sendResponse({
                status: 'no_update',
                reloading: false,
                remote_status: remoteStatus,
              });
            }
            break;
          }
        }
      } catch (err: any) {
        console.error(`Error processing action ${message.action}:`, err);
        sendResponse({ error: err.message || 'Unknown error occurred in background script.' });
      }
    })();

    // Return true to indicate asynchronous response
    return true;
  });

  // Open the standalone index.html app when the extension icon is clicked
  chrome.action.onClicked.addListener(async () => {
    const appUrl = chrome.runtime.getURL('index.html');
    const tabs = await chrome.tabs.query({ url: appUrl });
    if (tabs.length > 0 && tabs[0]?.id) {
      chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      chrome.tabs.create({ url: appUrl });
    }
  });
});
