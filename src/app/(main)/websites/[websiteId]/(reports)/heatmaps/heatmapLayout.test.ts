import { describe, expect, test } from 'vitest';
import {
  getHeatmapCanvasLayout,
  getSnapshotCanvasHeight,
  getSnapshotFrameHeight,
} from './heatmapLayout';

describe('getSnapshotFrameHeight', () => {
  test('pins the iframe to the visitor viewport for pages that fill the screen', () => {
    // A `min-height: 100vh` page: page height equals the recorded viewport, so
    // `100vh` inside the iframe must resolve to the visitor's viewport height.
    expect(getSnapshotFrameHeight({ pageH: 800, viewportH: 800 })).toBe(800);
    // A viewport-filling hero with a little extra content below it stays anchored.
    expect(getSnapshotFrameHeight({ pageH: 960, viewportH: 800 })).toBe(800);
    // Boundary: exactly 1.25x is still anchored, just past it is a long page.
    expect(getSnapshotFrameHeight({ pageH: 1000, viewportH: 800 })).toBe(800);
    expect(getSnapshotFrameHeight({ pageH: 1001, viewportH: 800 })).toBe(1001);
  });

  test('uses the full page height for genuinely long, scrollable pages', () => {
    expect(getSnapshotFrameHeight({ pageH: 4000, viewportH: 800 })).toBe(4000);
  });

  test('falls back sensibly when a dimension is missing', () => {
    expect(getSnapshotFrameHeight({ pageH: 2000, viewportH: 0 })).toBe(2000);
    expect(getSnapshotFrameHeight({ pageH: 0, viewportH: 800 })).toBe(800);
    expect(getSnapshotFrameHeight({ pageH: 0, viewportH: 0 })).toBe(1);
  });
});

describe('getSnapshotCanvasHeight', () => {
  test('spans the full recorded page so below-the-fold clicks are not clipped', () => {
    // Regression for #7: on a viewport-filling page the iframe is pinned to the
    // viewport height (so `100vh` renders faithfully), but the canvas/overlay
    // must still cover the full page height so clicks recorded below the fold
    // remain visible instead of being clipped to the shorter iframe frame.
    const size = { pageH: 1000, viewportH: 800 };

    expect(getSnapshotFrameHeight(size)).toBe(800);
    expect(getSnapshotCanvasHeight(size)).toBe(1000);
  });

  test('matches the frame height for long pages and single-screen pages', () => {
    expect(getSnapshotCanvasHeight({ pageH: 4000, viewportH: 800 })).toBe(4000);
    expect(getSnapshotCanvasHeight({ pageH: 800, viewportH: 800 })).toBe(800);
  });

  test('falls back to the page height when the viewport height is unknown', () => {
    expect(getSnapshotCanvasHeight({ pageH: 2000, viewportH: 0 })).toBe(2000);
  });
});

describe('getHeatmapCanvasLayout', () => {
  test('keeps the iframe at the viewport height while the canvas spans the page', () => {
    // The wiring used by the click/scroll views: the iframe (frame) is faithful
    // to the visitor viewport for `100vh`, while the canvas covers the full page.
    expect(getHeatmapCanvasLayout({ pageH: 1000, viewportH: 800 })).toEqual({
      frameHeight: 800,
      contentHeight: 1000,
    });
  });

  test('leaves long pages fully rendered (frame equals canvas)', () => {
    expect(getHeatmapCanvasLayout({ pageH: 4000, viewportH: 800 })).toEqual({
      frameHeight: 4000,
      contentHeight: 4000,
    });
  });
});
