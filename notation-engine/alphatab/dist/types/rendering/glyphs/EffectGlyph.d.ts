import type { Beat } from "./../../model/Beat";
import type { EffectBand } from "./../EffectBand";
import { Glyph } from "./Glyph";
/**
 * Effect-Glyphs implementing this public interface get notified
 * as they are expanded over multiple beats.
 * @internal
 */
export declare class EffectGlyph extends Glyph {
    /**
     * Gets or sets the beat where the glyph belongs to.
     */
    beat: Beat | null;
    /**
     * Gets or sets the next glyph of the same type in case
     * the effect glyph is expanded when using {@link EffectBarGlyphSizing.groupedOnBeat}.
     */
    nextGlyph: EffectGlyph | null;
    /**
     * Gets or sets the previous glyph of the same type in case
     * the effect glyph is expanded when using {@link EffectBarGlyphSizing.groupedOnBeat}.
     */
    previousGlyph: EffectGlyph | null;
    /**
     * Back-reference to the owning {@link EffectBand}, set when the band
     * creates the glyph.
     */
    band: EffectBand | null;
    constructor(x?: number, y?: number);
}
