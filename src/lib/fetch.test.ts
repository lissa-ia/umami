import { afterEach, describe, expect, test, vi } from 'vitest';
import { request } from './fetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(res: Response) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res));
}

describe('request', () => {
  test('returns a FetchResponse instead of throwing on a 204 with no body', async () => {
    mockFetch(new Response(null, { status: 204 }));

    const response = await request('DELETE', '/api/websites/1');

    expect(response).toEqual({ ok: true, status: 204, data: undefined });
    expect(response.error).toBeUndefined();
  });

  test('returns a FetchResponse instead of throwing on a non-JSON body', async () => {
    mockFetch(new Response('<html>Bad Gateway</html>', { status: 502, statusText: 'Bad Gateway' }));

    const response = await request('GET', '/api/websites/1');

    expect(response.ok).toBe(false);
    expect(response.status).toBe(502);
    expect(response.data).toBeUndefined();
  });

  test('fills the error field from the error body on a 400 response', async () => {
    mockFetch(
      Response.json(
        { error: { status: 500, message: 'Bad request', code: 'bad-request' } },
        { status: 400 },
      ),
    );

    const response = await request('POST', '/api/websites', '{}');

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
    expect(response.data).toEqual({
      error: { status: 500, message: 'Bad request', code: 'bad-request' },
    });
    expect(response.error).toEqual({
      error: { status: 400, message: 'Bad request', code: 'bad-request' },
    });
  });

  test('fills the error field even when the error body is not JSON', async () => {
    mockFetch(new Response('<html>Bad Gateway</html>', { status: 502, statusText: 'Bad Gateway' }));

    const response = await request('GET', '/api/websites/1');

    expect(response.error?.error.status).toBe(502);
    expect(response.error?.error.message).toBe('Bad Gateway');
    expect(response.error?.error.code).toBeUndefined();
  });

  test('falls back to a string message when the error body message is not a string', async () => {
    mockFetch(Response.json({ error: { message: 400 } }, { status: 500, statusText: '' }));

    const response = await request('GET', '/api/websites/1');

    expect(response.error?.error.status).toBe(500);
    expect(response.error?.error.message).toBe('Request failed');
  });

  test('keeps the happy path unchanged for a 200 with a JSON body', async () => {
    mockFetch(Response.json({ id: 1, name: 'example' }, { status: 200 }));

    const response = await request('GET', '/api/websites/1');

    expect(response).toEqual({ ok: true, status: 200, data: { id: 1, name: 'example' } });
    expect(response.error).toBeUndefined();
  });
});
