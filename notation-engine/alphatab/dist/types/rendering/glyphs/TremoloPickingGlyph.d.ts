import type { Duration } from "./../../model/Duration";
import { MusicFontSymbol } from "./../../model/MusicFontSymbol";
import { type TremoloPickingEffect } from "./../../model/TremoloPickingEffect";
import { MusicFontGlyph } from "./MusicFontGlyph";
import { BeamDirection } from "./../utils/BeamDirection";
/**
 * @internal
 */
export declare class TremoloPickingGlyph extends MusicFontGlyph {
    constructor(x: number, y: number, effect: TremoloPickingEffect);
    static _getSymbol(effect: TremoloPickingEffect): MusicFontSymbol;
    stemExtensionHeight: number;
    alignTremoloPickingGlyph(direction: BeamDirection, flagEnd: number, firstNoteY: number, duration: Duration): void;
}
