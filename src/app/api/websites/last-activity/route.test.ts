import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canViewBatchWebsites } from '@/permissions/website';
import { getWebsiteListLastActivity } from '@/queries/sql';
import { GET, schema } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/permissions/website', () => ({
  canViewBatchWebsites: vi.fn(),
}));

vi.mock('@/queries/sql', () => ({
  getWebsiteListLastActivity: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const canViewBatchWebsitesMock = vi.mocked(canViewBatchWebsites);
const getWebsiteListLastActivityMock = vi.mocked(getWebsiteListLastActivity);

const idA = '11111111-1111-4111-8111-111111111111';
const idB = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  parseRequestMock.mockReset();
  canViewBatchWebsitesMock.mockReset();
  getWebsiteListLastActivityMock.mockReset();
});

test('returns last activity keyed by website id for authorized ids', async () => {
  const auth = { user: { id: 'user-1' } };
  const query = { ids: [idA, idB] };
  const data = {
    [idA]: { lastActivity: '2024-01-02T03:04:05.000Z' },
    [idB]: { lastActivity: null },
  };

  parseRequestMock.mockResolvedValue({ auth, query, error: undefined } as any);
  canViewBatchWebsitesMock.mockResolvedValue([idA, idB]);
  getWebsiteListLastActivityMock.mockResolvedValue(data);

  const response = await GET(
    new Request(`http://localhost/api/websites/last-activity?ids=${idA},${idB}`),
  );

  expect(canViewBatchWebsitesMock).toHaveBeenCalledWith(auth, [idA, idB]);
  expect(getWebsiteListLastActivityMock).toHaveBeenCalledWith([idA, idB]);
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ data });
});

test('filters out ids the user cannot view before querying', async () => {
  const auth = { user: { id: 'user-1' } };
  // Both ids are requested, but the user may only view idA.
  const query = { ids: [idA, idB] };
  const data = { [idA]: { lastActivity: '2024-01-02T03:04:05.000Z' } };

  parseRequestMock.mockResolvedValue({ auth, query, error: undefined } as any);
  canViewBatchWebsitesMock.mockResolvedValue([idA]);
  getWebsiteListLastActivityMock.mockResolvedValue(data);

  const response = await GET(
    new Request(`http://localhost/api/websites/last-activity?ids=${idA},${idB}`),
  );

  // Only the authorized id reaches the query...
  expect(getWebsiteListLastActivityMock).toHaveBeenCalledWith([idA]);

  const body = await response.json();

  // ...and the unauthorized id is absent from the response.
  expect(body.data).toHaveProperty(idA);
  expect(body.data).not.toHaveProperty(idB);
});

test('schema parses a CSV of ids into a trimmed uuid array', () => {
  const result = schema.safeParse({ ids: `${idA}, ${idB}` });

  expect(result.success).toBe(true);
  expect(result.data).toEqual({ ids: [idA, idB] });
});

test('schema rejects non-uuid ids', () => {
  expect(schema.safeParse({ ids: 'not-a-uuid' }).success).toBe(false);
  expect(schema.safeParse({ ids: `${idA},not-a-uuid` }).success).toBe(false);
});

test('schema rejects an empty id list', () => {
  expect(schema.safeParse({ ids: '' }).success).toBe(false);
  expect(schema.safeParse({ ids: ' , ' }).success).toBe(false);
});

test('schema accepts exactly 20 ids but rejects 21', () => {
  // 20 distinct uuids is the documented upper bound and must pass...
  const twenty = Array.from(
    { length: 20 },
    (_, i) => `11111111-1111-4111-8111-${String(i).padStart(12, '0')}`,
  );
  const twentyResult = schema.safeParse({ ids: twenty.join(',') });

  expect(twentyResult.success).toBe(true);
  expect(twentyResult.data?.ids).toHaveLength(20);

  // ...while one more must be rejected (guards against an off-by-one on .max).
  const twentyOne = schema.safeParse({ ids: [...twenty, idB].join(',') });

  expect(twentyOne.success).toBe(false);
});

test('propagates the validation error from parseRequest', async () => {
  const error = vi.fn(() => new Response('Bad Request', { status: 400 }));

  parseRequestMock.mockResolvedValue({ auth: undefined, query: undefined, error } as any);

  const response = await GET(
    new Request('http://localhost/api/websites/last-activity?ids=not-a-uuid'),
  );

  expect(error).toHaveBeenCalled();
  expect(canViewBatchWebsitesMock).not.toHaveBeenCalled();
  expect(getWebsiteListLastActivityMock).not.toHaveBeenCalled();
  expect(response.status).toBe(400);
});
