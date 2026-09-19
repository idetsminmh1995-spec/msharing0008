import { svgGroup, svgPath, svgRect } from './svg-primitives.js';

/**
 * Phase 51/§18.3: the two debug overlays, drawn from already-measured
 * geometry.
 *
 * Both take plain structural shapes rather than importing `debug/`'s own
 * types: `render/` turns geometry into SVG and never depends on a module
 * further down the pipeline (§4.1), and a box is four numbers whether it
 * came from a measurement pass or from a test.
 */

export interface OverlayBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly approximate?: boolean;
}

export interface RenderBoundingBoxOverlayOptions {
  readonly color: string;
  /** Stroke width in staff spaces. Deliberately thin -- an overlay that obscures what it measures is useless. */
  readonly thickness?: number;
}

const DEFAULT_OVERLAY_THICKNESS = 0.04;

/**
 * One stroked rectangle per box, in a single `<g class="debug-bounding-boxes">`
 * so a host can hide the whole overlay with one CSS rule.
 *
 * A box flagged `approximate` (a curve's control-point hull, plain text
 * measured from its font size) is drawn DASHED, so the overlay says which
 * of its own numbers are exact and which are over-estimates instead of
 * presenting all of them as equally trustworthy.
 */
export function renderBoundingBoxOverlay(
  boxes: readonly OverlayBox[],
  options: RenderBoundingBoxOverlayOptions,
): string {
  const thickness = options.thickness ?? DEFAULT_OVERLAY_THICKNESS;
  const rects = boxes.map((box) =>
    svgRect(box.x, box.y, box.width, box.height, {
      fill: 'none',
      stroke: options.color,
      'stroke-width': thickness,
      ...(box.approximate === true
        ? { 'stroke-dasharray': `${thickness * 4} ${thickness * 4}` }
        : {}),
    }),
  );
  return svgGroup(rects, { class: 'debug-bounding-boxes' });
}

export interface OverlaySkylineSegment {
  readonly xStart: number;
  readonly xEnd: number;
  readonly y: number;
}

export interface OverlaySkyline {
  readonly north: readonly OverlaySkylineSegment[];
  readonly south: readonly OverlaySkylineSegment[];
}

export interface RenderSkylineOverlayOptions {
  readonly color: string;
  readonly thickness?: number;
}

/** A skyline as one stepped polyline: horizontal across each segment, vertical where two segments meet. */
function skylinePath(segments: readonly OverlaySkylineSegment[]): string {
  if (segments.length === 0) return '';
  const parts: string[] = [];
  let previous: OverlaySkylineSegment | undefined;
  for (const segment of segments) {
    if (previous === undefined || Math.abs(previous.xEnd - segment.xStart) > 1e-9) {
      // A gap in content: start a new sub-path rather than drawing a line
      // across empty space, which would claim content that isn't there.
      parts.push(`M ${segment.xStart} ${segment.y}`);
    } else if (previous.y !== segment.y) {
      parts.push(`L ${segment.xStart} ${segment.y}`);
    }
    parts.push(`L ${segment.xEnd} ${segment.y}`);
    previous = segment;
  }
  return parts.join(' ');
}

/** Both sides of every staff's skyline, in one `<g class="debug-skyline">`. */
export function renderSkylineOverlay(
  skylines: readonly OverlaySkyline[],
  options: RenderSkylineOverlayOptions,
): string {
  const thickness = options.thickness ?? DEFAULT_OVERLAY_THICKNESS * 2;
  const paths: string[] = [];
  for (const skyline of skylines) {
    for (const side of [skyline.north, skyline.south]) {
      const d = skylinePath(side);
      if (d === '') continue;
      paths.push(svgPath(d, { fill: 'none', stroke: options.color, 'stroke-width': thickness }));
    }
  }
  return svgGroup(paths, { class: 'debug-skyline' });
}
