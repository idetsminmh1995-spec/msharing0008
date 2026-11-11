import type { VoltaGeometry } from '../geometry/volta.js';
export interface RenderVoltaOptions {
    /** X of the bracket's left end. */
    readonly x: number;
    /** Y of its horizontal line. The hooks drop BELOW this, toward the staff. */
    readonly y: number;
    /** "1." / "1, 2." -- see `voltaLabel`. Empty draws the bracket alone. */
    readonly label: string;
    readonly color: string;
    readonly fontFamily: string;
    readonly fontSize: number;
}
/** Draws one volta bracket: its horizontal line, whichever end hooks it has, and its number label. */
export declare function renderVolta(geometry: VoltaGeometry, options: RenderVoltaOptions): string;
export interface RenderRepeatCountOptions {
    /** X of the repeat-end barline this count belongs to -- the text is right-aligned to it. */
    readonly x: number;
    readonly y: number;
    readonly color: string;
    readonly fontFamily: string;
    readonly fontSize: number;
}
/**
 * The "×4" over a repeat-end barline that is played more than twice.
 *
 * Drawn only above 2, because a plain repeat sign already means "play it
 * twice" to every reader; labelling that would be noise. A `times="4"`
 * is information the reader cannot get any other way, and leaving it
 * undrawn is how a chart silently loses two thirds of its length.
 */
export declare function renderRepeatCount(times: number, options: RenderRepeatCountOptions): string;
