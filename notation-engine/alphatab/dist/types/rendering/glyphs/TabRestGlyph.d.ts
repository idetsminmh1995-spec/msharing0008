import type { Duration } from "./../../model/Duration";
import type { ICanvas } from "./../../platform/ICanvas";
import { MusicFontGlyph } from "./MusicFontGlyph";
/**
 * @internal
 */
export declare class TabRestGlyph extends MusicFontGlyph {
    private _isVisibleRest;
    constructor(x: number, y: number, isVisibleRest: boolean, duration: Duration);
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
