import type { CursorMode } from '../config/config.js';
import { playheadX, positionToX, type PlaybackData } from './position.js';

/**
 * §17.2's own default for `notationMoves`: where in the viewport the fixed
 * marker sits. A third of the way in leaves two thirds of the visible music
 * ahead of the player, which is what a scrolling practice view wants -- the
 * exact value is a config field precisely because house styles differ.
 */
export const DEFAULT_CURSOR_FIXED_FRACTION = 1 / 3;

export interface CursorPlacementOptions {
  readonly mode: CursorMode;
  /**
   * `notationMoves` only (ignored by `cursorMoves`): the viewport's own
   * width, in the SAME staff-space units the rendered SVG's `viewBox` uses
   * -- NOT CSS pixels. A host converts by dividing its pixel width by
   * `config.layout.pxPerStaffSpace`. Omitted is treated as 0, which puts
   * the fixed marker hard against the left edge rather than throwing.
   */
  readonly viewportWidth?: number;
  /** `notationMoves` only: 0..1 fraction of `viewportWidth`. Defaults to `DEFAULT_CURSOR_FIXED_FRACTION`. */
  readonly fixedFraction?: number;
}

/**
 * §17.2: where the marker goes, and how far the notation must move for it
 * to line up. One shape covers BOTH modes -- see `computeCursorPlacement`
 * for why that's one module and not two.
 */
export interface CursorPlacement {
  /** Where the marker itself is drawn, in the SVG's own staff-space coordinates. */
  readonly markerX: number;
  /**
   * How far the NOTATION must be translated horizontally for `markerX` to
   * sit on the right note. Always 0 in `cursorMoves` (the notation never
   * moves); in `notationMoves` it is `-(noteX - markerX)`, i.e. negative
   * once playback has passed the fixed marker.
   */
  readonly notationTranslateX: number;
  /** The system/page the current tick lands on -- a page-mode host needs both to show the right page at all. */
  readonly systemIndex: number;
  readonly pageIndex: number;
  /** That system's own vertical origin, so the marker is drawn on the correct system rather than always the first. */
  readonly systemY: number;
  /** Where the current NOTE actually is (`positionToX(tick).x`) -- exposed so a host can tell "the note" from "the marker", and so note-highlighting and the moving marker can disagree without either being wrong. */
  readonly noteX: number;
}

/**
 * PLAN.md §17.2, Phase 49. ONE function, one `mode` option -- deliberately
 * not two modules (§2.4), because both modes are the same computation
 * viewed from different reference frames: `positionToX(currentTick)` says
 * where the music is, and the mode only decides whether the MARKER or the
 * NOTATION is the thing that moves to meet it.
 *
 * - `cursorMoves` -- the notation is static, the marker is drawn at the
 *   note's own x. Suits page layout, where scrolling the page under a
 *   fixed marker would fight the page boundaries.
 * - `notationMoves` -- the marker is pinned at `fixedFraction` of the
 *   viewport and the notation slides under it. Suits scroll layout and the
 *   narrow video frames this engine's own drum-video host uses.
 *
 * **Repeats are the host's business, not the engine's** (§17.2): when
 * playback passes a repeat-end barline and jumps back, the host passes the
 * MUSICAL tick it jumped to. This function never simulates playback order,
 * so a repeat, a D.S., a manual seek and ordinary forward playback are all
 * just "some tick" here -- which is exactly why none of them need special
 * cases.
 */
export function computeCursorPlacement(
  playback: PlaybackData,
  tick: number,
  options: CursorPlacementOptions,
): CursorPlacement {
  // The MARKER follows the continuous playhead, not the last note's own
  // x. `positionToX` is a step function -- it holds still between notes,
  // and across a measure with no notes at all it does not move for the
  // whole measure -- so a marker driven by it freezes and jumps. `noteX`
  // below still reports the note itself, which is what it has always
  // meant and what note-highlighting wants.
  const position = playheadX(playback, tick);
  const noteX = positionToX(playback, tick).x;

  if (options.mode === 'cursorMoves') {
    return {
      markerX: position.x,
      notationTranslateX: 0,
      systemIndex: position.systemIndex,
      pageIndex: position.pageIndex,
      systemY: position.systemY,
      noteX,
    };
  }

  const viewportWidth = options.viewportWidth ?? 0;
  const fraction = options.fixedFraction ?? DEFAULT_CURSOR_FIXED_FRACTION;
  const fixedX = viewportWidth * fraction;
  return {
    markerX: fixedX,
    notationTranslateX: -(position.x - fixedX),
    systemIndex: position.systemIndex,
    pageIndex: position.pageIndex,
    systemY: position.systemY,
    noteX,
  };
}
