import { Duration } from "./../../model/Duration";
import { MusicFontSymbol } from "./../../model/MusicFontSymbol";
import type { ICanvas } from "./../../platform/ICanvas";
import { MusicFontGlyph } from "./MusicFontGlyph";
import { BeamDirection } from "./../utils/BeamDirection";
/**
 * @internal
 */
export declare class FlagGlyph extends MusicFontGlyph {
    constructor(x: number, y: number, duration: Duration, direction: BeamDirection, isGrace: boolean);
    paint(cx: number, cy: number, canvas: ICanvas): void;
    static getSymbol(duration: Duration, direction: BeamDirection, isGrace: boolean): MusicFontSymbol;
}
