/**
 * §9.23's placement rule -- universal with no exception found across
 * seven independent sources (including Berklee's own published
 * lead-sheet guide), unlike lyrics (§9.22) or dynamics (§9.21), which
 * both had a documented vocal/instrumental split.
 */
export function chordSymbolSide(): 'above' {
  return 'above';
}

const ACCIDENTAL_GLYPHS: Readonly<Record<number, string>> = {
  [-2]: 'csymAccidentalDoubleFlat',
  [-1]: 'csymAccidentalFlat',
  0: 'csymAccidentalNatural',
  1: 'csymAccidentalSharp',
  2: 'csymAccidentalDoubleSharp',
};

/**
 * The chord-symbol-specific accidental glyph for a root note's alter --
 * a REAL, separate glyph set from §9.11's plain notehead accidentals
 * (`csymAccidentalSharp` vs `accidentalSharp`), confirmed by checking
 * `glyphnames.json` rather than assuming the two could be shared.
 */
export function chordSymbolAccidentalGlyphName(alter: number): string {
  const name = ACCIDENTAL_GLYPHS[alter];
  if (name === undefined) {
    throw new Error(
      `No chord-symbol accidental glyph for alter=${alter} (only -2..2 are supported).`,
    );
  }
  return name;
}

export type ChordSymbolQuality =
  'minor' | 'diminished' | 'halfDiminished' | 'augmented' | 'majorSeventh';

const QUALITY_GLYPHS: Readonly<Record<ChordSymbolQuality, string>> = {
  minor: 'csymMinor',
  diminished: 'csymDiminished',
  halfDiminished: 'csymHalfDiminished',
  augmented: 'csymAugmented',
  majorSeventh: 'csymMajorSeventh',
};

/**
 * The real SMuFL glyph for one of the five chord qualities that have a
 * dedicated symbol. Extended qualities (add9, sus4, 13, etc.) have no
 * such glyph and would need plain text -- the same root-letter gap
 * §9.21/§9.22 already identified, not a new one, so this function
 * doesn't attempt to cover them.
 */
export function chordSymbolQualityGlyphName(quality: ChordSymbolQuality): string {
  return QUALITY_GLYPHS[quality];
}
