import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendCommand } from '../ipcClient';

describe('ipcClient sendCommand with AbortSignal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: vi.fn(),
        lastError: null,
      },
    };
  });

  it('rejects immediately if signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      sendCommand('GET_THEATERS', undefined, controller.signal)
    ).rejects.toThrow('Aborted');

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('rejects with AbortError when signal is aborted while in flight', async () => {
    const controller = new AbortController();

    // Mock sendMessage that does not respond immediately
    (chrome.runtime.sendMessage as any).mockImplementation((_msg: any, _cb: any) => {
      // Do nothing to keep promise pending
    });

    const promise = sendCommand('GET_THEATERS', undefined, controller.signal);

    controller.abort();

    await expect(promise).rejects.toThrow('Aborted');
  });

  it('resolves normally if signal is not aborted', async () => {
    const controller = new AbortController();
    const mockResponse = [{ id: 'amc-1', name: 'AMC Theater' }];

    (chrome.runtime.sendMessage as any).mockImplementation((_msg: any, cb: any) => {
      cb(mockResponse);
    });

    const result = await sendCommand('GET_THEATERS', undefined, controller.signal);
    expect(result).toEqual(mockResponse);
  });
});
