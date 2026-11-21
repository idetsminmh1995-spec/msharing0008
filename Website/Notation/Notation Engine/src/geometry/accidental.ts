import { getGlyph } from '../glyphs/glyph-table.js';

/**
 * MusicXML 4.0's accidental-value glyphs mapped to their SMuFL canonical names.
 * The pairing follows the code points in the W3C MusicXML 4.0 table; Turkish
 * makam, Turkish folk, and Persian values therefore retain their own symbols
 * instead of being reduced to an ordinary sharp or flat.
 */
const MUSICXML_ACCIDENTAL_GLYPHS: Readonly<Record<string, string>> = {
  sharp: 'accidentalSharp',
  natural: 'accidentalNatural',
  flat: 'accidentalFlat',
  'double-sharp': 'accidentalDoubleSharp',
  'sharp-sharp': 'accidentalSharpSharp',
  'flat-flat': 'accidentalDoubleFlat',
  'natural-sharp': 'accidentalNaturalSharp',
  'natural-flat': 'accidentalNaturalFlat',
  'quarter-flat': 'accidentalQuarterToneFlatStein',
  'quarter-sharp': 'accidentalQuarterToneSharpStein',
  'three-quarters-flat': 'accidentalThreeQuarterTonesFlatZimmermann',
  'three-quarters-sharp': 'accidentalThreeQuarterTonesSharpStein',
  'sharp-down': 'accidentalQuarterToneSharpArrowDown',
  'sharp-up': 'accidentalThreeQuarterTonesSharpArrowUp',
  'natural-down': 'accidentalQuarterToneFlatNaturalArrowDown',
  'natural-up': 'accidentalQuarterToneSharpNaturalArrowUp',
  'flat-down': 'accidentalThreeQuarterTonesFlatArrowDown',
  'flat-up': 'accidentalQuarterToneFlatArrowUp',
  'double-sharp-down': 'accidentalThreeQuarterTonesSharpArrowDown',
  'double-sharp-up': 'accidentalFiveQuarterTonesSharpArrowUp',
  'flat-flat-down': 'accidentalFiveQuarterTonesFlatArrowDown',
  'flat-flat-up': 'accidentalThreeQuarterTonesFlatArrowUp',
  'arrow-down': 'accidentalArrowDown',
  'arrow-up': 'accidentalArrowUp',
  'triple-sharp': 'accidentalTripleSharp',
  'triple-flat': 'accidentalTripleFlat',
  'slash-quarter-sharp': 'accidentalKucukMucennebSharp',
  'slash-sharp': 'accidentalBuyukMucennebSharp',
  'slash-flat': 'accidentalBakiyeFlat',
  'double-slash-flat': 'accidentalBuyukMucennebFlat',
  'sharp-1': 'accidental1CommaSharp',
  'sharp-2': 'accidental2CommaSharp',
  'sharp-3': 'accidental3CommaSharp',
  'sharp-5': 'accidental5CommaSharp',
  'flat-1': 'accidental1CommaFlat',
  'flat-2': 'accidental2CommaFlat',
  'flat-3': 'accidental3CommaFlat',
  'flat-4': 'accidental4CommaFlat',
  sori: 'accidentalSori',
  koron: 'accidentalKoron',
};

/** Resolve a MusicXML accidental value to the exact SMuFL glyph used by MusicXML 4.0. */
export function musicXmlAccidentalGlyphName(value: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(MUSICXML_ACCIDENTAL_GLYPHS, value)
    ? MUSICXML_ACCIDENTAL_GLYPHS[value]
    : undefined;
}

/** True when the SMuFL canonical glyph name is present in the bundled glyph table. */
export function isKnownAccidentalGlyphName(name: string): boolean {
  return (
    /^(?:acc|medRenFla|medRenNatura|medRenShar|kievanAccidental)/.test(name) &&
    getGlyph(name) !== undefined
  );
}

/**
 * The default SMuFL glyph for common semitone alterations when a MusicXML
 * `<accidental>` value does not specify its visible form. The fractional
 * entries are standard quarter-tone-family forms; arbitrary tuning divisions
 * still need an explicit supported SMuFL glyph on the source accidental.
 */
const ALTER_GLYPHS: ReadonlyMap<number, string> = new Map([
  [-3, 'accidentalTripleFlat'],
  [-2.5, 'accidentalFiveQuarterTonesFlatArrowDown'],
  [-2, 'accidentalDoubleFlat'],
  [-1.5, 'accidentalThreeQuarterTonesFlatZimmermann'],
  [-1, 'accidentalFlat'],
  [-0.5, 'accidentalQuarterToneFlatStein'],
  [0, 'accidentalNatural'],
  [0.5, 'accidentalQuarterToneSharpStein'],
  [1, 'accidentalSharp'],
  [1.5, 'accidentalThreeQuarterTonesSharpStein'],
  [2, 'accidentalDoubleSharp'],
  [2.5, 'accidentalFiveQuarterTonesSharpArrowUp'],
  [3, 'accidentalTripleSharp'],
]);

/**
 * Return a drawable glyph for an alteration, preferring a source-preserved
 * MusicXML/SMuFL glyph. `undefined` means the pitch is valid but this bundled
 * notation profile has no honest accidental symbol for it.
 */
export function tryAccidentalGlyphName(
  alter: number,
  preferredGlyphName?: string,
): string | undefined {
  if (preferredGlyphName !== undefined && isKnownAccidentalGlyphName(preferredGlyphName)) {
    return preferredGlyphName;
  }
  const key = Number.isFinite(alter) ? (Object.is(alter, -0) ? 0 : alter) : Number.NaN;
  return ALTER_GLYPHS.get(key);
}

/** Strict public lookup retained for callers that require a drawable glyph. */
export function accidentalGlyphName(alter: number, preferredGlyphName?: string): string {
  const name = tryAccidentalGlyphName(alter, preferredGlyphName);
  if (name === undefined) {
    throw new Error(`No accidental glyph for alter=${alter} in the bundled SMuFL mapping.`);
  }
  return name;
}

export interface AccidentalPlacement {
  /** Which column this accidental sits in: 0 is closest to the notehead, higher numbers are further left. */
  readonly column: number;
  /** The Y this accidental was placed at -- the same value passed in, returned for convenience. */
  readonly y: number;
}

/**
 * §9.11's stacking rule for a chord's several accidentals: sort by pitch
 * descending (highest Y magnitude toward the top first -- i.e. most
 * negative Y first, since higher pitch = more negative Y), then place
 * each in the leftmost column where it doesn't vertically collide (within
 * 2.5sp) with an already-placed accidental in that column, opening a new
 * column if none fits.
 *
 * Returns placements in the SAME order as the input `positions` array
 * (not sorted order) so callers can zip the result back against their
 * original note list directly.
 */
export function assignAccidentalColumns(
  positions: readonly number[],
): readonly AccidentalPlacement[] {
  const COLLISION_DISTANCE = 2.5;

  const entries = positions.map((y, index) => ({ y, index }));
  entries.sort((a, b) => a.y - b.y); // ascending Y = descending pitch (highest/most-negative first)

  const columnContents: number[][] = [];
  const result: AccidentalPlacement[] = positions.map((y) => ({ column: -1, y }));

  for (const entry of entries) {
    let placedColumn = -1;
    for (let c = 0; c < columnContents.length; c++) {
      const existing = columnContents[c];
      if (existing === undefined) continue;
      const collides = existing.some(
        (existingY) => Math.abs(existingY - entry.y) < COLLISION_DISTANCE,
      );
      if (!collides) {
        placedColumn = c;
        break;
      }
    }
    if (placedColumn === -1) {
      placedColumn = columnContents.length;
      columnContents.push([]);
    }
    columnContents[placedColumn]?.push(entry.y);
    result[entry.index] = { column: placedColumn, y: entry.y };
  }

  return result;
}

/**
 * §9.11's horizontal placement: immediately left of the notehead's own
 * left edge (`noteX` -- the same drawing-origin convention as every other
 * glyph in this engine, confirmed against noteheadBlack's own bounding box
 * having its left edge at x=0), with a 0.16sp gap, and each additional
 * column (from assignAccidentalColumns) stepping one more accidental-width
 * further left again.
 */
export function accidentalX(noteX: number, accidentalWidth: number, column: number): number {
  const GAP = 0.16;
  return noteX - GAP - accidentalWidth * (column + 1);
}
