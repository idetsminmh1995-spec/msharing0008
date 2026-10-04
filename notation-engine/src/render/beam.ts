import type { BeamShape } from '../geometry/beam-shape.js';
import { beamYAtX, BEAM_HOOK_LENGTH, type BeamSegment } from '../geometry/beam-shape.js';
import { svgGroup, svgLine, svgPath, svgNumber } from './svg-primitives.js';

export interface RenderBeamOptions {
  /**
   * Which lines to draw, from `computeBeamSegments` -- the primary beam
   * across the whole group, plus a line or a hook for every level a
   * shorter note in the group needs. Drawing a flat `lineCount` of
   * full-length lines instead is what gave a dotted eighth a sixteenth
   * beam it does not have.
   */
  readonly segments: readonly BeamSegment[];
  /** Each group member's stem X, in the group's own order -- `segments` indexes into this. */
  readonly stemXs: readonly number[];
  /** Typically Phase 5's getEngravingDefault('beamThickness'). */
  readonly thickness: number;
  /**
   * Typically Phase 5's getEngravingDefault('beamSpacing') -- per the SMuFL
   * spec this is "the distance between the inner edge of the primary and
   * outer edge of subsequent secondary beams", i.e. the GAP between two
   * beams, NOT their center-to-center distance. The center-to-center step
   * is therefore `thickness + spacing` (0.5 + 0.25 = 0.75sp for Bravura) --
   * a value MuseScore 4's own engraving notes independently confirm as the
   * correct "regular" beam distance.
   */
  readonly spacing: number;
  readonly color: string;
}

/**
 * Draws every beam line a group gets. Secondary lines (2nd and up) stack
 * TOWARD the notehead from the primary beam -- for an up-stem beam the
 * primary sits highest (most negative Y) and each secondary line is
 * added going back down toward the noteheads; for a down-stem beam it's
 * the mirror image.
 *
 * Each line is clipped to its own segment's stems, and a hook is drawn
 * as a `BEAM_HOOK_LENGTH` stub off the one stem it belongs to, following
 * the beam's own slope so it reads as a piece of the same beam.
 */
export function renderBeam(shape: BeamShape, options: RenderBeamOptions): string {
  const { segments, stemXs, thickness, spacing, color } = options;
  const towardNotehead = shape.direction === 'up' ? 1 : -1;
  // See RenderBeamOptions.spacing: SMuFL's beamSpacing is the gap between
  // beams, so successive beam CENTERS are thickness + spacing apart.
  const centerStep = thickness + spacing;

  const lines: string[] = [];
  for (const segment of segments) {
    const anchorX = stemXs[segment.fromIndex];
    if (anchorX === undefined) continue;
    let x1 = anchorX;
    let x2 = stemXs[segment.toIndex] ?? anchorX;
    if (segment.hook === 'backward') {
      x2 = anchorX;
      x1 = anchorX - BEAM_HOOK_LENGTH;
    } else if (segment.hook === 'forward') {
      x2 = anchorX + BEAM_HOOK_LENGTH;
    }

    const offset = (segment.level - 1) * centerStep * towardNotehead;
    const y1 = beamYAtX(shape, x1) + offset;
    const y2 = beamYAtX(shape, x2) + offset;

    if (shape.style === 'curved') {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      // Bows gently away from the noteheads (opposite the stem direction) for a curved-style beam -- a rendering choice, not an engraving convention (see PLAN.md §9.13).
      const bow = 0.3 * -towardNotehead;
      lines.push(
        svgPath(
          `M ${svgNumber(x1)} ${svgNumber(y1)} Q ${svgNumber(midX)} ${svgNumber(midY + bow)} ${svgNumber(x2)} ${svgNumber(y2)}`,
          {
            stroke: color,
            'stroke-width': thickness,
            fill: 'none',
          },
        ),
      );
    } else {
      lines.push(svgLine(x1, y1, x2, y2, { stroke: color, 'stroke-width': thickness }));
    }
  }

  return svgGroup(lines);
}
