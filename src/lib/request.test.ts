import { describe, expect, test, vi } from 'vitest';
import { isInvalidDate } from './date';
import { getRequestDateRange } from './request';

vi.mock('@/lib/auth', () => ({ checkAuth: vi.fn() }));
vi.mock('@/lib/load', () => ({
  fetchAccount: vi.fn(),
  fetchWebsite: vi.fn(),
}));
vi.mock('@/queries/prisma', () => ({ getWebsiteSegment: vi.fn() }));

describe('getRequestDateRange', () => {
  test('treats missing startAt/endAt as no range instead of Invalid Date', () => {
    const result = getRequestDateRange({});

    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBeUndefined();
    expect(result.unit).toBeUndefined();
  });

  test('treats empty startAt/endAt as no range instead of epoch/Invalid Date', () => {
    const result = getRequestDateRange({ startAt: '', endAt: '' });

    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBeUndefined();
    expect(result.unit).toBeUndefined();
  });

  test('keeps invalid date values as an error', () => {
    const result = getRequestDateRange({ startAt: 'abc', endAt: '1700000000000' });

    expect(isInvalidDate(result.startDate)).toBe(true);
    expect(result.endDate).toEqual(new Date(1700000000000));
  });

  test('parses a valid range and derives its unit', () => {
    const result = getRequestDateRange({ startAt: '1700000000000', endAt: '1700600000000' });

    expect(result.startDate).toEqual(new Date(1700000000000));
    expect(result.endDate).toEqual(new Date(1700600000000));
    expect(result.unit).toBe('hour');
  });
});
