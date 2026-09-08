import { BeatSubElement } from "./../../model/Beat";
import { Duration } from "./../../model/Duration";
import { MusicFontSymbol } from "./../../model/MusicFontSymbol";
import type { ICanvas } from "./../../platform/ICanvas";
import { MusicFontGlyph } from "./MusicFontGlyph";
/**
 * @internal
 */
export declare class ScoreRestGlyph extends MusicFontGlyph {
    constructor(x: number, y: number, duration: Duration);
    static getSymbol(duration: Duration): MusicFontSymbol;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    protected internalPaint(cx: number, cy: number, canvas: ICanvas, element: BeatSubElement): void;
}
