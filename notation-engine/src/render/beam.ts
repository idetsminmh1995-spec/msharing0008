import type { BeamShape } from '../geometry/beam-shape.js';
import { svgGroup, svgLine, svgPath } from './svg-primitives.js';

export interface RenderBeamOptions {
  readonly lineCount: number;
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
 * Draws every parallel line for a beam group. Secondary lines (2nd and
 * up) stack TOWARD the notehead from the primary beam -- for an up-stem
 * beam the primary sits highest (most negative Y) and each secondary line
 * is added going back down toward the noteheads; for a down-stem beam
 * it's the mirror image.
 */
export function renderBeam(shape: BeamShape, options: RenderBeamOptions): string {
  const { lineCount, thickness, spacing, color } = options;
  const towardNotehead = shape.direction === 'up' ? 1 : -1;
  // See RenderBeamOptions.spacing: SMuFL's beamSpacing is the gap between
  // beams, so successive beam CENTERS are thickness + spacing apart.
  const centerStep = thickness + spacing;

  const lines: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    const offset = i * centerStep * towardNotehead;
    const y1 = shape.startY + offset;
    const y2 = shape.endY + offset;

    if (shape.style === 'curved') {
      const midX = (shape.startX + shape.endX) / 2;
      const midY = (y1 + y2) / 2;
      // Bows gently away from the noteheads (opposite the stem direction) for a curved-style beam -- a rendering choice, not an engraving convention (see PLAN.md §9.13).
      const bow = 0.3 * -towardNotehead;
      lines.push(
        svgPath(`M ${shape.startX} ${y1} Q ${midX} ${midY + bow} ${shape.endX} ${y2}`, {
          stroke: color,
          'stroke-width': thickness,
          fill: 'none',
        }),
      );
    } else {
      lines.push(
        svgLine(shape.startX, y1, shape.endX, y2, { stroke: color, 'stroke-width': thickness }),
      );
    }
  }

  return svgGroup(lines);
}
