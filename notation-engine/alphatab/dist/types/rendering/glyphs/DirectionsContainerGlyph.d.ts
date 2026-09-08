import { Direction } from "./../../model/Direction";
import { type ICanvas } from "./../../platform/ICanvas";
import { EffectGlyph } from "./EffectGlyph";
/**
 * @internal
 */
export declare class DirectionsContainerGlyph extends EffectGlyph {
    private _directions;
    private _barBeginGlyphs;
    private _barEndGlyphs;
    constructor(x: number, y: number, directions: Set<Direction>);
    doLayout(): void;
    private _doSideLayout;
    /** End-of-bar jump text (`D.C. al Coda`, …) may paint past either bar edge on narrow bars. */
    getBoundingBoxLeft(): number;
    getBoundingBoxRight(): number;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
