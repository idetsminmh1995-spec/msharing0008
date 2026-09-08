import type { Duration } from "./../../model/Duration";
import { type InstrumentArticulation } from "./../../model/InstrumentArticulation";
import { type ICanvas } from "./../../platform/ICanvas";
import { NoteHeadGlyphBase } from "./NoteHeadGlyph";
/**
 * @internal
 */
export declare class PercussionNoteHeadGlyph extends NoteHeadGlyphBase {
    private _isGrace;
    private _articulation;
    constructor(x: number, y: number, articulation: InstrumentArticulation, duration: Duration, isGrace: boolean);
    paint(cx: number, cy: number, canvas: ICanvas): void;
    doLayout(): void;
}
