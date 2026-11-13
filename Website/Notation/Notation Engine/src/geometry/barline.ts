export type BarlineType =
  'single' | 'double' | 'final' | 'repeatBegin' | 'repeatEnd' | 'repeatBoth' | 'dashed';

/** One drawable piece of a barline -- either a plain/dashed vertical line at a given thickness, or a repeat-dot pair. */
export type BarlineStroke =
  | { readonly kind: 'line'; readonly x: number; readonly thickness: number }
  | {
      readonly kind: 'dashedLine';
      readonly x: number;
      readonly thickness: number;
      readonly dashLength: number;
      readonly gapLength: number;
    }
  | { readonly kind: 'dots'; readonly x: number };

export interface BarlineGeometry {
  readonly type: BarlineType;
  readonly strokes: readonly BarlineStroke[];
  /** Total horizontal extent of this barline, in staff-space units. */
  readonly width: number;
}

/**
 * The engraving metrics a barline's geometry is built from -- all of
 * these come straight from Phase 5's real Bravura getEngravingDefaults()
 * (thinBarlineThickness, thickBarlineThickness, barlineSeparation,
 * repeatBarlineDotSeparation, dashedBarlineDashLength/GapLength) plus the
 * repeatDot glyph's own real width (Phase 5's getGlyph('repeatDot').bBox).
 */
export interface BarlineEngravingMetrics {
  readonly thinThickness: number;
  readonly thickThickness: number;
  readonly separation: number;
  readonly dotWidth: number;
  readonly dashLength: number;
  readonly gapLength: number;
}

/**
 * Builds the stroke sequence for any BarlineType. Every x-offset is
 * relative to the barline's own left edge (x=0) -- the renderer adds the
 * barline's actual position on the page.
 */
export function computeBarlineGeometry(
  type: BarlineType,
  metrics: BarlineEngravingMetrics,
): BarlineGeometry {
  const { thinThickness: thin, thickThickness: thick, separation: sep, dotWidth } = metrics;

  switch (type) {
    case 'single':
      return { type, strokes: [{ kind: 'line', x: 0, thickness: thin }], width: thin };

    case 'double': {
      const x2 = thin + sep;
      return {
        type,
        strokes: [
          { kind: 'line', x: 0, thickness: thin },
          { kind: 'line', x: x2, thickness: thin },
        ],
        width: x2 + thin,
      };
    }

    case 'final': {
      const x2 = thin + sep;
      return {
        type,
        strokes: [
          { kind: 'line', x: 0, thickness: thin },
          { kind: 'line', x: x2, thickness: thick },
        ],
        width: x2 + thick,
      };
    }

    case 'repeatBegin': {
      // Thick line, thin line, then dots -- the dots point INTO the
      // repeated section that follows.
      const thinX = thick + sep;
      const dotsX = thinX + thin + sep;
      return {
        type,
        strokes: [
          { kind: 'line', x: 0, thickness: thick },
          { kind: 'line', x: thinX, thickness: thin },
          { kind: 'dots', x: dotsX },
        ],
        width: dotsX + dotWidth,
      };
    }

    case 'repeatEnd': {
      // Dots, then thin line, then thick line -- the dots point BACK at
      // the section that just played.
      const thinX = dotWidth + sep;
      const thickX = thinX + thin + sep;
      return {
        type,
        strokes: [
          { kind: 'dots', x: 0 },
          { kind: 'line', x: thinX, thickness: thin },
          { kind: 'line', x: thickX, thickness: thick },
        ],
        width: thickX + thick,
      };
    }

    case 'repeatBoth': {
      // A repeatEnd shape immediately followed by a repeatBegin shape,
      // with one more `separation` gap between the two thick lines.
      const thinX = dotWidth + sep;
      const thick1X = thinX + thin + sep;
      const thick2X = thick1X + thick + sep;
      const thin2X = thick2X + thick + sep;
      const dots2X = thin2X + thin + sep;
      return {
        type,
        strokes: [
          { kind: 'dots', x: 0 },
          { kind: 'line', x: thinX, thickness: thin },
          { kind: 'line', x: thick1X, thickness: thick },
          { kind: 'line', x: thick2X, thickness: thick },
          { kind: 'line', x: thin2X, thickness: thin },
          { kind: 'dots', x: dots2X },
        ],
        width: dots2X + dotWidth,
      };
    }

    case 'dashed':
      return {
        type,
        strokes: [
          {
            kind: 'dashedLine',
            x: 0,
            thickness: thin,
            dashLength: metrics.dashLength,
            gapLength: metrics.gapLength,
          },
        ],
        width: thin,
      };
  }
}

// ---- Bar/measure numbering (PLAN.md Phase 13's config-driven display) ----

import type { BarNumberDisplay } from '../config/config.js';

export type { BarNumberDisplay };

export interface BarNumberDecisionConfig {
  readonly display: BarNumberDisplay;
  readonly everyNBars?: number;
}

/**
 * Whether a bar number should be shown for this measure. `isSystemStart`
 * (whether this measure is the first on its line/system) is supplied by
 * the caller -- determining that is the layout engine's job (Phase 41/42,
 * not yet built), not this function's; this is purely the display-mode
 * decision given that fact.
 */
export function shouldShowBarNumber(
  measureNumber: number,
  config: BarNumberDecisionConfig,
  isSystemStart: boolean,
): boolean {
  switch (config.display) {
    case 'off':
      return false;
    case 'everyBar':
      return true;
    case 'systemStart':
      return isSystemStart;
    case 'everyNBars': {
      const n = config.everyNBars ?? 1;
      if (!Number.isInteger(n) || n <= 0) return false;
      return (measureNumber - 1) % n === 0;
    }
  }
}
