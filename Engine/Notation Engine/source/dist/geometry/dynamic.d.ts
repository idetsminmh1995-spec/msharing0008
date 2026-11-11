export type DynamicLevel = 'pppppp' | 'ppppp' | 'pppp' | 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff' | 'ffff' | 'fffff' | 'ffffff' | 'sf' | 'sfp' | 'sfpp' | 'fp' | 'rf' | 'sfz' | 'sffz' | 'fz' | 'n' | 'pf' | 'sfzp';
/**
 * §9.21's default: dynamics sit below the staff, confirmed by MOLA's own
 * published guidelines and Wikipedia's "Dynamics (music)". The one named
 * exception (vocal music, placed above to clear the lyrics) is out of
 * scope -- this engine has no lyric-awareness, the same stated gap
 * §9.18 already noted for barline continuity.
 */
export declare function dynamicSide(): 'below';
/** The real, precomposed SMuFL glyph for a dynamic level -- confirmed to exist as single glyphs (dynamicPP, dynamicMF, etc.) before assuming individual-letter assembly was needed. */
export declare function dynamicGlyphName(level: DynamicLevel): string;
