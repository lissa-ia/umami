import clickhouse from '@/lib/clickhouse';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';

const FUNCTION_NAME = 'getWebsiteListLastActivity';

export interface WebsiteListLastActivity {
  lastActivity: string | null;
}

interface WebsiteListLastActivityRow {
  websiteId: string;
  lastActivity: Date | string | null;
}

export async function getWebsiteListLastActivity(
  websiteIds: string[],
): Promise<Record<string, WebsiteListLastActivity>> {
  if (!websiteIds.length) {
    return {};
  }

  return runQuery({
    [PRISMA]: async () => formatResults(await relationalQuery(websiteIds), websiteIds),
    [CLICKHOUSE]: async () => formatResults(await clickhouseQuery(websiteIds), websiteIds),
  });
}

async function relationalQuery(websiteIds: string[]): Promise<WebsiteListLastActivityRow[]> {
  const { rawQuery } = prisma;

  // Drive from the requested ids and pull the newest event per id with a
  // LATERAL "order by created_at desc limit 1". This lets Postgres satisfy each
  // lookup with the existing [website_id, created_at] index instead of scanning
  // every event. LEFT JOIN keeps ids that have no activity (lastActivity: null).
  return rawQuery(
    `
    select
      ids.website_id as "websiteId",
      latest.created_at as "lastActivity"
    from unnest({{websiteIds}}::uuid[]) as ids(website_id)
    left join lateral (
      select website_event.created_at
      from website_event
      where website_event.website_id = ids.website_id
      order by website_event.created_at desc
      limit 1
    ) as latest on true
    `,
    { websiteIds },
    FUNCTION_NAME,
  );
}

async function clickhouseQuery(websiteIds: string[]): Promise<WebsiteListLastActivityRow[]> {
  const { rawQuery } = clickhouse;

  // A single grouped scan over the hourly aggregate. max_time already carries
  // the second-precision latest event per bucket, so max(max_time) per website
  // is a cheap way to get last activity without touching the raw event table.
  return rawQuery(
    `
    select
      website_id as websiteId,
      max(max_time) as lastActivity
    from website_event_stats_hourly
    where website_id in {websiteIds:Array(UUID)}
    group by website_id
    `,
    { websiteIds },
    FUNCTION_NAME,
  );
}

function toIsoString(value: Date | string | null): string | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function formatResults(
  rows: WebsiteListLastActivityRow[],
  websiteIds: string[],
): Record<string, WebsiteListLastActivity> {
  const result = websiteIds.reduce<Record<string, WebsiteListLastActivity>>((acc, websiteId) => {
    acc[websiteId] = { lastActivity: null };
    return acc;
  }, {});

  rows.forEach(({ websiteId, lastActivity }) => {
    if (result[websiteId]) {
      result[websiteId] = { lastActivity: toIsoString(lastActivity) };
    }
  });

  return result;
}
