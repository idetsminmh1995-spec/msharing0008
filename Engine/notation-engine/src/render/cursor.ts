import type { CursorPlacement } from '../playback/cursor.js';
import { svgGroup, svgLine } from './svg-primitives.js';

export interface RenderCursorOptions {
  /** How tall the marker is, in staff spaces -- typically one system's own height plus whatever margin a host wants above/below. */
  readonly height: number;
  /** The y the marker's TOP sits at, before `placement.systemY` is added. A host that wants the marker to span exactly one staff passes that staff's own top y. */
  readonly top: number;
  readonly thickness: number;
  readonly color: string;
  /** 0..1. A cursor is an overlay on the music, not part of it -- a host that wants it subtler passes less. */
  readonly opacity?: number;
}

/**
 * PLAN.md §17.2, Phase 49: draws the cursor marker itself. Takes a
 * `CursorPlacement` (from `computeCursorPlacement`) rather than a tick, so
 * the same drawing code serves BOTH sync modes -- in `cursorMoves` the
 * marker's x is the note's own, in `notationMoves` it is the fixed
 * viewport position, and this function neither knows nor needs to know
 * which it was handed.
 *
 * Returns ONLY the marker. Translating the notation for `notationMoves`
 * (by `placement.notationTranslateX`) is the host's own job: the engine
 * renders a score once and a host re-positions it every frame, which is
 * exactly the §17.3 boundary -- re-rendering the whole SVG per frame is
 * what this design exists to avoid.
 */
export function renderCursor(placement: CursorPlacement, options: RenderCursorOptions): string {
  const top = options.top + placement.systemY;
  const line = svgLine(placement.markerX, top, placement.markerX, top + options.height, {
    stroke: options.color,
    'stroke-width': options.thickness,
    'stroke-linecap': 'round',
    ...(options.opacity !== undefined ? { opacity: options.opacity } : {}),
  });
  return svgGroup([line], { class: 'notation-cursor' });
}
