import { Clef } from "./../../model/Clef";
import { Ottavia } from "./../../model/Ottavia";
import type { ICanvas } from "./../../platform/ICanvas";
import { MusicFontGlyph } from "./MusicFontGlyph";
/**
 * @internal
 */
export declare class ClefGlyph extends MusicFontGlyph {
    private _clef;
    private _clefOttava;
    private _ottavaGlyph?;
    constructor(x: number, y: number, clef: Clef, clefOttava: Ottavia);
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    doLayout(): void;
    private static _getSymbol;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
