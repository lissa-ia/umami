import { REALTIME_INTERVAL } from '@/lib/constants';
import type { WebsiteListLastActivity } from '@/queries/sql/getWebsiteListLastActivity';
import { useListChartsQuery } from './useWebsiteListChartsQuery';

export function useWebsiteListLastActivityQuery(websiteIds: string[]) {
  return useListChartsQuery<WebsiteListLastActivity>(
    'websites:list:last-activity',
    '/websites/last-activity',
    websiteIds,
    { refetchInterval: REALTIME_INTERVAL },
  );
}
