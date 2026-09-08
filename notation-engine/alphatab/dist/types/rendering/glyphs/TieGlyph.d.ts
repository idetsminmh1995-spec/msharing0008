import type { Note } from "./../../model/Note";
import { type ICanvas } from "./../../platform/ICanvas";
import { type BarRendererBase, NoteXPosition } from "./../BarRendererBase";
import { Glyph } from "./Glyph";
import type { TieGlyphLabel } from "./TieGlyphLabel";
import type { LineBarRenderer } from "./../LineBarRenderer";
import { BeamDirection } from "./../utils/BeamDirection";
import { Bounds } from "./../utils/Bounds";
/**
 * @internal
 */
export interface ITieGlyph {
    /**
     * Whether the tie is relevant for checking on bar renderer overflows.
     * If set, the tie bounds will be requested and the overflow is applied.
     */
    readonly checkForOverflow: boolean;
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    getBoundingBoxLeft(): number;
    getBoundingBoxRight(): number;
}
/**
 * @internal
 */
export declare abstract class TieGlyph extends Glyph implements ITieGlyph {
    tieDirection: BeamDirection;
    readonly slurEffectId: string;
    protected isForEnd: boolean;
    constructor(slurEffectId: string, forEnd: boolean);
    private _startX;
    private _startY;
    private _endX;
    private _endY;
    private _tieHeight;
    private _boundingBox?;
    private _shouldPaint;
    private _resolvedLabels;
    private _resolvedLabelCount;
    private _labelBaselineOffset;
    get checkForOverflow(): boolean;
    /** Renderer-local Y. Staff finalize may shift `renderer.y` after tie layout, so geometry stays renderer-relative. */
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    /** Staff-absolute X — `_startX`/`_endX` bake in their renderers' `.x` for cross-bar ties. */
    getBoundingBoxLeft(): number;
    getBoundingBoxRight(): number;
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    /**
     * Returns the labels to paint along this slur, or `null` when there
     * are none. Override in subclasses.
     */
    protected getSlurLabels(): TieGlyphLabel[] | null;
    /**
     * Whether label painting is enabled. Defaults to `true`. Subclasses
     * may override to disable labels on the bend-slur path or other
     * special cases.
     */
    protected shouldPaintLabels(): boolean;
    /**
     * Looks up the absolute X coordinate of an anchor note. Reuses
     * the start/end bar renderers already resolved by the subclass
     * (NoteTieGlyph) when the note's bar matches — most labels live
     * in the slur's start or end bar, so this avoids the double Map
     * lookup in `getRendererForBar` per label per layout. Returns
     * `null` when the note's bar is not rendered on this glyph's
     * staff (cross-system case).
     */
    protected resolveLabelAnchorX(note: Note): number | null;
    protected abstract shouldDrawBendSlur(): boolean;
    getTieHeight(_startX: number, _startY: number, _endX: number, _endY: number): number;
    protected abstract calculateTieDirection(): BeamDirection;
    protected abstract lookupStartBeatRenderer(): LineBarRenderer;
    protected abstract lookupEndBeatRenderer(): LineBarRenderer | null;
    protected abstract calculateStartY(): number;
    protected abstract caclculateEndY(): number;
    protected abstract calculateStartX(): number;
    protected abstract calculateEndX(): number;
    calculateMultiSystemSlurY(_renderer: BarRendererBase): number;
    shouldCreateMultiSystemSlur(renderer: BarRendererBase): boolean;
    static calculateActualTieHeight(scale: number, x1: number, y1: number, x2: number, y2: number, down: boolean, offset: number, size: number): Bounds;
    /**
     * Derives the bounding box for a tie from already-computed control
     * points. Splits the bbox math from cps generation so callers that
     * need BOTH cps and bbox (e.g. multi-label slur layout) avoid a
     * second call to `_computeBezierControlPoints`.
     */
    private static _calculateActualTieHeightFromCps;
    private static _computeBezierControlPoints;
    private static _rotate;
    static paintTie(canvas: ICanvas, scale: number, x1: number, y1: number, x2: number, y2: number, down: boolean, offset: number, size: number): void;
    static calculateBendSlurTopY(x1: number, y1: number, x2: number, y2: number, down: boolean, scale: number, bendSlurHeight: number): number;
    static calculateBendSlurHeight(x1: number, y1: number, x2: number, y2: number, down: boolean, bendSlurHeight: number): Bounds;
    static drawBendSlur(canvas: ICanvas, x1: number, y1: number, x2: number, y2: number, down: boolean, bendSlurHeight: number, slurText?: string): void;
}
/**
 * A common tie implementation using note details for positioning
 * @internal
 */
export declare abstract class NoteTieGlyph extends TieGlyph {
    protected startNote: Note;
    protected endNote: Note;
    protected startNoteRenderer: LineBarRenderer | null;
    protected endNoteRenderer: LineBarRenderer | null;
    constructor(slurEffectId: string, startNote: Note, endNote: Note, forEnd: boolean);
    protected get isLeftHandTap(): boolean;
    getTieHeight(startX: number, startY: number, endX: number, endY: number): number;
    protected calculateTieDirection(): BeamDirection;
    protected calculateStartX(): number;
    protected getStartNotePosition(): NoteXPosition;
    protected calculateStartY(): number;
    protected calculateEndX(): number;
    protected getEndNotePosition(): NoteXPosition;
    protected caclculateEndY(): number;
    protected lookupEndBeatRenderer(): LineBarRenderer | null;
    protected lookupStartBeatRenderer(): LineBarRenderer;
    protected shouldDrawBendSlur(): boolean;
}
/**
 * A tie glyph for continued multi-system ties/slurs
 * @internal
 */
export declare class ContinuationTieGlyph extends TieGlyph {
    private _startTie;
    constructor(startTie: TieGlyph);
    protected lookupStartBeatRenderer(): LineBarRenderer;
    protected lookupEndBeatRenderer(): LineBarRenderer;
    protected shouldDrawBendSlur(): boolean;
    protected calculateTieDirection(): BeamDirection;
    protected calculateStartY(): number;
    protected caclculateEndY(): number;
    protected calculateStartX(): number;
    protected calculateEndX(): number;
}
