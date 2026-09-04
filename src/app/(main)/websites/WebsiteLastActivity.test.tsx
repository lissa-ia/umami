import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@/test/render';
import { REALTIME_INTERVAL } from '@/lib/constants';

let renderCount = 0;

vi.mock('@/components/common/DateDistance', () => ({
  DateDistance: ({ date }: { date: Date }) => {
    renderCount += 1;
    return <span data-test="distance">{date.toISOString()}</span>;
  },
}));

import { WebsiteLastActivity } from './WebsiteLastActivity';

describe('WebsiteLastActivity', () => {
  beforeEach(() => {
    renderCount = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders a dash when there is no activity', () => {
    render(<WebsiteLastActivity lastActivity={null} />);

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByTestId('distance')).toBeNull();
  });

  test('renders a dash while loading even if a timestamp is present', () => {
    render(<WebsiteLastActivity lastActivity="2026-09-04T00:00:00.000Z" isLoading />);

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByTestId('distance')).toBeNull();
  });

  test('renders the relative distance when activity exists', () => {
    render(<WebsiteLastActivity lastActivity="2026-09-04T00:00:00.000Z" />);

    expect(screen.getByTestId('distance')).toHaveTextContent('2026-09-04T00:00:00.000Z');
  });

  test('ticks every REALTIME_INTERVAL to keep the relative text advancing', () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const { unmount } = render(<WebsiteLastActivity lastActivity="2026-09-04T00:00:00.000Z" />);

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), REALTIME_INTERVAL);

    const before = renderCount;

    act(() => {
      vi.advanceTimersByTime(REALTIME_INTERVAL);
    });

    // The forced re-render re-runs DateDistance so the relative text is recomputed.
    expect(renderCount).toBeGreaterThan(before);

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  test('does not start a ticker when there is no activity', () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    render(<WebsiteLastActivity lastActivity={null} />);

    expect(setIntervalSpy).not.toHaveBeenCalledWith(expect.any(Function), REALTIME_INTERVAL);
  });
});
