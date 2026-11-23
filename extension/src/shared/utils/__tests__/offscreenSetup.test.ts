import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupOffscreenDocument, hasOffscreenDocument } from '../offscreenSetup';

describe('setupOffscreenDocument', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('coalesces concurrent calls so createDocument is only invoked once', async () => {
    let getContextsCallCount = 0;
    const createDocMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => setTimeout(resolve, 20));
    });

    (globalThis as any).chrome = {
      runtime: {
        getContexts: vi.fn().mockImplementation(async () => {
          getContextsCallCount++;
          // First call: not found yet
          return [];
        }),
      },
      offscreen: {
        Reason: { DOM_PARSER: 'DOM_PARSER' },
        createDocument: createDocMock,
      },
    };

    // Fire two calls concurrently
    const [p1, p2] = [setupOffscreenDocument(), setupOffscreenDocument()];
    await Promise.all([p1, p2]);

    expect(createDocMock).toHaveBeenCalledTimes(1);
  });

  it('does not create document if hasOffscreenDocument returns true', async () => {
    const createDocMock = vi.fn();

    (globalThis as any).chrome = {
      runtime: {
        getContexts: vi.fn().mockResolvedValue([{ contextType: 'OFFSCREEN_DOCUMENT' }]),
      },
      offscreen: {
        Reason: { DOM_PARSER: 'DOM_PARSER' },
        createDocument: createDocMock,
      },
    };

    await setupOffscreenDocument();
    expect(createDocMock).not.toHaveBeenCalled();
  });
});
