import { afterEach, describe, expect, test, vi } from 'vitest';

async function loadModule({
  mode,
  prismaRows = [],
  clickhouseRows = [],
}: {
  mode: 'prisma' | 'clickhouse';
  prismaRows?: unknown[];
  clickhouseRows?: unknown[];
}) {
  vi.resetModules();

  const state = { mode };
  const prismaRawQuery = vi.fn().mockResolvedValue(prismaRows);
  const clickhouseRawQuery = vi.fn().mockResolvedValue(clickhouseRows);

  vi.doMock('@/lib/db', () => ({
    CLICKHOUSE: 'clickhouse',
    PRISMA: 'prisma',
    runQuery: vi.fn((queries: Record<string, () => unknown>) => queries[state.mode]()),
  }));

  vi.doMock('@/lib/prisma', () => ({
    default: {
      rawQuery: prismaRawQuery,
    },
  }));

  vi.doMock('@/lib/clickhouse', () => ({
    default: {
      rawQuery: clickhouseRawQuery,
    },
  }));

  const mod = await import('./getWebsiteListLastActivity');

  return {
    getWebsiteListLastActivity: mod.getWebsiteListLastActivity,
    prismaRawQuery,
    clickhouseRawQuery,
  };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('getWebsiteListLastActivity empty input', () => {
  test('returns {} without touching the database', async () => {
    const { getWebsiteListLastActivity, prismaRawQuery, clickhouseRawQuery } = await loadModule({
      mode: 'prisma',
    });

    const result = await getWebsiteListLastActivity([]);

    expect(result).toEqual({});
    expect(prismaRawQuery).not.toHaveBeenCalled();
    expect(clickhouseRawQuery).not.toHaveBeenCalled();
  });
});

describe('getWebsiteListLastActivity postgres', () => {
  test('runs a single lateral query and includes ids without activity as null', async () => {
    const { getWebsiteListLastActivity, prismaRawQuery } = await loadModule({
      mode: 'prisma',
      // 'id-2' is intentionally absent from the rows (no activity)
      prismaRows: [{ websiteId: 'id-1', lastActivity: new Date('2024-01-02T03:04:05.000Z') }],
    });

    const result = await getWebsiteListLastActivity(['id-1', 'id-2']);

    expect(prismaRawQuery).toHaveBeenCalledTimes(1);

    const [query, params] = prismaRawQuery.mock.calls[0];

    expect(query).toContain('left join lateral (');
    expect(query).toContain('order by website_event.created_at desc');
    expect(query).toContain('limit 1');
    expect(query).toContain('unnest({{websiteIds}}::uuid[])');
    expect(params).toEqual({ websiteIds: ['id-1', 'id-2'] });

    expect(result).toEqual({
      'id-1': { lastActivity: '2024-01-02T03:04:05.000Z' },
      'id-2': { lastActivity: null },
    });
  });
});

describe('getWebsiteListLastActivity clickhouse', () => {
  test('runs a single grouped aggregate and includes ids without activity as null', async () => {
    const { getWebsiteListLastActivity, clickhouseRawQuery } = await loadModule({
      mode: 'clickhouse',
      // 'id-2' is intentionally absent from the rows (no activity)
      clickhouseRows: [{ websiteId: 'id-1', lastActivity: '2024-01-02T03:04:05Z' }],
    });

    const result = await getWebsiteListLastActivity(['id-1', 'id-2']);

    expect(clickhouseRawQuery).toHaveBeenCalledTimes(1);

    const [query, params] = clickhouseRawQuery.mock.calls[0];

    expect(query).toContain('from website_event_stats_hourly');
    expect(query).toContain('max(max_time) as lastActivity');
    expect(query).toContain('where website_id in {websiteIds:Array(UUID)}');
    expect(query).toContain('group by website_id');
    // must not read the raw event table (word boundary excludes ..._stats_hourly)
    expect(query).not.toMatch(/from website_event\b/);
    expect(params).toEqual({ websiteIds: ['id-1', 'id-2'] });

    expect(result).toEqual({
      'id-1': { lastActivity: '2024-01-02T03:04:05Z' },
      'id-2': { lastActivity: null },
    });
  });
});
