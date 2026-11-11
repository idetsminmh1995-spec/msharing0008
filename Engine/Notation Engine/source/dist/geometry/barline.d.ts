export type BarlineType = 'single' | 'double' | 'final' | 'repeatBegin' | 'repeatEnd' | 'repeatBoth' | 'dashed';
/** One drawable piece of a barline -- either a plain/dashed vertical line at a given thickness, or a repeat-dot pair. */
export type BarlineStroke = {
    readonly kind: 'line';
    readonly x: number;
    readonly thickness: number;
} | {
    readonly kind: 'dashedLine';
    readonly x: number;
    readonly thickness: number;
    readonly dashLength: number;
    readonly gapLength: number;
} | {
    readonly kind: 'dots';
    readonly x: number;
};
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
export declare function computeBarlineGeometry(type: BarlineType, metrics: BarlineEngravingMetrics): BarlineGeometry;
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
export declare function shouldShowBarNumber(measureNumber: number, config: BarNumberDecisionConfig, isSystemStart: boolean): boolean;
