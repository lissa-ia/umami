import { render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import type { HeatmapPoint, HeatmapResult, HeatmapSnapshot } from '@/queries/sql';

// CSS modules aren't processed in the test environment; map class lookups to
// their own names so `styles.canvasSurface` stays a stable string.
vi.mock('./Heatmap.module.css', () => ({
  default: new Proxy({}, { get: (_target, prop: string) => String(prop) }),
}));

// react-zen primitives (Column, Row, Text, Select, ...) are only layout wrappers
// for these views, so replace them with passthroughs that render their children.
const passthrough = (name: string) => {
  const Component = ({ children }: { children?: ReactNode }) =>
    createElement('div', { 'data-zen': name }, children);
  Component.displayName = name;
  return Component;
};

vi.mock('@umami/react-zen', () => ({
  Button: passthrough('Button'),
  Column: passthrough('Column'),
  Dialog: passthrough('Dialog'),
  Grid: passthrough('Grid'),
  Heading: passthrough('Heading'),
  Icon: passthrough('Icon'),
  ListItem: passthrough('ListItem'),
  Loading: passthrough('Loading'),
  Modal: passthrough('Modal'),
  Row: passthrough('Row'),
  Select: passthrough('Select'),
  Text: passthrough('Text'),
}));

// Sibling modules pulled in when Heatmap.tsx loads; stub them so react-zen has a
// bounded surface and no unrelated design-system code runs in the test.
vi.mock('@/components/common/ControlledDialog', () => ({
  ControlledDialog: passthrough('ControlledDialog'),
}));
vi.mock('@/components/common/IconLabel', () => ({ IconLabel: passthrough('IconLabel') }));
vi.mock('@/components/common/LoadingPanel', () => ({ LoadingPanel: passthrough('LoadingPanel') }));
vi.mock('@/components/icons', () => ({ ListCheck: passthrough('ListCheck') }));

vi.mock('@/components/hooks', () => ({
  useMobile: () => ({ isPhone: false }),
  useResultQuery: () => ({ data: undefined, isLoading: false, isFetching: false }),
}));

// Imported after the mocks are registered.
const { ClickHeatmapView, ScrollHeatmapView } = await import('./Heatmap');

function point(overrides: Partial<HeatmapPoint> = {}): HeatmapPoint {
  return {
    x: 100,
    y: 100,
    pageX: 200,
    pageY: 1000,
    pageW: 1280,
    pageH: 1000,
    viewportW: 1280,
    viewportH: 800,
    count: 5,
    ...overrides,
  };
}

function snapshot(overrides: Partial<HeatmapSnapshot> = {}): HeatmapSnapshot {
  return {
    kind: 'iframe',
    id: 'iframe:test',
    url: 'https://example.com/',
    pageW: 1280,
    pageH: 1000,
    viewportW: 1280,
    viewportH: 800,
    ...overrides,
  };
}

function scrollResult(): HeatmapResult['scroll'] {
  // Recorded at width 1280 → grouped into the 1440 bucket (scale = 1.125), so the
  // bucket dimensions (viewport 900px, page 1125px) differ from the raw snapshot
  // (800/1000). Sizing from the raw snapshot instead would fail the assertions.
  const buckets = [
    { depth: 0, sessions: 10, pageW: 1280, pageH: 1000, viewportW: 1280, viewportH: 800 },
    { depth: 50, sessions: 6, pageW: 1280, pageH: 1000, viewportW: 1280, viewportH: 800 },
  ];

  return {
    buckets,
    totalSessions: 16,
    pageW: 1280,
    pageH: 1000,
    viewportW: 1280,
    viewportH: 800,
  };
}

describe('Heatmap layout wiring (issue #7)', () => {
  test('click view: iframe pinned to the viewport height, canvas spans the full page', () => {
    // A viewport-filling page recorded at width 1280 (grouped into the 1440
    // bucket, scale = 1.125): the overlay points live in that bucket space, so
    // the canvas/iframe must be sized from the bucket dimensions too. Bucket
    // viewport = 900px, bucket page = 1125px. The iframe must be pinned to 900px
    // so `100vh` resolves faithfully, while the canvas must be 1125px so the
    // click recorded below the fold (pageY 1000 → 1125 scaled) is not clipped.
    render(
      <ClickHeatmapView urlPath="/" points={[point()]} snapshot={snapshot()} isLoading={false} />,
    );

    const canvas = screen.getByTestId('heatmap-canvas-surface');
    const frame = screen.getByTestId('heatmap-snapshot-frame');

    // 1125 / 900 come from the bucket space; the raw snapshot (1000 / 800) would
    // clip below-the-fold clicks — asserting the bucket values locks that fix.
    expect(canvas).toHaveStyle({ height: '1125px' });
    expect(frame).toHaveStyle({ height: '900px' });
    expect(Number.parseInt(canvas.style.height, 10)).toBeGreaterThan(
      Number.parseInt(frame.style.height, 10),
    );
  });

  test('scroll view: iframe pinned to the viewport height, canvas spans the full page', () => {
    render(
      <ScrollHeatmapView
        urlPath="/"
        scroll={scrollResult()}
        snapshot={snapshot()}
        isLoading={false}
      />,
    );

    const canvas = screen.getByTestId('heatmap-canvas-surface');
    const frame = screen.getByTestId('heatmap-snapshot-frame');

    // Bucket space: 1125 / 900, not the raw snapshot's 1000 / 800.
    expect(canvas).toHaveStyle({ height: '1125px' });
    expect(frame).toHaveStyle({ height: '900px' });
    expect(Number.parseInt(canvas.style.height, 10)).toBeGreaterThan(
      Number.parseInt(frame.style.height, 10),
    );
  });
});
