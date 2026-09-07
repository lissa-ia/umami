import type { Board, Link, Pixel, Website } from '@/generated/prisma/client';
import { getBoard, getLink, getPixel, getWebsite } from '@/queries/prisma';

export async function getEntity(entityId: string): Promise<Website | Link | Pixel | Board | null> {
  const website = await getWebsite(entityId);

  if (website) {
    return website;
  }

  const link = await getLink(entityId);

  if (link) {
    return link;
  }

  const pixel = await getPixel(entityId);

  if (pixel) {
    return pixel;
  }

  const board = await getBoard(entityId);

  if (board) {
    return board;
  }

  return null;
}
