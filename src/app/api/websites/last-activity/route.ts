import { z } from 'zod';
import { canViewBatchWebsites } from '@/permissions/website';
import { parseRequest } from '@/lib/request';
import { json } from '@/lib/response';
import { getWebsiteListLastActivity } from '@/queries/sql';

export const schema = z.object({
  ids: z
    .string()
    .transform(value =>
      value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.uuid()).min(1).max(20)),
});

export async function GET(request: Request) {
  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const websiteIds = await canViewBatchWebsites(auth, query.ids);

  const data = await getWebsiteListLastActivity(websiteIds);

  return json({ data });
}
