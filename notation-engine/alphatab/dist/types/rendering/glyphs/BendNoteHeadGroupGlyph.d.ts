import type { Beat } from "./../../model/Beat";
import type { Color } from "./../../model/Color";
import type { ICanvas } from "./../../platform/ICanvas";
import { ScoreChordNoteHeadInfo, ScoreNoteChordGlyphBase } from "./ScoreNoteChordGlyphBase";
import { BeamDirection } from "./../utils/BeamDirection";
/**
 * @internal
 */
export declare class BendNoteHeadGroupGlyph extends ScoreNoteChordGlyphBase {
    private _beat;
    private _showParenthesis;
    private _noteValueLookup;
    private _accidentals;
    private _preNoteParenthesis;
    private _postNoteParenthesis;
    isEmpty: boolean;
    private _groupId;
    get scale(): number;
    get hasFlag(): boolean;
    get hasStem(): boolean;
    get direction(): BeamDirection;
    constructor(groupId: string, beat: Beat, showParenthesis?: boolean);
    protected getScoreChordNoteHeadInfo(): ScoreChordNoteHeadInfo;
    containsNoteValue(noteValue: number): boolean;
    getNoteValueY(noteValue: number): number;
    addGlyph(noteValue: number, quarterBend: boolean, _color: Color | undefined): void;
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
