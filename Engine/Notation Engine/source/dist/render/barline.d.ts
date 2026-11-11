import type { BarlineGeometry } from '../geometry/barline.js';
export interface RenderBarlineOptions {
    /** X position of the barline's left edge. */
    readonly x: number;
    /** Y-coordinate of the staff's bottom line. */
    readonly staffBottomY: number;
    /** How tall the barline spans -- typically the staff's height (Phase 9's StaffGeometry.height), but can extend further for a multi-staff system in a later phase. */
    readonly height: number;
    readonly color: string;
    readonly fontFamily: string;
}
/** Draws every stroke (lines, dashed lines, repeat-dot pairs) in a BarlineGeometry. */
export declare function renderBarline(geometry: BarlineGeometry, options: RenderBarlineOptions): string;
export interface RenderBarNumberOptions {
    readonly x: number;
    /** Y-coordinate of the staff's bottom line. */
    readonly staffBottomY: number;
    /** How far ABOVE the top line the number sits, in staff-space units (added on top of the staff's own height). */
    readonly offsetAboveStaff: number;
    readonly staffHeight: number;
    readonly color: string;
    readonly fontFamily: string;
    readonly fontSize: number;
}
/** Draws a measure number as plain text (not a SMuFL glyph -- ordinary digits, any text font) above the staff. */
export declare function renderBarNumber(measureNumber: number, options: RenderBarNumberOptions): string;
