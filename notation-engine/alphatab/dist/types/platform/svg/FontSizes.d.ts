import { FontStyle, FontWeight } from "./../../model/Font";
import { MeasuredText } from "./../ICanvas";
/**
 * Describes the sizes of a font for measuring purposes.
 * @internal
 */
export declare class FontSizeDefinition {
    /**
     * The widths of each character starting with the ascii code 0x20 at index 0.
     */
    characterWidths: Uint8Array;
    /**
     * The heights of each character starting with the ascii code 0x20 at index 0.
     */
    characterHeights: Uint8Array;
    constructor(characterWidths: Uint8Array, characterHeights: Uint8Array);
}
/**
 * This public class stores text widths for several fonts and allows width calculation
 * @partial
 * @internal
 */
export declare class FontSizes {
    static readonly fontSizeLookupTables: Map<string, FontSizeDefinition>;
    static readonly ControlChars: number;
    /**
     * @target web
     * @partial
     */
    static generateFontLookup(family: string): void;
    static measureString(s: string, families: string[], size: number, style: FontStyle, weight: FontWeight): MeasuredText;
}
