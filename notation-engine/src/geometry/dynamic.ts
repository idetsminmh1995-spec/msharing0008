export type DynamicLevel = 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff' | 'sfz';

/**
 * §9.21's default: dynamics sit below the staff, confirmed by MOLA's own
 * published guidelines and Wikipedia's "Dynamics (music)". The one named
 * exception (vocal music, placed above to clear the lyrics) is out of
 * scope -- this engine has no lyric-awareness, the same stated gap
 * §9.18 already noted for barline continuity.
 */
export function dynamicSide(): 'below' {
  return 'below';
}

const GLYPH_NAMES: Readonly<Record<DynamicLevel, string>> = {
  ppp: 'dynamicPPP',
  pp: 'dynamicPP',
  p: 'dynamicPiano',
  mp: 'dynamicMP',
  mf: 'dynamicMF',
  f: 'dynamicForte',
  ff: 'dynamicFF',
  fff: 'dynamicFFF',
  sfz: 'dynamicSforzato',
};

/** The real, precomposed SMuFL glyph for a dynamic level -- confirmed to exist as single glyphs (dynamicPP, dynamicMF, etc.) before assuming individual-letter assembly was needed. */
export function dynamicGlyphName(level: DynamicLevel): string {
  return GLYPH_NAMES[level];
}
