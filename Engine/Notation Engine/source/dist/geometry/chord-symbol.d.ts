/**
 * §9.23's placement rule -- universal with no exception found across
 * seven independent sources (including Berklee's own published
 * lead-sheet guide), unlike lyrics (§9.22) or dynamics (§9.21), which
 * both had a documented vocal/instrumental split.
 */
export declare function chordSymbolSide(): 'above';
/**
 * The chord-symbol-specific accidental glyph for a root note's alter --
 * a REAL, separate glyph set from §9.11's plain notehead accidentals
 * (`csymAccidentalSharp` vs `accidentalSharp`), confirmed by checking
 * `glyphnames.json` rather than assuming the two could be shared.
 */
export declare function chordSymbolAccidentalGlyphName(alter: number): string;
export type ChordSymbolQuality = 'minor' | 'diminished' | 'halfDiminished' | 'augmented' | 'majorSeventh';
/**
 * The real SMuFL glyph for one of the five chord qualities that have a
 * dedicated symbol. Extended qualities (add9, sus4, 13, etc.) have no
 * such glyph and would need plain text -- the same root-letter gap
 * §9.21/§9.22 already identified, not a new one, so this function
 * doesn't attempt to cover them.
 */
export declare function chordSymbolQualityGlyphName(quality: ChordSymbolQuality): string;
