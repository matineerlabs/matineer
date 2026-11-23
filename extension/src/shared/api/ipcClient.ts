import type { IpcMessage, IpcResponse } from '../types/ipc';

/**
 * Sends a strongly-typed command to the background service worker.
 */
export async function sendCommand<A extends IpcMessage['action']>(
  action: A,
  payload?: Extract<IpcMessage, { action: A }> extends { payload: infer P } ? P : void,
  signal?: AbortSignal
): Promise<IpcResponse<A>> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException('Aborted', 'AbortError'));
    }

    const onAbort = () => {
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    const message = payload !== undefined ? { action, payload } : { action };
    chrome.runtime.sendMessage(message, (response) => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }

      if (signal?.aborted) {
        return;
      }

      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }

      if (response && response.error) {
        return reject(new Error(response.error));
      }

      resolve(response as IpcResponse<A>);
    });
  });
}
