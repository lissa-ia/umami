import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getEntity } from '@/lib/entity';
import { getBoard, getLink, getPixel, getWebsite } from '@/queries/prisma';

vi.mock('@/queries/prisma', () => ({
  getWebsite: vi.fn(),
  getLink: vi.fn(),
  getPixel: vi.fn(),
  getBoard: vi.fn(),
}));

const website = { id: 'entity-1', userId: 'user-1', name: 'Website' };
const link = { id: 'entity-1', userId: 'user-1', name: 'Link' };
const pixel = { id: 'entity-1', userId: 'user-1', name: 'Pixel' };
const board = { id: 'entity-1', userId: 'user-1', name: 'Board' };

beforeEach(() => {
  vi.mocked(getWebsite).mockReset();
  vi.mocked(getLink).mockReset();
  vi.mocked(getPixel).mockReset();
  vi.mocked(getBoard).mockReset();
});

describe('getEntity', () => {
  test('returns the website without running the remaining queries', async () => {
    vi.mocked(getWebsite).mockResolvedValue(website as any);

    await expect(getEntity('entity-1')).resolves.toBe(website);

    expect(getWebsite).toHaveBeenCalledTimes(1);
    expect(getWebsite).toHaveBeenCalledWith('entity-1');
    expect(getLink).not.toHaveBeenCalled();
    expect(getPixel).not.toHaveBeenCalled();
    expect(getBoard).not.toHaveBeenCalled();
  });

  test('returns the link without running the pixel and board queries', async () => {
    vi.mocked(getWebsite).mockResolvedValue(null as any);
    vi.mocked(getLink).mockResolvedValue(link as any);

    await expect(getEntity('entity-1')).resolves.toBe(link);

    expect(getWebsite).toHaveBeenCalledTimes(1);
    expect(getLink).toHaveBeenCalledTimes(1);
    expect(getPixel).not.toHaveBeenCalled();
    expect(getBoard).not.toHaveBeenCalled();
  });

  test('returns the pixel without running the board query', async () => {
    vi.mocked(getWebsite).mockResolvedValue(null as any);
    vi.mocked(getLink).mockResolvedValue(null as any);
    vi.mocked(getPixel).mockResolvedValue(pixel as any);

    await expect(getEntity('entity-1')).resolves.toBe(pixel);

    expect(getWebsite).toHaveBeenCalledTimes(1);
    expect(getLink).toHaveBeenCalledTimes(1);
    expect(getPixel).toHaveBeenCalledTimes(1);
    expect(getBoard).not.toHaveBeenCalled();
  });

  test('returns the board after the first three queries miss', async () => {
    vi.mocked(getWebsite).mockResolvedValue(null as any);
    vi.mocked(getLink).mockResolvedValue(null as any);
    vi.mocked(getPixel).mockResolvedValue(null as any);
    vi.mocked(getBoard).mockResolvedValue(board as any);

    await expect(getEntity('entity-1')).resolves.toBe(board);

    expect(getWebsite).toHaveBeenCalledTimes(1);
    expect(getLink).toHaveBeenCalledTimes(1);
    expect(getPixel).toHaveBeenCalledTimes(1);
    expect(getBoard).toHaveBeenCalledTimes(1);
  });

  test('returns null when no entity exists for the id', async () => {
    vi.mocked(getWebsite).mockResolvedValue(null as any);
    vi.mocked(getLink).mockResolvedValue(null as any);
    vi.mocked(getPixel).mockResolvedValue(null as any);
    vi.mocked(getBoard).mockResolvedValue(null as any);

    const result = await getEntity('entity-1');

    expect(result).toBe(null);
  });

  test('returns null instead of undefined when the queries resolve empty as undefined', async () => {
    vi.mocked(getWebsite).mockResolvedValue(undefined as any);
    vi.mocked(getLink).mockResolvedValue(undefined as any);
    vi.mocked(getPixel).mockResolvedValue(undefined as any);
    vi.mocked(getBoard).mockResolvedValue(undefined as any);

    const result = await getEntity('entity-1');

    expect(result).toBe(null);
  });

  test('returns the found website even if the skipped queries would reject', async () => {
    vi.mocked(getWebsite).mockResolvedValue(website as any);
    vi.mocked(getLink).mockRejectedValue(new Error('db error'));
    vi.mocked(getPixel).mockRejectedValue(new Error('db error'));
    vi.mocked(getBoard).mockRejectedValue(new Error('db error'));

    await expect(getEntity('entity-1')).resolves.toBe(website);

    expect(getWebsite).toHaveBeenCalledTimes(1);
    expect(getLink).not.toHaveBeenCalled();
    expect(getPixel).not.toHaveBeenCalled();
    expect(getBoard).not.toHaveBeenCalled();
  });

  test('keeps the website precedence when several queries would match', async () => {
    vi.mocked(getWebsite).mockResolvedValue(website as any);
    vi.mocked(getLink).mockResolvedValue(link as any);
    vi.mocked(getPixel).mockResolvedValue(pixel as any);
    vi.mocked(getBoard).mockResolvedValue(board as any);

    await expect(getEntity('entity-1')).resolves.toBe(website);
  });
});
