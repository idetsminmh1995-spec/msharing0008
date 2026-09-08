import { type Note } from "./../../model/Note";
import type { ICanvas } from "./../../platform/ICanvas";
import { ScoreHelperNotesBaseGlyph } from "./ScoreHelperNotesBaseGlyph";
import { type ITieGlyph } from "./TieGlyph";
import type { ScoreBeatContainerGlyph } from "./../ScoreBeatContainerGlyph";
/**
 * @internal
 */
export declare class ScoreBendGlyph extends ScoreHelperNotesBaseGlyph implements ITieGlyph {
    private _beat;
    private _notes;
    private _endNoteGlyph;
    private _middleNoteGlyph;
    private _container;
    readonly checkForOverflow = false;
    constructor(container: ScoreBeatContainerGlyph);
    doLayout(): void;
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    /** Staff-local x ({@link ITieGlyph} convention); spans the start beat. */
    getBoundingBoxLeft(): number;
    getBoundingBoxRight(): number;
    doMultiVoiceLayout(): void;
    private _calculateMaxSlurHeight;
    addBends(note: Note): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    private _paintSlurs;
    private _getBendNoteValue;
}
