import type { Beat } from "./../model/Beat";
import type { Note } from "./../model/Note";
import { BeatContainerGlyph } from "./glyphs/BeatContainerGlyph";
import { type NumberedDashBeatContainerGlyph, NumberedNoteBeatContainerGlyphBase } from "./glyphs/NumberedDashBeatContainerGlyph";
import type { BarBounds } from "./utils/BarBounds";
/**
 * @internal
 */
export declare class NumberedBeatContainerGlyph extends BeatContainerGlyph {
    private _slurs;
    private _effectSlurs;
    private _dashes?;
    hasAdditionalNumbers: boolean;
    iterateAdditionalNumbers(): Generator<NumberedNoteBeatContainerGlyphBase, void, unknown>;
    constructor(beat: Beat);
    addDash(dash: NumberedDashBeatContainerGlyph): void;
    addNotes(dash: NumberedNoteBeatContainerGlyphBase): void;
    doLayout(): void;
    buildBoundingsLookup(barBounds: BarBounds, cx: number, cy: number): void;
    protected createTies(n: Note): void;
}
