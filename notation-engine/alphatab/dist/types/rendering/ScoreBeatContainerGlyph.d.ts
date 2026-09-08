import type { Beat } from "./../model/Beat";
import type { Note } from "./../model/Note";
import { BeatContainerGlyph } from "./glyphs/BeatContainerGlyph";
/**
 * @internal
 */
export declare class ScoreBeatContainerGlyph extends BeatContainerGlyph {
    private _bend;
    private _effectSlur;
    private _effectEndSlur;
    constructor(beat: Beat);
    get prebendNoteHeadOffset(): number;
    get accidentalsWidth(): number;
    doMultiVoiceLayout(): void;
    doLayout(): void;
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    protected createTies(n: Note): void;
    private _flagStretch;
    protected get postBeatStretch(): number;
    protected updateWidth(): void;
}
