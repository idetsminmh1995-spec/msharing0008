import { TimeSignatureGlyph } from "./TimeSignatureGlyph";
/**
 * @internal
 */
export declare class TabTimeSignatureGlyph extends TimeSignatureGlyph {
    doLayout(): void;
    protected get commonScale(): number;
    protected get numberScale(): number;
}
