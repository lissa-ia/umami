import { renderHook } from '@testing-library/react';
import { formatInTimeZone } from 'date-fns-tz';
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Simulate a browser whose local timezone differs from the selected reporting
// timezone. The host is forced to UTC while the user selects America/New_York,
// reproducing the Issue #3 scenario where "Last 24 hours" / custom ranges shift
// the window by the timezone offset and exclude valid events.
const originalTz = process.env.TZ;
process.env.TZ = 'UTC';

let selectedTimezone = 'America/New_York';

const nav: { query: Record<string, any> } = {
  query: { date: '1day', unit: '', offset: 0, compare: 'prev' },
};

vi.mock('./useNavigation', () => ({
  useNavigation: () => nav,
}));

vi.mock('./useLocale', () => ({
  useLocale: () => ({ locale: 'en-US', dateLocale: undefined }),
}));

vi.mock('@/store/app', () => ({
  useApp: (selector: (state: { timezone: string; locale: string }) => any) =>
    selector({ timezone: selectedTimezone, locale: 'en-US' }),
  setTimezone: vi.fn(),
}));

import { useDateParameters } from './useDateParameters';

// A fixed mid-day instant so the "Last 24 hours" window is fully deterministic.
const NOW = new Date('2026-01-15T18:00:00Z');

function setup() {
  return renderHook(() => useDateParameters()).result.current;
}

describe('useDateParameters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    selectedTimezone = 'America/New_York';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  });

  test('computes the window in the selected reporting timezone, not the browser timezone', () => {
    const { startAt, endAt } = setup();

    // The window boundaries must land on midnight / end-of-day in the SELECTED
    // timezone. With the bug they land on the browser (UTC) day, shifting the
    // window by the offset and excluding valid events.
    expect(formatInTimeZone(new Date(startAt), 'America/New_York', 'HH:mm:ss')).toBe('00:00:00');
    expect(formatInTimeZone(new Date(endAt), 'America/New_York', 'HH:mm:ss')).toBe('23:59:59');
  });

  test('matches the browser window when selected timezone equals the browser timezone', () => {
    // localTimeZone is UTC here; selecting UTC must be a no-op relative to the
    // previous behavior (regression guard for the common default case).
    selectedTimezone = 'UTC';
    const { startAt, endAt } = setup();

    expect(formatInTimeZone(new Date(startAt), 'UTC', 'HH:mm:ss')).toBe('00:00:00');
    expect(formatInTimeZone(new Date(endAt), 'UTC', 'HH:mm:ss')).toBe('23:59:59');
  });
});
