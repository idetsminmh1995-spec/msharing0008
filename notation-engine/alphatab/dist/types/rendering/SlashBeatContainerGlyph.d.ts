import type { Beat } from "./../model/Beat";
import type { Note } from "./../model/Note";
import { BeatContainerGlyph } from "./glyphs/BeatContainerGlyph";
/**
 * @internal
 */
export declare class SlashBeatContainerGlyph extends BeatContainerGlyph {
    private _tiedNoteTie;
    constructor(beat: Beat);
    doLayout(): void;
    protected createTies(n: Note): void;
    private _flagStretch;
    protected get postBeatStretch(): number;
    protected updateWidth(): void;
}
