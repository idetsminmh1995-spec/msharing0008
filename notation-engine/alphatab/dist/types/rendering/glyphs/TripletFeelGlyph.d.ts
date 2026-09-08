import { TripletFeel } from "./../../model/TripletFeel";
import { type ICanvas } from "./../../platform/ICanvas";
import { EffectGlyph } from "./EffectGlyph";
/**
 * @internal
 */
export declare class TripletFeelGlyph extends EffectGlyph {
    private _tripletFeel;
    private _tupletHeight;
    private _tupletPadding;
    private _paintWidth;
    constructor(tripletFeel: TripletFeel);
    doLayout(): void;
    getBoundingBoxRight(): number;
    /** Mirrors the trailing `cx += noteSpacing` branch in {@link _drawGroup}. */
    private static _groupAdvance;
    /** Mirrors the `switch (this._tripletFeel)` mapping in {@link paint}. */
    private static _resolveGroups;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    private _drawGroup;
}
