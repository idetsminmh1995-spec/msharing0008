/** Real width (staff-space units) of a notehead glyph, from its Bravura bounding box -- e.g. for Phase 14's ledger lines or a future Phase 16's stem attachment. */
export declare function noteheadWidth(glyphName: string): number;
export interface RenderNoteheadOptions {
    readonly x: number;
    /** Y-coordinate the notehead sits at -- typically staffBottomY + staffPositionForPitch(...) (Phase 9/10). */
    readonly y: number;
    readonly color: string;
    readonly fontFamily: string;
}
/** Draws one notehead glyph at the given position. */
export declare function renderNotehead(glyphName: string, options: RenderNoteheadOptions): string;
