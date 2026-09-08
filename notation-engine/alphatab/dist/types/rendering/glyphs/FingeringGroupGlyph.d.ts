import { GlyphGroup } from "./GlyphGroup";
import { type Note } from "./../../model/Note";
import type { Color } from "./../../model/Color";
import { MusicFontSymbol } from "./../../model/MusicFontSymbol";
import type { Settings } from "./../../Settings";
import type { Beat } from "./../../model/Beat";
import { Fingers } from "./../../model/Fingers";
/**
 * @internal
 */
export declare class FingeringInfo {
    line: number;
    symbols: MusicFontSymbol[];
    color: Color | undefined;
    constructor(line: number, symbols: MusicFontSymbol[]);
}
/**
 * @internal
 */
export declare class FingeringGroupGlyph extends GlyphGroup {
    private _infos;
    constructor();
    get isEmpty(): boolean;
    addFingers(note: Note): void;
    static fingerToMusicFontSymbol(settings: Settings, beat: Beat, finger: Fingers, leftHand: boolean): MusicFontSymbol;
    private _addFinger;
    doLayout(): void;
}
