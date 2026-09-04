import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const getMock = vi.fn();
const useQueryMock = vi.fn(options => options);

vi.mock('../useApi', () => ({
  useApi: () => ({
    get: getMock,
    useQuery: useQueryMock,
  }),
}));

vi.mock('../useTimezone', () => ({
  useTimezone: () => ({
    timezone: 'UTC',
    canonicalizeTimezone: (tz: string) => tz,
  }),
}));

import { REALTIME_INTERVAL } from '@/lib/constants';
import { useWebsiteListLastActivityQuery } from './useWebsiteListLastActivityQuery';

describe('useWebsiteListLastActivityQuery', () => {
  beforeEach(() => {
    getMock.mockReset();
    useQueryMock.mockClear();
  });

  test('batches deduped ids to /websites/last-activity and auto-refreshes', async () => {
    renderHook(() => useWebsiteListLastActivityQuery(['b', 'a', ' a ', '', 'b']));

    const [options] = useQueryMock.mock.calls.at(-1) as [
      {
        queryKey: unknown;
        queryFn: () => Promise<unknown>;
        enabled: boolean;
        refetchInterval?: number;
      },
    ];

    // Auto-refresh must be wired to the realtime interval.
    expect(options.refetchInterval).toBe(REALTIME_INTERVAL);
    expect(options.enabled).toBe(true);
    expect(options.queryKey).toEqual([
      'websites:list:last-activity',
      { ids: ['a', 'b'], timezone: 'UTC' },
    ]);

    await options.queryFn();

    // A single batch request with the visible ids, not one request per row.
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenCalledWith('/websites/last-activity', {
      ids: 'a,b',
      timezone: 'UTC',
    });
  });
});
