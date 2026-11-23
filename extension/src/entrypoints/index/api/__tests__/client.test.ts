import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyMdblistKey } from '../client';

describe('verifyMdblistKey', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return error for empty or whitespace-only key', async () => {
    const resEmpty = await verifyMdblistKey('');
    expect(resEmpty.valid).toBe(false);
    expect(resEmpty.message).toContain('empty');

    const resWhitespace = await verifyMdblistKey('   ');
    expect(resWhitespace.valid).toBe(false);
    expect(resWhitespace.message).toContain('empty');
  });

  it('should return valid true when MDBList responds with movie title', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        title: 'Inception',
        score: 85,
      }),
    } as any);

    const res = await verifyMdblistKey('valid-key-123');
    expect(res.valid).toBe(true);
    expect(res.message).toContain('verified successfully');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.mdblist.com/imdb/movie/tt1375666?apikey=valid-key-123')
    );
  });

  it('should return valid true when MDBList responds with ids or response=True', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ids: { imdb: 'tt1375666' },
      }),
    } as any);

    const res = await verifyMdblistKey('valid-key-123');
    expect(res.valid).toBe(true);
    expect(res.message).toContain('verified successfully');
  });

  it('should return valid false when MDBList returns 401 with error message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: 'Invalid API key or token',
      }),
    } as any);

    const res = await verifyMdblistKey('bad-key');
    expect(res.valid).toBe(false);
    expect(res.message).toBe('Invalid API key or token');
  });

  it('should return default invalid message when 401/403 body is unparseable', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => {
        throw new Error('Not JSON');
      },
    } as any);

    const res = await verifyMdblistKey('bad-key');
    expect(res.valid).toBe(false);
    expect(res.message).toBe('Invalid MDBList API key.');
  });

  it('should return valid false when 200 response contains an error property', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        error: 'Movie not found',
      }),
    } as any);

    const res = await verifyMdblistKey('some-key');
    expect(res.valid).toBe(false);
    expect(res.message).toBe('Movie not found');
  });

  it('should handle HTTP error status from server', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as any);

    const res = await verifyMdblistKey('bad-key');
    expect(res.valid).toBe(false);
    expect(res.message).toContain('HTTP error: 500');
  });

  it('should handle fetch rejection / network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const res = await verifyMdblistKey('any-key');
    expect(res.valid).toBe(false);
    expect(res.message).toContain('Network offline');
  });
});
