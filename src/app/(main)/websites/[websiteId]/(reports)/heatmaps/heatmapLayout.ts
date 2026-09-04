export interface SnapshotSize {
  pageH: number;
  viewportH: number;
}

// Pages that fill the screen (min-height: 100vh) are rendered at most this many
// viewports before we treat them as genuinely long, scrollable pages.
const VIEWPORT_ANCHOR_RATIO = 1.25;

/**
 * Height of the snapshot *iframe* (its layout viewport).
 *
 * A cross-origin iframe resolves viewport units (`vh`) against the iframe's own
 * height, not the visitor's browser window. If we sized the frame to the full
 * page height, every `min-height: 100vh` section would re-inflate to that full
 * height, pushing the rest of the page down and misaligning the click overlay.
 *
 * So for viewport-anchored pages (content that fills the screen) we pin the
 * frame to the visitor's recorded viewport height, which makes `100vh` resolve
 * exactly as the visitor saw it. Genuinely long, scrollable pages keep the full
 * page height so their content stays visible.
 *
 * Note: a very long page whose *first* section is `min-height: 100vh` cannot be
 * reproduced faithfully below the fold from a cross-origin iframe — showing the
 * whole page and resolving `vh` to the visitor viewport are mutually exclusive
 * when `pageH > viewportH`. We favor keeping the long page fully visible in that
 * case; only single/near-single-screen pages get the viewport-faithful frame.
 */
export function getSnapshotFrameHeight({ pageH, viewportH }: SnapshotSize): number {
  const vh = viewportH > 0 ? viewportH : 0;
  const ph = pageH > 0 ? pageH : 0;

  if (!vh) {
    return Math.max(1, ph);
  }

  if (!ph) {
    return vh;
  }

  if (ph <= vh * VIEWPORT_ANCHOR_RATIO) {
    return vh;
  }

  return ph;
}

/**
 * Height of the heatmap *canvas* (the click/scroll overlay surface).
 *
 * The canvas must span the full recorded page height so clicks captured below
 * the fold on a viewport-filling page are shown instead of being clipped to the
 * shorter, viewport-anchored iframe frame. The area below the frame simply shows
 * the neutral canvas surface (a cross-origin iframe cannot faithfully reproduce
 * `vh`-based layout below the first viewport).
 */
export function getSnapshotCanvasHeight(size: SnapshotSize): number {
  const ph = size.pageH > 0 ? size.pageH : 0;

  return Math.max(getSnapshotFrameHeight(size), ph);
}

export interface HeatmapCanvasLayout {
  /** Height of the snapshot iframe (its layout viewport / `vh` basis). */
  frameHeight: number;
  /** Height of the heatmap canvas/overlay (spans the full page). */
  contentHeight: number;
}

/**
 * Iframe and canvas heights for the heatmap overlay.
 *
 * `size` must be the *selected screen-width bucket's* dimensions — already
 * scaled to the render width — because the click/scroll overlay points live in
 * that same bucket space. Sizing the canvas from the raw recorded snapshot
 * pixels instead would put the canvas height in a different coordinate space
 * than the points and clip below-the-fold clicks whenever the recorded width
 * was grouped into a wider column (scale != 1).
 */
export function getHeatmapCanvasLayout(size: SnapshotSize): HeatmapCanvasLayout {
  return {
    frameHeight: getSnapshotFrameHeight(size),
    contentHeight: getSnapshotCanvasHeight(size),
  };
}
