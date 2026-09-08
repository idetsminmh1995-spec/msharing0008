import type { BarRendererBase } from "./../BarRendererBase";
import type { TieGlyph } from "./../glyphs/TieGlyph";
/**
 * This registry keeps track of which slurs and ties were started and needs completion.
 * Slurs might span multiple systems, and in such cases we need to create additional
 * slur/ties in the intermediate and end system.
 *
 * @internal
 *
 */
export declare class SlurRegistry {
    private _staffLookup;
    clear(): void;
    startMultiSystemSlur(startGlyph: TieGlyph): void;
    private static _staffId;
    completeMultiSystemSlur(endGlyph: TieGlyph): TieGlyph | undefined;
    getAllContinuations(renderer: BarRendererBase): Generator<TieGlyph>;
}
