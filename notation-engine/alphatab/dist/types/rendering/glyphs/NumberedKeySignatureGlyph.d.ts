import { KeySignature } from "./../../model/KeySignature";
import { KeySignatureType } from "./../../model/KeySignatureType";
import { type ICanvas } from "./../../platform/ICanvas";
import { EffectGlyph } from "./EffectGlyph";
/**
 * @internal
 */
export declare class NumberedKeySignatureGlyph extends EffectGlyph {
    private _keySignature;
    private _keySignatureType;
    private _text;
    private _accidental;
    private _accidentalOffset;
    private _padding;
    constructor(x: number, y: number, keySignature: KeySignature, keySignatureType: KeySignatureType);
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
