/**
 * clefs.ts — the clef table, and the two numbers that place a note.
 *
 * A clef is not decoration: it is the single fact that turns a written
 * pitch into a place on the staff. Two numbers describe it completely.
 *
 *   1. `glyphLine` — the staff line the clef's own symbol is drawn on,
 *      counted 1..5 from the BOTTOM (treble 2, bass 4, alto 3).
 *   2. `pitchOffset` — the absolute diatonic step that lands on the TOP
 *      staff line, where a step is `index + (octave + 1) * 7` with
 *      C-1 = 0 (see `staff-position.ts`).
 *
 * Everything else about a clef — which SMuFL glyph draws it, which
 * family of staff it belongs on, where a key signature's accidentals
 * go — hangs off the same row.
 *
 * ## Where these values come from
 *
 * The glyph names are SMuFL's own (`gClef`, `fClef`, `cClef` and the
 * `8va`/`8vb`/`15ma`/`15mb` variants). The pitch offsets are arithmetic
 * on standard clef definitions: a treble clef puts G4 on the second
 * line, a bass clef F3 on the fourth, a C clef middle C on whichever
 * line it names. The octave variants shift the reference by exactly one
 * or two octaves' worth of diatonic steps (7 or 14).
 *
 * ## The two conventions that are easy to get backwards
 *
 * This engine counts staff positions from the BOTTOM line upward and
 * negative (see `staff-position.ts`). The `pitchOffset` here is stated
 * from the TOP line because that is how the clef reference is most
 * easily derived; `staffPositionFromLine` is the single place the two
 * conventions meet.
 */

import type { DefaultsSource } from './sources.js';

export const CLEF_TABLE_SOURCE: DefaultsSource = {
  source: 'smufl',
  symbol: 'gClef / fClef / cClef and their octave variants',
  what: "each clef's SMuFL glyph name",
};

export const CLEF_PITCH_SOURCE: DefaultsSource = {
  source: 'musicxml',
  symbol: '<clef> sign / line / clef-octave-change',
  what: 'the reference pitch a clef pins to a staff line',
};

/** Which family of staff a clef belongs on. */
export type ClefStaffGroup = 'standard' | 'percussion' | 'tab';

export interface ClefDefinition {
  /**
   * This engine's own stable id for the clef, e.g. `treble`,
   * `treble8vb`, `bass`, `alto`, `tenor`, `percussion`, `tab`.
   */
  readonly id: string;
  /**
   * The staff line the clef GLYPH is drawn on, 1..5 counted from the
   * BOTTOM: treble 2 (the G line), bass 4 (the F line), alto 3.
   */
  readonly glyphLine: number;
  /**
   * The absolute diatonic step (C-1 = 0) that would sit on the TOP staff
   * line. Treble 45, bass 33, alto 41.
   */
  readonly pitchOffset: number;
  /** SMuFL glyph name for the clef symbol itself. */
  readonly glyph: string;
  readonly staffGroup: ClefStaffGroup;
  /**
   * Where a key signature's accidentals go under this clef, as staff
   * lines in the same units `pitchOffset` produces: the first seven are
   * the sharps in order (F C G D A E B), the last seven the flats
   * (B E A D G C F).
   */
  readonly keySignatureLines: readonly number[];
}

/**
 * Key-signature accidental positions, in staff lines counted from the
 * top (0 = top line, +1 = half a space down) — the convention
 * `staff-position.ts` converts out of.
 *
 * The first seven entries are the sharps in order (F C G D A E B), the
 * last seven the flats (B E A D G C F). Which line each accidental sits
 * on is settled engraving practice that follows from where the clef
 * puts its own reference note, so each family of clefs shares one table.
 * Named here rather than derived because the octave the reference note
 * is taken from is itself part of the convention.
 */
const KEY_TREBLE = [0, 3, -1, 2, 5, 1, 4, 4, 1, 5, 2, 6, 3, 7] as const;
const KEY_FRENCH_VIOLIN = [2, 5, 1, 4, 7, 3, 6, 6, 3, 7, 4, 8, 5, 9] as const;
const KEY_SOPRANO = [5, 1, 4, 0, 3, -1, 2, 2, 6, 3, 7, 4, 8, 5] as const;
const KEY_MEZZO = [3, 6, 2, 5, 1, 4, 0, 0, 4, 1, 5, 2, 6, 3] as const;
const KEY_ALTO = [1, 4, 0, 3, 6, 2, 5, 5, 2, 6, 3, 7, 4, 8] as const;
const KEY_TENOR = [6, 2, 5, 1, 4, 0, 3, 3, 0, 4, 1, 5, 2, 6] as const;
const KEY_BARITONE_C = [4, 0, 3, -1, 2, 5, 1, 1, 5, 2, 6, 3, 7, 4] as const;
const KEY_BASS = [2, 5, 1, 4, 7, 3, 6, 6, 3, 7, 4, 8, 5, 9] as const;

/**
 * Every clef this engine knows.
 *
 * Kept whole rather than trimmed to the ones a page draws today: a file
 * asking for a baritone F clef or a 15ma treble must get a real answer
 * rather than a silent fallback to treble.
 */
export const CLEF_TABLE: readonly ClefDefinition[] = [
  {
    id: 'treble',
    glyphLine: 2,
    pitchOffset: 45,
    glyph: 'gClef',
    staffGroup: 'standard',
    keySignatureLines: KEY_TREBLE,
  },
  {
    id: 'treble15mb',
    glyphLine: 2,
    pitchOffset: 31,
    glyph: 'gClef15mb',
    staffGroup: 'standard',
    keySignatureLines: KEY_TREBLE,
  },
  {
    id: 'treble8vb',
    glyphLine: 2,
    pitchOffset: 38,
    glyph: 'gClef8vb',
    staffGroup: 'standard',
    keySignatureLines: KEY_TREBLE,
  },
  {
    id: 'treble8va',
    glyphLine: 2,
    pitchOffset: 52,
    glyph: 'gClef8va',
    staffGroup: 'standard',
    keySignatureLines: KEY_TREBLE,
  },
  {
    id: 'treble15ma',
    glyphLine: 2,
    pitchOffset: 59,
    glyph: 'gClef15ma',
    staffGroup: 'standard',
    keySignatureLines: KEY_TREBLE,
  },
  {
    id: 'treble8vb-old',
    glyphLine: 2,
    pitchOffset: 38,
    glyph: 'gClef8vbOld',
    staffGroup: 'standard',
    keySignatureLines: KEY_TREBLE,
  },
  {
    id: 'treble8vb-parens',
    glyphLine: 2,
    pitchOffset: 45,
    glyph: 'gClef8vbParens',
    staffGroup: 'standard',
    keySignatureLines: KEY_TREBLE,
  },
  {
    id: 'french-violin',
    glyphLine: 1,
    pitchOffset: 47,
    glyph: 'gClef',
    staffGroup: 'standard',
    keySignatureLines: KEY_FRENCH_VIOLIN,
  },
  {
    id: 'soprano',
    glyphLine: 1,
    pitchOffset: 43,
    glyph: 'cClef',
    staffGroup: 'standard',
    keySignatureLines: KEY_SOPRANO,
  },
  {
    id: 'mezzo-soprano',
    glyphLine: 2,
    pitchOffset: 41,
    glyph: 'cClef',
    staffGroup: 'standard',
    keySignatureLines: KEY_MEZZO,
  },
  {
    id: 'alto',
    glyphLine: 3,
    pitchOffset: 39,
    glyph: 'cClef',
    staffGroup: 'standard',
    keySignatureLines: KEY_ALTO,
  },
  {
    id: 'tenor',
    glyphLine: 4,
    pitchOffset: 37,
    glyph: 'cClef',
    staffGroup: 'standard',
    keySignatureLines: KEY_TENOR,
  },
  {
    id: 'baritone-c',
    glyphLine: 5,
    pitchOffset: 35,
    glyph: 'cClef',
    staffGroup: 'standard',
    keySignatureLines: KEY_BARITONE_C,
  },
  {
    id: 'c-clef-square',
    glyphLine: 2,
    pitchOffset: 45,
    glyph: 'cClefSquare',
    staffGroup: 'standard',
    keySignatureLines: KEY_TREBLE,
  },
  {
    id: 'soprano-18c',
    glyphLine: 1,
    pitchOffset: 43,
    glyph: 'cClefFrench',
    staffGroup: 'standard',
    keySignatureLines: KEY_SOPRANO,
  },
  {
    id: 'alto-18c',
    glyphLine: 3,
    pitchOffset: 39,
    glyph: 'cClefFrench',
    staffGroup: 'standard',
    keySignatureLines: KEY_ALTO,
  },
  {
    id: 'tenor-18c',
    glyphLine: 4,
    pitchOffset: 37,
    glyph: 'cClefFrench',
    staffGroup: 'standard',
    keySignatureLines: KEY_TENOR,
  },
  {
    id: 'soprano-20c',
    glyphLine: 1,
    pitchOffset: 43,
    glyph: 'cClefFrench20C',
    staffGroup: 'standard',
    keySignatureLines: KEY_SOPRANO,
  },
  {
    id: 'alto-20c',
    glyphLine: 3,
    pitchOffset: 39,
    glyph: 'cClefFrench20C',
    staffGroup: 'standard',
    keySignatureLines: KEY_ALTO,
  },
  {
    id: 'tenor-20c',
    glyphLine: 4,
    pitchOffset: 37,
    glyph: 'cClefFrench20C',
    staffGroup: 'standard',
    keySignatureLines: KEY_TENOR,
  },
  {
    id: 'bass',
    glyphLine: 4,
    pitchOffset: 33,
    glyph: 'fClef',
    staffGroup: 'standard',
    keySignatureLines: KEY_BASS,
  },
  {
    id: 'bass15mb',
    glyphLine: 4,
    pitchOffset: 19,
    glyph: 'fClef15mb',
    staffGroup: 'standard',
    keySignatureLines: KEY_BASS,
  },
  {
    id: 'bass8vb',
    glyphLine: 4,
    pitchOffset: 26,
    glyph: 'fClef8vb',
    staffGroup: 'standard',
    keySignatureLines: KEY_BASS,
  },
  {
    id: 'bass8va',
    glyphLine: 4,
    pitchOffset: 40,
    glyph: 'fClef8va',
    staffGroup: 'standard',
    keySignatureLines: KEY_BASS,
  },
  {
    id: 'bass15ma',
    glyphLine: 4,
    pitchOffset: 47,
    glyph: 'fClef15ma',
    staffGroup: 'standard',
    keySignatureLines: KEY_BASS,
  },
  {
    id: 'baritone-f',
    glyphLine: 3,
    pitchOffset: 35,
    glyph: 'fClef',
    staffGroup: 'standard',
    keySignatureLines: KEY_BARITONE_C,
  },
  {
    id: 'subbass',
    glyphLine: 5,
    pitchOffset: 31,
    glyph: 'fClef',
    staffGroup: 'standard',
    keySignatureLines: KEY_BARITONE_C,
  },
  {
    id: 'bass-french',
    glyphLine: 4,
    pitchOffset: 33,
    glyph: 'fClefFrench',
    staffGroup: 'standard',
    keySignatureLines: KEY_BASS,
  },
  {
    id: 'bass-19c',
    glyphLine: 4,
    pitchOffset: 33,
    glyph: 'fClef19thCentury',
    staffGroup: 'standard',
    keySignatureLines: KEY_BASS,
  },
  {
    id: 'percussion',
    glyphLine: 2,
    pitchOffset: 45,
    glyph: 'unpitchedPercussionClef1',
    staffGroup: 'percussion',
    keySignatureLines: KEY_TREBLE,
  },
  {
    id: 'percussion2',
    glyphLine: 2,
    pitchOffset: 45,
    glyph: 'unpitchedPercussionClef2',
    staffGroup: 'percussion',
    keySignatureLines: KEY_TREBLE,
  },
  {
    id: 'tab6',
    glyphLine: 5,
    pitchOffset: 45,
    glyph: 'sixStringTabClef',
    staffGroup: 'tab',
    keySignatureLines: KEY_TREBLE,
  },
  {
    id: 'tab4',
    glyphLine: 5,
    pitchOffset: 45,
    glyph: 'fourStringTabClef',
    staffGroup: 'tab',
    keySignatureLines: KEY_TREBLE,
  },
  {
    id: 'tab6-serif',
    glyphLine: 5,
    pitchOffset: 45,
    glyph: 'sixStringTabClefSerif',
    staffGroup: 'tab',
    keySignatureLines: KEY_TREBLE,
  },
  {
    id: 'tab4-serif',
    glyphLine: 5,
    pitchOffset: 45,
    glyph: 'fourStringTabClefSerif',
    staffGroup: 'tab',
    keySignatureLines: KEY_TREBLE,
  },
  {
    id: 'tenor8vb',
    glyphLine: 4,
    pitchOffset: 30,
    glyph: 'cClef8vb',
    staffGroup: 'standard',
    keySignatureLines: KEY_TENOR,
  },
  {
    id: 'treble8vb-c',
    glyphLine: 2,
    pitchOffset: 38,
    glyph: 'gClef8vbCClef',
    staffGroup: 'standard',
    keySignatureLines: KEY_TREBLE,
  },
];

const BY_ID = new Map(CLEF_TABLE.map((c) => [c.id, c]));

/** One clef by its id, or undefined. */
export function clefById(id: string): ClefDefinition | undefined {
  return BY_ID.get(id);
}

/**
 * Which clef a MusicXML `<clef>` asks for.
 *
 * MusicXML names a clef by its `<sign>` (G, F, C, percussion, TAB), the
 * `<line>` it sits on, and a `<clef-octave-change>`. `<line>` may be
 * omitted, in which case the spec's own default for each sign applies
 * (G → 2, F → 4, C → 3).
 *
 * Returns undefined for a combination this engine does not define — a
 * caller then keeps the clef it had and emits a diagnostic, rather than
 * being handed an invented one.
 */
export function clefForMusicXml(
  sign: string,
  line?: number,
  octaveChange = 0,
): ClefDefinition | undefined {
  let l = line;
  if (l === undefined) {
    if (sign === 'G') l = 2;
    else if (sign === 'F') l = 4;
    else if (sign === 'C') l = 3;
  }
  const i = octaveChange;

  let id: string | undefined;
  if (sign === 'G' && l === 2) {
    id = {
      '-2': 'treble15mb',
      '-1': 'treble8vb',
      '0': 'treble',
      '1': 'treble8va',
      '2': 'treble15ma',
    }[String(i)];
  } else if (sign === 'G' && l === 1 && i === 0) {
    id = 'french-violin';
  } else if (sign === 'F' && l === 3 && i === 0) {
    id = 'baritone-f';
  } else if (sign === 'F' && l === 4) {
    id = { '-2': 'bass15mb', '-1': 'bass8vb', '0': 'bass', '1': 'bass8va', '2': 'bass15ma' }[
      String(i)
    ];
  } else if (sign === 'F' && l === 5 && i === 0) {
    id = 'subbass';
  } else if (sign === 'C') {
    if (l === 5) id = 'baritone-c';
    else if (l === 4) id = i === -1 ? 'tenor8vb' : 'tenor';
    else if (l === 3) id = 'alto';
    else if (l === 2) id = 'mezzo-soprano';
    else if (l === 1) id = 'soprano';
  } else if (sign === 'percussion') {
    id = 'percussion';
  } else if (sign === 'TAB') {
    id = 'tab6';
  }

  return id === undefined ? undefined : BY_ID.get(id);
}
